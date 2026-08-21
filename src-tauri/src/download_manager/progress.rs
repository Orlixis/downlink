use regex::Regex;

use crate::events::ErrorCode;

pub fn parse_percent(s: &str) -> Option<f64> {
    let clean = s.trim().trim_end_matches('%');
    clean.parse::<f64>().ok()
}

pub fn parse_speed(s: &str) -> Option<u64> {
    let s = s.trim();
    if s == "N/A" || s.is_empty() {
        return None;
    }

    let re = Regex::new(r"([\d.]+)\s*([KMGT]?i?B/s)").ok()?;
    let caps = re.captures(s)?;

    let num: f64 = caps.get(1)?.as_str().parse().ok()?;
    let unit = caps.get(2)?.as_str();

    let multiplier: f64 = match unit {
        "B/s" => 1.0,
        "KiB/s" | "KB/s" => 1024.0,
        "MiB/s" | "MB/s" => 1024.0 * 1024.0,
        "GiB/s" | "GB/s" => 1024.0 * 1024.0 * 1024.0,
        "TiB/s" | "TB/s" => 1024.0 * 1024.0 * 1024.0 * 1024.0,
        _ => return None,
    };

    Some((num * multiplier * 8.0) as u64)
}

pub fn parse_eta(s: &str) -> Option<u64> {
    let s = s.trim();
    if s == "N/A" || s == "Unknown" || s.is_empty() {
        return None;
    }

    let parts: Vec<&str> = s.split(':').collect();
    match parts.len() {
        2 => {
            let mins: u64 = parts[0].parse().ok()?;
            let secs: u64 = parts[1].parse().ok()?;
            Some(mins * 60 + secs)
        }
        3 => {
            let hours: u64 = parts[0].parse().ok()?;
            let mins: u64 = parts[1].parse().ok()?;
            let secs: u64 = parts[2].parse().ok()?;
            Some(hours * 3600 + mins * 60 + secs)
        }
        _ => None,
    }
}

pub fn parse_bytes(s: &str) -> Option<u64> {
    let s = s.trim();
    if s == "N/A" || s.is_empty() {
        return None;
    }

    let re = Regex::new(r"([\d.]+)\s*([KMGT]?i?B)").ok()?;
    let caps = re.captures(s)?;

    let num: f64 = caps.get(1)?.as_str().parse().ok()?;
    let unit = caps.get(2)?.as_str();

    let multiplier: f64 = match unit {
        "B" => 1.0,
        "KiB" | "KB" => 1024.0,
        "MiB" | "MB" => 1024.0 * 1024.0,
        "GiB" | "GB" => 1024.0 * 1024.0 * 1024.0,
        "TiB" | "TB" => 1024.0 * 1024.0 * 1024.0 * 1024.0,
        _ => return None,
    };

    Some((num * multiplier) as u64)
}

pub fn classify_error_message(msg: &str) -> ErrorCode {
    let msg_lower = msg.to_lowercase();

    if msg_lower.contains("sign in")
        || msg_lower.contains("login")
        || msg_lower.contains("private video")
        || msg_lower.contains("members-only")
    {
        ErrorCode::LoginRequired
    } else if msg_lower.contains("geo")
        || msg_lower.contains("country")
        || msg_lower.contains("not available in your region")
    {
        ErrorCode::GeoRestricted
    } else if msg_lower.contains("copyright") || msg_lower.contains("dmca") {
        ErrorCode::Unknown
    } else if msg_lower.contains("429")
        || msg_lower.contains("too many requests")
        || msg_lower.contains("rate limit")
    {
        ErrorCode::Network
    } else if msg_lower.contains("unsupported url") || msg_lower.contains("no video formats found")
    {
        ErrorCode::ExtractorOutdated
    } else if msg_lower.contains("network")
        || msg_lower.contains("connection")
        || msg_lower.contains("timeout")
        || msg_lower.contains("timed out")
        || msg_lower.contains("name resolution")
    {
        ErrorCode::Network
    } else {
        ErrorCode::Unknown
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_percent() {
        assert_eq!(parse_percent("50.5%"), Some(50.5));
        assert_eq!(parse_percent(" 100.0% "), Some(100.0));
        assert_eq!(parse_percent("0.0%"), Some(0.0));
        assert_eq!(parse_percent("invalid"), None);
    }

    #[test]
    fn test_parse_speed() {
        assert_eq!(parse_speed("1.00MiB/s"), Some(8 * 1024 * 1024));
        assert_eq!(parse_speed("500KiB/s"), Some(500 * 1024 * 8));
        assert_eq!(parse_speed("N/A"), None);
    }

    #[test]
    fn test_parse_eta() {
        assert_eq!(parse_eta("01:30"), Some(90));
        assert_eq!(parse_eta("01:00:00"), Some(3600));
        assert_eq!(parse_eta("00:05"), Some(5));
        assert_eq!(parse_eta("N/A"), None);
    }

    #[test]
    fn test_classify_error_login() {
        assert_eq!(
            classify_error_message("ERROR: Sign in to confirm you're not a bot"),
            ErrorCode::LoginRequired
        );
        assert_eq!(
            classify_error_message("This is a private video. Please login."),
            ErrorCode::LoginRequired
        );
    }

    #[test]
    fn test_classify_error_geo() {
        assert_eq!(
            classify_error_message("This video is not available in your region due to geo restriction"),
            ErrorCode::GeoRestricted
        );
    }
}
