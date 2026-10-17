use std::path::Path;
use anyhow::Result;
use sha2::{Digest, Sha256};
use tokio::fs;

use super::types::Tool;

pub fn parse_version(output: &str, tool: Tool) -> Option<String> {
    let first_line = output.lines().next()?.trim();

    match tool {
        Tool::YtDlp => Some(first_line.to_string()),
        Tool::Ffmpeg | Tool::Ffprobe => {
            let parts: Vec<&str> = first_line.split_whitespace().collect();
            if parts.len() >= 3 && (parts[0] == "ffmpeg" || parts[0] == "ffprobe") {
                Some(parts[2].to_string())
            } else {
                Some(first_line.to_string())
            }
        }
    }
}

pub fn version_is_newer(new_version: &str, current_version: &str) -> bool {
    new_version > current_version
}

pub async fn compute_sha256(path: &Path) -> Result<String> {
    let data = fs::read(path).await?;
    let mut hasher = Sha256::new();
    hasher.update(&data);
    let result = hasher.finalize();
    Ok(hex::encode(result))
}
