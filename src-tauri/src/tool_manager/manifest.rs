use std::path::Path;
use std::time::Duration;
use anyhow::Result;
use tokio::fs;
use tokio::io::AsyncWriteExt;

use super::types::UpdateManifest;

pub async fn fetch_manifest(url: &str) -> Result<UpdateManifest> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()?;

    let response = client.get(url).send().await?.error_for_status()?;
    let manifest: UpdateManifest = response.json().await?;

    Ok(manifest)
}

pub async fn download_file(
    url: &str,
    dest: &Path,
    expected_size: u64,
    progress_callback: impl Fn(f64) + Send + 'static,
) -> Result<()> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(600))
        .build()?;

    let mut response = client.get(url).send().await?.error_for_status()?;
    let progress_total = expected_size.max(response.content_length().unwrap_or(0));

    let mut file = fs::File::create(dest).await?;
    let mut downloaded_size = 0_u64;

    while let Some(chunk) = response.chunk().await? {
        file.write_all(&chunk).await?;
        downloaded_size += chunk.len() as u64;

        if progress_total > 0 {
            progress_callback((downloaded_size as f64 / progress_total as f64 * 100.0).min(100.0));
        }
    }
    file.flush().await?;

    progress_callback(100.0);

    if expected_size > 0 && downloaded_size != expected_size {
        log::warn!(
            "Downloaded size {} differs from expected {}",
            downloaded_size,
            expected_size
        );
    }

    Ok(())
}
