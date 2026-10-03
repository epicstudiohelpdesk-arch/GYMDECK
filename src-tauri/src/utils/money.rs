//! Decimal-safe monetary representation and integer minor-unit arithmetic.
//!
//! GymDeck stores all local and domain money as INTEGER minor units (paise).
//! 1 Rupee = 100 Paise.
//!
//! Zero floating-point arithmetic (no `f64 * 100.0`) is used for money conversion or arithmetic.

use std::str::FromStr;

/// Converts a decimal string representation of currency into integer minor units (paise).
///
/// Supports:
/// - "100" -> 10000
/// - "100.0" -> 10000
/// - "100.00" -> 10000
/// - "125.75" -> 12575
/// - "0.01" -> 1
/// - "0.50" -> 50
/// - "0.5" -> 50
/// - "1.00" -> 100
/// - "999.99" -> 99999
/// - "1000000.00" -> 100000000
/// - "-50.25" -> -5025
///
/// Fails closed if the input has more than 2 decimal places with non-zero fractional digits (e.g. "12.345").
pub fn decimal_str_to_minor_units(s: &str) -> Result<i64, String> {
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return Ok(0);
    }

    let is_negative = trimmed.starts_with('-');
    let abs_str = if is_negative || trimmed.starts_with('+') {
        &trimmed[1..]
    } else {
        trimmed
    };

    let parts: Vec<&str> = abs_str.split('.').collect();
    if parts.len() > 2 {
        return Err(format!("Invalid monetary decimal string with multiple decimal points: '{}'", s));
    }

    let whole_str = parts[0];
    let whole: i64 = if whole_str.is_empty() {
        0
    } else {
        i64::from_str(whole_str)
            .map_err(|e| format!("Invalid whole currency part in '{}': {}", s, e))?
    };

    let fraction_str = if parts.len() == 2 { parts[1] } else { "" };
    let fraction_chars: Vec<char> = fraction_str.chars().collect();

    let paise: i64 = match fraction_chars.len() {
        0 => 0,
        1 => {
            let d1 = fraction_chars[0].to_digit(10)
                .ok_or_else(|| format!("Invalid digit '{}' in monetary string: '{}'", fraction_chars[0], s))? as i64;
            d1 * 10
        }
        2 => {
            let d1 = fraction_chars[0].to_digit(10)
                .ok_or_else(|| format!("Invalid digit '{}' in monetary string: '{}'", fraction_chars[0], s))? as i64;
            let d2 = fraction_chars[1].to_digit(10)
                .ok_or_else(|| format!("Invalid digit '{}' in monetary string: '{}'", fraction_chars[1], s))? as i64;
            d1 * 10 + d2
        }
        _ => {
            // More than 2 decimal digits: Check if digits beyond index 2 are all '0'
            let d1 = fraction_chars[0].to_digit(10)
                .ok_or_else(|| format!("Invalid digit '{}' in monetary string: '{}'", fraction_chars[0], s))? as i64;
            let d2 = fraction_chars[1].to_digit(10)
                .ok_or_else(|| format!("Invalid digit '{}' in monetary string: '{}'", fraction_chars[1], s))? as i64;

            for &ch in &fraction_chars[2..] {
                if ch != '0' {
                    return Err(format!(
                        "Monetary value has more than 2 meaningful decimal places: '{}'. GymDeck requires paise precision.",
                        s
                    ));
                }
            }
            d1 * 10 + d2
        }
    };

    let total = whole
        .checked_mul(100)
        .and_then(|w| w.checked_add(paise))
        .ok_or_else(|| format!("Monetary overflow parsing '{}'", s))?;

    Ok(if is_negative { -total } else { total })
}

/// Formats integer minor units (paise) into an exact 2-decimal string (e.g. "125.75", "0.01", "100.00").
///
/// Uses integer division and modulo. Zero floating-point arithmetic.
pub fn minor_units_to_decimal_str(minor_units: i64) -> String {
    let is_negative = minor_units < 0;
    let abs_units = minor_units.abs();
    let whole = abs_units / 100;
    let frac = abs_units % 100;
    format!("{}{}.{:02}", if is_negative { "-" } else { "" }, whole, frac)
}

/// Converts a legacy SQLite REAL value into integer minor units (paise) with fail-closed validation.
pub fn legacy_real_to_minor_units(val: f64) -> Result<i64, String> {
    if !val.is_finite() {
        return Err(format!("Invalid non-finite monetary float: {}", val));
    }
    let formatted = format!("{:.4}", val);
    decimal_str_to_minor_units(&formatted)
}

/// Extracts integer minor units from a serde_json::Value (accepts integer, string, or legacy float).
pub fn json_value_to_minor_units(val: &serde_json::Value) -> Result<i64, String> {
    match val {
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                decimal_str_to_minor_units(&i.to_string())
            } else if let Some(f) = n.as_f64() {
                legacy_real_to_minor_units(f)
            } else {
                Err("Invalid JSON number for money".to_string())
            }
        }
        serde_json::Value::String(s) => decimal_str_to_minor_units(s),
        _ => Err("Invalid JSON type for money: expected number or string".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_money_decimal_string_conversions() {
        assert_eq!(decimal_str_to_minor_units("0.01").unwrap(), 1);
        assert_eq!(decimal_str_to_minor_units("0.50").unwrap(), 50);
        assert_eq!(decimal_str_to_minor_units("0.5").unwrap(), 50);
        assert_eq!(decimal_str_to_minor_units("1.00").unwrap(), 100);
        assert_eq!(decimal_str_to_minor_units("1").unwrap(), 100);
        assert_eq!(decimal_str_to_minor_units("999.99").unwrap(), 99999);
        assert_eq!(decimal_str_to_minor_units("1000000.00").unwrap(), 100000000);
        assert_eq!(decimal_str_to_minor_units("-50.25").unwrap(), -5025);
        assert_eq!(decimal_str_to_minor_units("125.7500").unwrap(), 12575);
    }

    #[test]
    fn test_money_more_than_two_decimals_fails() {
        assert!(decimal_str_to_minor_units("12.345").is_err());
        assert!(decimal_str_to_minor_units("0.001").is_err());
        assert!(decimal_str_to_minor_units("999.999").is_err());
    }

    #[test]
    fn test_minor_units_to_decimal_str() {
        assert_eq!(minor_units_to_decimal_str(1), "0.01");
        assert_eq!(minor_units_to_decimal_str(50), "0.50");
        assert_eq!(minor_units_to_decimal_str(100), "1.00");
        assert_eq!(minor_units_to_decimal_str(99999), "999.99");
        assert_eq!(minor_units_to_decimal_str(100000000), "1000000.00");
        assert_eq!(minor_units_to_decimal_str(-5025), "-50.25");
        assert_eq!(minor_units_to_decimal_str(0), "0.00");
    }

    #[test]
    fn test_integer_arithmetic_invariants() {
        let gross_paise = 100000i64; // ₹1,000.00
        let refund_paise = 25050i64; // ₹250.50
        let net_paise = gross_paise - refund_paise;
        assert_eq!(net_paise, 74950);
        assert_eq!(minor_units_to_decimal_str(net_paise), "749.50");

        // ₹999.99 - ₹500.50 = ₹499.49 exact
        let a = decimal_str_to_minor_units("999.99").unwrap();
        let b = decimal_str_to_minor_units("500.50").unwrap();
        assert_eq!(a - b, 49949);
        assert_eq!(minor_units_to_decimal_str(a - b), "499.49");
    }
}
