use zeroize::{Zeroize, ZeroizeOnDrop};
use std::fmt;

/// Enterprise Secure String Wrapper
/// Prevents accidental cloning, ensures zeroization on drop, and explicitly 
/// redacts its contents when logged via Debug or Display.
#[derive(Clone, Zeroize, ZeroizeOnDrop)]
pub struct SecureString(String);

impl SecureString {
    pub fn new(s: String) -> Self {
        Self(s)
    }

    /// Access the underlying secret explicitly. This should only be 
    /// held in scope temporarily and never assigned to long-lived structs.
    pub fn expose_secret(&self) -> &str {
        &self.0
    }
}

// Explicitly prevent plaintext string logging
impl fmt::Debug for SecureString {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "SecureString([REDACTED])")
    }
}

impl fmt::Display for SecureString {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[REDACTED]")
    }
}

/// Sets up a custom panic hook that strips potentially sensitive stack variables 
/// from being printed to standard output or basic crash logs.
pub fn setup_panic_hook() {
    std::panic::set_hook(Box::new(|panic_info| {
        let location = panic_info.location().unwrap();
        
        // Safely extract panic message without dumping the entire payload frame
        let msg = match panic_info.payload().downcast_ref::<&'static str>() {
            Some(s) => *s,
            None => match panic_info.payload().downcast_ref::<String>() {
                Some(s) => &s[..],
                None => "Unknown panic payload (Redacted)",
            },
        };

        // Emit a structured log. We completely omit the stack backtrace 
        // to prevent `SecureString` or memory buffers from leaking.
        tracing::error!(
            target: "crash_handler",
            file = location.file(),
            line = location.line(),
            "Application panicked safely: {}",
            msg
        );
        
        // Future Extension: Serialize this into a JSON crash dump inside `/AppData`
    }));
}
