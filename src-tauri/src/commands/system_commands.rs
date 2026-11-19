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
        use std::ffi::CString;
        use std::os::unix::ffi::OsStrExt;
        use std::io::Read;
        use std::os::unix::io::FromRawFd;

        // 1. Open parent directory (~/.gymdeck) as a safe file descriptor using O_DIRECTORY | O_NOFOLLOW
        // This validates that the parent directory itself is not a symlink.
        let dir_c_str = CString::new(gymdeck_dir.as_os_str().as_bytes())
            .map_err(|e| format!("Invalid directory path string: {}", e))?;

        let dir_flags = libc::O_RDONLY | libc::O_DIRECTORY | libc::O_NOFOLLOW;
        let dir_fd = unsafe { libc::open(dir_c_str.as_ptr(), dir_flags) };
        if dir_fd < 0 {
            return Err(format!(
                "Security violation: failed to open ~/.gymdeck safely (O_DIRECTORY | O_NOFOLLOW): errno {}",
                std::io::Error::last_os_error()
            ));
        }

        // Wrap in struct that closes fd automatically on drop
        struct FdCloser(libc::c_int);
        impl Drop for FdCloser {
            fn drop(&mut self) {
                if self.0 >= 0 {
                    unsafe { libc::close(self.0) };
                }
            }
        }
        let dir_closer = FdCloser(dir_fd);

        // Validate opened directory descriptor via fstat()
        let mut dir_stat: libc::stat = unsafe { std::mem::zeroed() };
        if unsafe { libc::fstat(dir_closer.0, &mut dir_stat) } != 0 {
            return Err(format!("Failed to fstat ~/.gymdeck directory: {}", std::io::Error::last_os_error()));
        }

        if (dir_stat.st_mode & libc::S_IFMT) != libc::S_IFDIR {
            return Err("Security violation: ~/.gymdeck is not a directory".into());
        }

        let effective_uid = unsafe { libc::geteuid() };
        if dir_stat.st_uid != effective_uid {
            return Err("Security violation: ~/.gymdeck directory owner mismatch with effective user".into());
        }

        if (dir_stat.st_mode & 0o077) != 0 {
            return Err("Security violation: ~/.gymdeck directory has insecure permissions (must be 0700)".into());
        }

        // 2. Open token file relative to parent directory descriptor using openat()
        // O_NOFOLLOW prevents following symlinks; O_CLOEXEC prevents fd inheritance
        let file_c_str = CString::new("gateway-ipc.token")
            .map_err(|e| format!("Invalid token file name: {}", e))?;

        let file_flags = libc::O_RDONLY | libc::O_NOFOLLOW | libc::O_CLOEXEC;
        let file_fd = unsafe { libc::openat(dir_closer.0, file_c_str.as_ptr(), file_flags) };
        if file_fd < 0 {
            return Err(format!(
                "Failed to open IPC token file securely via openat(O_NOFOLLOW): errno {}",
                std::io::Error::last_os_error()
            ));
        }
        let file_closer = FdCloser(file_fd);

        // 3. fstat() on the opened token file descriptor to prevent TOCTOU race
        let mut file_stat: libc::stat = unsafe { std::mem::zeroed() };
        if unsafe { libc::fstat(file_closer.0, &mut file_stat) } != 0 {
            return Err(format!("Failed to fstat opened token file descriptor: {}", std::io::Error::last_os_error()));
        }

        if (file_stat.st_mode & libc::S_IFMT) != libc::S_IFREG {
            return Err("Security violation: ~/.gymdeck/gateway-ipc.token is not a regular file".into());
        }

        if file_stat.st_uid != effective_uid || file_stat.st_uid != dir_stat.st_uid {
            return Err("Security violation: ~/.gymdeck/gateway-ipc.token owner mismatch with effective user/directory".into());
        }

        let mode = (file_stat.st_mode & 0o777) as u32;
        // Enforce exact permitted file modes of 0600 or 0400 (owner read-write or owner read-only)
        if mode != 0o600 && mode != 0o400 {
            return Err(format!(
                "Security violation: ~/.gymdeck/gateway-ipc.token has insecure mode {:04o} (strictly requires 0600 or 0400)",
                mode
            ));
        }

        // Read token from the verified file descriptor
        // Convert to std::fs::File without double close
        let mut file = unsafe { std::fs::File::from_raw_fd(file_closer.0) };
        // Transfer ownership of fd to std::fs::File so FdCloser does not double-close
        std::mem::forget(file_closer);

        let mut token_buf = String::new();
        file.read_to_string(&mut token_buf)
            .map_err(|e| format!("Failed to read token from safe file descriptor: {}", e))?;

        let token = token_buf.trim().to_string();
        if token.len() < 32 {
            return Err("Invalid IPC token length: token must be at least 32 characters".into());
        }
        Ok(token)
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
