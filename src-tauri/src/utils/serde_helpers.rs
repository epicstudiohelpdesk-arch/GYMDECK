use serde::Deserializer;
use std::fmt;

/// Deserializes an authoritative integer sequence (i64) from either a JSON integer or a JSON string.
/// Invariants:
/// - Values must be >= 0 (negative sequences are invalid in sync protocols)
/// - Must not contain fractional or scientific notation (no '.', ',', 'e', 'E')
/// - Must not use floating-point parsing (no f64 / f32)
/// - Must fit strictly within signed 64-bit integer range [0, i64::MAX]
/// - Fails closed on malformed, non-digit, or overflowing input
pub fn deserialize_seq_i64<'de, D>(deserializer: D) -> Result<i64, D::Error>
where
    D: Deserializer<'de>,
{
    struct SeqVisitor;

    impl<'de> serde::de::Visitor<'de> for SeqVisitor {
        type Value = i64;

        fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
            formatter.write_str("a non-negative 64-bit integer sequence or stringified sequence")
        }

        fn visit_i64<E>(self, value: i64) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            if value < 0 {
                return Err(E::custom(format!("sequence value cannot be negative: {}", value)));
            }
            Ok(value)
        }

        fn visit_u64<E>(self, value: u64) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            if value > i64::MAX as u64 {
                return Err(E::custom(format!("sequence value overflowed i64: {}", value)));
            }
            Ok(value as i64)
        }

        fn visit_i32<E>(self, value: i32) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            self.visit_i64(value as i64)
        }

        fn visit_u32<E>(self, value: u32) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            self.visit_u64(value as u64)
        }

        fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            parse_seq_str(value).map_err(E::custom)
        }

        fn visit_string<E>(self, value: String) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            self.visit_str(&value)
        }
    }

    deserializer.deserialize_any(SeqVisitor)
}

/// Deserializes an optional sequence value (Option<i64>) from null, a JSON integer, or a JSON string.
pub fn deserialize_optional_seq_i64<'de, D>(deserializer: D) -> Result<Option<i64>, D::Error>
where
    D: Deserializer<'de>,
{
    struct OptSeqVisitor;

    impl<'de> serde::de::Visitor<'de> for OptSeqVisitor {
        type Value = Option<i64>;

        fn expecting(&self, formatter: &mut fmt::Formatter) -> fmt::Result {
            formatter.write_str("null, a non-negative 64-bit integer sequence, or stringified sequence")
        }

        fn visit_none<E>(self) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            Ok(None)
        }

        fn visit_unit<E>(self) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            Ok(None)
        }

        fn visit_some<D2>(self, deserializer: D2) -> Result<Self::Value, D2::Error>
        where
            D2: Deserializer<'de>,
        {
            deserialize_seq_i64(deserializer).map(Some)
        }

        fn visit_i64<E>(self, value: i64) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            if value < 0 {
                return Err(E::custom(format!("sequence value cannot be negative: {}", value)));
            }
            Ok(Some(value))
        }

        fn visit_u64<E>(self, value: u64) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            if value > i64::MAX as u64 {
                return Err(E::custom(format!("sequence value overflowed i64: {}", value)));
            }
            Ok(Some(value as i64))
        }

        fn visit_i32<E>(self, value: i32) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            self.visit_i64(value as i64)
        }

        fn visit_u32<E>(self, value: u32) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            self.visit_u64(value as u64)
        }

        fn visit_str<E>(self, value: &str) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                return Ok(None);
            }
            parse_seq_str(trimmed).map(Some).map_err(E::custom)
        }

        fn visit_string<E>(self, value: String) -> Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            self.visit_str(&value)
        }
    }

    deserializer.deserialize_option(OptSeqVisitor)
}

/// Helper function to parse an integer sequence string directly without floats.
pub fn parse_seq_str(s: &str) -> Result<i64, String> {
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return Err("sequence string cannot be empty".to_string());
    }

    // Reject fractional or scientific characters
    if trimmed.contains('.') || trimmed.contains(',') || trimmed.contains('e') || trimmed.contains('E') {
        return Err(format!("sequence string cannot contain fractional or scientific notation: '{}'", trimmed));
    }

    // Reject negative sign
    if trimmed.starts_with('-') {
        return Err(format!("sequence cannot be negative: '{}'", trimmed));
    }

    // Strip optional leading '+'
    let num_str = trimmed.strip_prefix('+').unwrap_or(trimmed);
    if num_str.is_empty() {
        return Err("sequence string cannot be empty".to_string());
    }

    // Validate that all characters are ASCII digits
    if !num_str.chars().all(|c| c.is_ascii_digit()) {
        return Err(format!("sequence string contains non-digit characters: '{}'", trimmed));
    }

    // Parse strictly as u64 to detect overflow without float approximation
    let val_u64: u64 = num_str.parse::<u64>()
        .map_err(|e| format!("sequence overflow or invalid integer '{}': {}", trimmed, e))?;

    if val_u64 > i64::MAX as u64 {
        return Err(format!("sequence value '{}' overflows i64", trimmed));
    }

    Ok(val_u64 as i64)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Deserialize;

    #[derive(Debug, Deserialize, PartialEq, Eq)]
    struct TestItem {
        #[serde(deserialize_with = "deserialize_seq_i64")]
        seq: i64,
        #[serde(default, deserialize_with = "deserialize_optional_seq_i64")]
        opt_seq: Option<i64>,
    }

    #[test]
    fn test_deserialize_seq_from_integer() {
        let json = r#"{"seq": 2632, "opt_seq": 500}"#;
        let item: TestItem = serde_json::from_str(json).unwrap();
        assert_eq!(item.seq, 2632);
        assert_eq!(item.opt_seq, Some(500));
    }

    #[test]
    fn test_deserialize_seq_from_string() {
        let json = r#"{"seq": "2632", "opt_seq": "500"}"#;
        let item: TestItem = serde_json::from_str(json).unwrap();
        assert_eq!(item.seq, 2632);
        assert_eq!(item.opt_seq, Some(500));
    }

    #[test]
    fn test_deserialize_seq_zero_boundary() {
        let json_int = r#"{"seq": 0, "opt_seq": 0}"#;
        let item_int: TestItem = serde_json::from_str(json_int).unwrap();
        assert_eq!(item_int.seq, 0);
        assert_eq!(item_int.opt_seq, Some(0));

        let json_str = r#"{"seq": "0", "opt_seq": "0"}"#;
        let item_str: TestItem = serde_json::from_str(json_str).unwrap();
        assert_eq!(item_str.seq, 0);
        assert_eq!(item_str.opt_seq, Some(0));
    }

    #[test]
    fn test_deserialize_seq_max_boundary() {
        let max_str = i64::MAX.to_string();
        let json = format!(r#"{{"seq": {}, "opt_seq": "{}"}}"#, i64::MAX, max_str);
        let item: TestItem = serde_json::from_str(&json).unwrap();
        assert_eq!(item.seq, i64::MAX);
        assert_eq!(item.opt_seq, Some(i64::MAX));
    }

    #[test]
    fn test_deserialize_seq_optional_null_and_omitted() {
        let json_null = r#"{"seq": 10, "opt_seq": null}"#;
        let item_null: TestItem = serde_json::from_str(json_null).unwrap();
        assert_eq!(item_null.seq, 10);
        assert_eq!(item_null.opt_seq, None);

        let json_omitted = r#"{"seq": 10}"#;
        let item_omitted: TestItem = serde_json::from_str(json_omitted).unwrap();
        assert_eq!(item_omitted.seq, 10);
        assert_eq!(item_omitted.opt_seq, None);
    }

    #[test]
    fn test_deserialize_seq_rejects_negative() {
        let json_neg_int = r#"{"seq": -1}"#;
        assert!(serde_json::from_str::<TestItem>(json_neg_int).is_err());

        let json_neg_str = r#"{"seq": "-2632"}"#;
        assert!(serde_json::from_str::<TestItem>(json_neg_str).is_err());
    }

    #[test]
    fn test_deserialize_seq_rejects_fractional() {
        let json_fractional_str = r#"{"seq": "2632.50"}"#;
        assert!(serde_json::from_str::<TestItem>(json_fractional_str).is_err());

        let json_comma = r#"{"seq": "2,632"}"#;
        assert!(serde_json::from_str::<TestItem>(json_comma).is_err());
    }

    #[test]
    fn test_deserialize_seq_rejects_non_numeric() {
        let json_letters = r#"{"seq": "abc"}"#;
        assert!(serde_json::from_str::<TestItem>(json_letters).is_err());

        let json_alphanumeric = r#"{"seq": "2632a"}"#;
        assert!(serde_json::from_str::<TestItem>(json_alphanumeric).is_err());

        let json_empty = r#"{"seq": ""}"#;
        assert!(serde_json::from_str::<TestItem>(json_empty).is_err());
    }

    #[test]
    fn test_deserialize_seq_rejects_overflow() {
        let json_overflow = r#"{"seq": "9223372036854775808"}"#; // i64::MAX + 1
        assert!(serde_json::from_str::<TestItem>(json_overflow).is_err());

        let json_huge = r#"{"seq": "9999999999999999999999"}"#;
        assert!(serde_json::from_str::<TestItem>(json_huge).is_err());
    }
}
