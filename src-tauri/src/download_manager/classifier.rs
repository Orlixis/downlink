use crate::events::{Action, ActionKind, ErrorCode};

pub fn classify_error(stderr: &str) -> (ErrorCode, String, Vec<Action>) {
    let stderr_lower = stderr.to_lowercase();

    if stderr_lower.contains("sign in")
        || stderr_lower.contains("login")
        || stderr_lower.contains("cookies")
        || stderr_lower.contains("age-restricted")
    {
        return (
            ErrorCode::LoginRequired,
            "This content requires sign-in. Import cookies from your browser and retry.".to_string(),
            vec![Action {
                kind: ActionKind::ImportCookies,
                label: "Import cookies from browser".to_string(),
            }],
        );
    }

    if stderr_lower.contains("bot")
        || stderr_lower.contains("captcha")
        || stderr_lower.contains("confirm you're not")
    {
        return (
            ErrorCode::BotCheck,
            "The site requires verification. Import cookies from a logged-in browser session.".to_string(),
            vec![Action {
                kind: ActionKind::ImportCookies,
                label: "Import cookies from browser".to_string(),
            }],
        );
    }

    if stderr_lower.contains("not available in your country")
        || stderr_lower.contains("geo")
        || stderr_lower.contains("blocked")
    {
        return (
            ErrorCode::GeoRestricted,
            "This content is not available in your region.".to_string(),
            vec![Action {
                kind: ActionKind::OpenSettingsProxy,
                label: "Configure proxy".to_string(),
            }],
        );
    }

    if stderr_lower.contains("unsupported url")
        || stderr_lower.contains("no video formats")
        || stderr_lower.contains("extractor")
    {
        return (
            ErrorCode::ExtractorOutdated,
            "The downloader engine may be outdated for this site.".to_string(),
            vec![
                Action {
                    kind: ActionKind::UpdateYtDlp,
                    label: "Update yt-dlp".to_string(),
                },
                Action {
                    kind: ActionKind::Retry,
                    label: "Retry".to_string(),
                },
            ],
        );
    }

    if stderr_lower.contains("requested format") || stderr_lower.contains("format not available") {
        return (
            ErrorCode::FormatUnavailable,
            "The requested format is not available for this content.".to_string(),
            vec![Action {
                kind: ActionKind::RetryRecommended,
                label: "Use Recommended preset".to_string(),
            }],
        );
    }

    if stderr_lower.contains("network")
        || stderr_lower.contains("connection")
        || stderr_lower.contains("timeout")
        || stderr_lower.contains("timed out")
    {
        return (
            ErrorCode::Network,
            "Network error occurred. Check your connection and retry.".to_string(),
            vec![Action {
                kind: ActionKind::Retry,
                label: "Retry".to_string(),
            }],
        );
    }

    let message = if stderr.len() > 200 {
        format!("Download failed: {}…", &stderr[..200])
    } else if stderr.is_empty() {
        "Download failed with unknown error.".to_string()
    } else {
        format!("Download failed: {}", stderr)
    };

    (ErrorCode::Unknown, message, vec![])
}
