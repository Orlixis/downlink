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

    let response = client.get(url).send().await?.error_for_status()?;
    let total_size = response.content_length().unwrap_or(expected_size);

    let bytes = response.bytes().await?;

    let mut file = fs::File::create(dest).await?;
    file.write_all(&bytes).await?;
    file.flush().await?;

    progress_callback(100.0);

    let actual_size = bytes.len() as u64;
    if actual_size != total_size && total_size > 0 {
        log::warn!(
            "Downloaded size {} differs from expected {}",
            actual_size,
            total_size
        );
    }

    Ok(())
}
