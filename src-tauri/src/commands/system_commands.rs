//! System Status Commands
//!
//! Provides REAL, live readings for the in-app system indicators:
//!   - Internet connectivity  -> real TCP reachability test (no `navigator.onLine`
//!     guesswork, which WKWebView reports unreliably).
//!   - Battery level / charging -> real macOS battery telemetry via `pmset -g batt`
//!     (the browser Battery API is unavailable inside the Tauri WKWebView).

use serde::Serialize;
use std::net::{SocketAddr, TcpStream};
use std::process::Command;
use std::time::Duration;

/// Live system status payload consumed by the dashboard indicators.
#[derive(Serialize, Clone, Copy)]
pub struct SystemStatus {
    /// True when the machine can actually reach the public internet.
    pub online: bool,
    /// True when a physical battery is present (false on desktop / mains-only machines).
    pub has_battery: bool,
    /// State of charge in the range 0.0 ..= 1.0.
    pub battery_level: f32,
    /// True when drawing from AC mains (charging / charged). False when discharging.
    pub charging: bool,
}

/// Returns real-time system status for the dashboard indicators.
///
/// This is a synchronous command and intentionally performs short blocking work
/// (a TCP probe + a fast `pmset` subprocess). Tauri dispatches sync commands on a
/// worker thread, so the UI stays responsive.
#[tauri::command]
pub fn get_system_status() -> SystemStatus {
    let online = check_connectivity();
    let (has_battery, level, charging) = read_battery();
    SystemStatus {
        online,
        has_battery,
        battery_level: level,
        charging,
    }
}

/// Real connectivity probe: attempts a TCP handshake to two highly-available
/// anycast endpoints (Cloudflare 1.1.1.1 and Google 8.8.8.8). Succeeding on either
/// proves there is a working route to the public internet.
fn check_connectivity() -> bool {
    const TIMEOUT: Duration = Duration::from_millis(2500);
    let endpoints: [SocketAddr; 2] = [
        SocketAddr::from(([1, 1, 1, 1], 443)),
        SocketAddr::from(([8, 8, 8, 8], 443)),
    ];
    for endpoint in endpoints.iter() {
        if TcpStream::connect_timeout(endpoint, TIMEOUT).is_ok() {
            return true;
        }
    }
    false
}

/// Real macOS battery telemetry parsed from `pmset -g batt`.
///
/// Example output:
///   Now drawing from 'AC Power'
///    -InternalBattery-0 (id=4567)  65%; charging; 1:23 remaining
///
/// On a machine with no battery (e.g. a desktop Mac) only the "Now drawing from"
/// line is emitted, so we report `has_battery = false` and let the UI render the
/// "Plugged In" state.
#[cfg(target_os = "macos")]
fn read_battery() -> (bool, f32, bool) {
    let output = match Command::new("pmset").args(["-g", "batt"]).output() {
        Ok(out) => String::from_utf8_lossy(&out.stdout).into_owned(),
        Err(_) => return (false, 1.0, true),
    };

    let mut on_ac = true;
    let mut has_battery = false;
    let mut level = 1.0_f32;

    for line in output.lines() {
        let lower = line.to_lowercase();
        if lower.contains("now drawing from") {
            on_ac = lower.contains("ac power");
            continue;
        }
        if line.contains("battery") && line.contains('%') {
            has_battery = true;
            if let Some(pct_idx) = line.find('%') {
                let prefix = &line[..pct_idx];
                // Grab the last run of digits before the '%' sign (the charge level).
                if let Some(num) = prefix
                    .rsplit(|c: char| !c.is_ascii_digit())
                    .find(|s| !s.is_empty())
                {
                    if let Ok(pct) = num.parse::<f32>() {
                        level = (pct / 100.0).clamp(0.0, 1.0);
                    }
                }
            }
        }
    }

    if !has_battery {
        return (false, 1.0, true);
    }

    // "charging" in the UI sense = drawing from AC mains (charging or fully charged).
    (true, level, on_ac)
}

/// Non-macOS fallback: the portable battery crates are brittle across platforms, so
/// we conservatively report an AC-powered machine. Connectivity is still probed for real.
#[cfg(not(target_os = "macos"))]
fn read_battery() -> (bool, f32, bool) {
    (false, 1.0, true)
}

/// Returns the authenticated local CCTV IPC token from ~/.gymdeck/gateway-ipc.token.
/// This protects the token behind native Tauri IPC so arbitrary third-party
/// processes or untrusted browser tabs cannot retrieve it over loopback HTTP.
#[tauri::command]
pub fn get_cctv_ipc_token() -> Result<String, String> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|e| format!("Failed to resolve home directory: {}", e))?;
    let gymdeck_dir = std::path::Path::new(&home).join(".gymdeck");
    let token_path = gymdeck_dir.join("gateway-ipc.token");

    if !token_path.exists() {
        return Err("CCTV IPC token file not initialized. Start CCTV Gateway daemon.".into());
    }

    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        use std::os::unix::fs::OpenOptionsExt;
        use std::os::unix::fs::PermissionsExt;
        use std::io::Read;

        // 1. Open parent directory (~/.gymdeck) as a safe file descriptor
        // O_DIRECTORY ensures we only open directories; O_NOFOLLOW prevents following symlinked dir
        #[cfg(target_os = "macos")]
        const O_NOFOLLOW: i32 = 0x0100;
        #[cfg(target_os = "linux")]
        const O_NOFOLLOW: i32 = 0o400000;
        #[cfg(not(any(target_os = "macos", target_os = "linux")))]
        const O_NOFOLLOW: i32 = 0;

        let dir_file = std::fs::OpenOptions::new()
            .read(true)
            .custom_flags(O_NOFOLLOW)
            .open(&gymdeck_dir)
            .map_err(|e| format!("Security violation: failed to open ~/.gymdeck safely (O_NOFOLLOW): {}", e))?;

        let dir_meta = dir_file.metadata()
            .map_err(|e| format!("Failed to inspect ~/.gymdeck directory metadata: {}", e))?;

        if !dir_meta.file_type().is_dir() {
            return Err("Security violation: ~/.gymdeck is not a directory".into());
        }
        if dir_meta.permissions().mode() & 0o077 != 0 {
            return Err("Security violation: ~/.gymdeck directory has insecure permissions (must be 0700)".into());
        }

        // 2. Open token file with O_NOFOLLOW to block symlink following
        let mut file = std::fs::OpenOptions::new()
            .read(true)
            .custom_flags(O_NOFOLLOW)
            .open(&token_path)
            .map_err(|e| format!("Failed to open IPC token file securely (O_NOFOLLOW): {}", e))?;

        // 3. fstat() on the opened file descriptor to prevent TOCTOU race
        let file_meta = file.metadata()
            .map_err(|e| format!("Failed to inspect opened token file descriptor metadata: {}", e))?;

        if !file_meta.file_type().is_file() {
            return Err("Security violation: ~/.gymdeck/gateway-ipc.token is not a regular file".into());
        }
        if file_meta.uid() != dir_meta.uid() {
            return Err("Security violation: ~/.gymdeck/gateway-ipc.token owner mismatch with ~/.gymdeck directory".into());
        }

        let mode = file_meta.permissions().mode();
        // Validate that permissions are strictly owner-only (mode 0600 or 0400)
        if mode & 0o077 != 0 {
            return Err("Security violation: ~/.gymdeck/gateway-ipc.token has insecure permissions".into());
        }

        let mut token_buf = String::new();
        file.read_to_string(&mut token_buf)
            .map_err(|e| format!("Failed to read token from safe file descriptor: {}", e))?;
        
        let token = token_buf.trim().to_string();
        if token.len() < 32 {
            return Err("Invalid IPC token length".into());
        }
        return Ok(token);
    }

    #[cfg(not(unix))]
    {
        let token = std::fs::read_to_string(&token_path)
            .map_err(|e| format!("Failed to read IPC token: {}", e))?
            .trim()
            .to_string();

        if token.len() < 32 {
            return Err("Invalid IPC token length".into());
        }

        Ok(token)
    }
}
