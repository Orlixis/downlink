pub mod manifest;
pub mod types;
pub mod version;

use std::path::{Path, PathBuf};
use std::process::Stdio;

#[cfg(windows)]
#[allow(unused_imports)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

use anyhow::{anyhow, Context, Result};
use chrono::Utc;
use tokio::fs;
use tokio::process::Command;

use crate::db::{ensure_app_dirs, AppDirs};

pub use self::types::{
    Tool, ToolInfo, ToolManagerConfig, ToolManagerConfigBuilder, ToolManifestEntry, ToolStatus,
    ToolchainStatus, UpdateManifest,
};

pub struct ToolManager {
    config: ToolManagerConfig,
    app_dirs: AppDirs,
}

impl ToolManager {
    pub fn new(config: ToolManagerConfig) -> Result<Self> {
        let app_dirs = ensure_app_dirs()?;

        let config = ToolManagerConfig {
            updated_dir: if config.updated_dir.as_os_str().is_empty() {
                app_dirs.tools.clone()
            } else {
                config.updated_dir
            },
            ..config
        };

        Ok(Self { config, app_dirs })
    }

    pub fn tools_dir(&self) -> &Path {
        &self.config.updated_dir
    }

    pub async fn find_tool(&self, tool: Tool) -> Option<PathBuf> {
        let updated_path = self.config.updated_dir.join(tool.binary_name());
        if updated_path.exists() {
            if self.check_health(&updated_path, tool).await.is_ok() {
                return Some(updated_path);
            }
        }

        if let Some(ref bundled_dir) = self.config.bundled_dir {
            let bundled_path = bundled_dir.join(tool.binary_name());
            if bundled_path.exists() {
                if self.check_health(&bundled_path, tool).await.is_ok() {
                    return Some(bundled_path);
                }
            }
        }

        if let Ok(path) = which::which(tool.binary_name()) {
            if self.check_health(&path, tool).await.is_ok() {
                return Some(path);
            }
        }

        None
    }

    pub async fn yt_dlp_path(&self) -> Option<PathBuf> {
        self.find_tool(Tool::YtDlp).await
    }

    pub async fn ffmpeg_path(&self) -> Option<PathBuf> {
        self.find_tool(Tool::Ffmpeg).await
    }

    pub async fn ffprobe_path(&self) -> Option<PathBuf> {
        self.find_tool(Tool::Ffprobe).await
    }

    pub async fn get_tool_info(&self, tool: Tool) -> ToolInfo {
        let path = self.find_tool(tool).await;

        match path {
            Some(p) => {
                let version = self.get_version(&p, tool).await.ok();
                let is_bundled = self
                    .config
                    .bundled_dir
                    .as_ref()
                    .map(|d| p.starts_with(d))
                    .unwrap_or(false);

                ToolInfo {
                    tool,
                    path: p,
                    version,
                    status: ToolStatus::Ok,
                    is_bundled,
                    last_checked: Some(Utc::now()),
                }
            }
            None => ToolInfo {
                tool,
                path: PathBuf::new(),
                version: None,
                status: ToolStatus::Missing,
                is_bundled: false,
                last_checked: Some(Utc::now()),
            },
        }
    }

    pub async fn get_toolchain_status(&self) -> ToolchainStatus {
        let yt_dlp = self.get_tool_info(Tool::YtDlp).await;
        let ffmpeg = self.get_tool_info(Tool::Ffmpeg).await;
        let ffprobe = self.get_tool_info(Tool::Ffprobe).await;

        let overall_status = if yt_dlp.status == ToolStatus::Missing {
            ToolStatus::Missing
        } else if yt_dlp.status == ToolStatus::Broken || ffmpeg.status == ToolStatus::Broken {
            ToolStatus::Broken
        } else if yt_dlp.status == ToolStatus::Outdated || ffmpeg.status == ToolStatus::Outdated {
            ToolStatus::Outdated
        } else {
            ToolStatus::Ok
        };

        ToolchainStatus {
            yt_dlp: Some(yt_dlp),
            ffmpeg: Some(ffmpeg),
            ffprobe: Some(ffprobe),
            overall_status,
        }
    }

    async fn check_health(&self, path: &Path, tool: Tool) -> Result<()> {
        if !path.exists() {
            return Err(anyhow!("Tool binary does not exist: {}", path.display()));
        }
        self.get_version(path, tool).await?;
        Ok(())
    }

    pub async fn get_version(&self, path: &Path, tool: Tool) -> Result<String> {
        let mut cmd = Command::new(path);
        cmd.args(tool.version_args())
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        #[cfg(windows)]
        cmd.creation_flags(CREATE_NO_WINDOW);

        let output = tokio::time::timeout(self.config.version_timeout, cmd.output())
            .await
            .context("Version check timed out")?
            .context("Failed to execute tool")?;

        if !output.status.success() {
            return Err(anyhow!(
                "Tool returned non-zero exit code: {}",
                output.status
            ));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        let parsed = version::parse_version(&stdout, tool);

        parsed.ok_or_else(|| anyhow!("Could not parse version from output"))
    }

    pub async fn check_for_updates(&self) -> Result<Vec<ToolManifestEntry>> {
        let manifest_url = self
            .config
            .manifest_url
            .as_ref()
            .ok_or_else(|| anyhow!("No manifest URL configured"))?;

        let manifest = manifest::fetch_manifest(manifest_url).await?;
        let mut updates = Vec::new();

        for entry in manifest.tools {
            let tool = match entry.tool.as_str() {
                "yt-dlp" => Tool::YtDlp,
                "ffmpeg" => Tool::Ffmpeg,
                "ffprobe" => Tool::Ffprobe,
                _ => continue,
            };

            let current_info = self.get_tool_info(tool).await;

            let needs_update = match &current_info.version {
                Some(v) => version::version_is_newer(&entry.version, v),
                None => true,
            };

            if needs_update {
                updates.push(entry);
            }
        }

        Ok(updates)
    }

    pub async fn update_tool(
        &self,
        entry: &ToolManifestEntry,
        progress_callback: impl Fn(f64) + Send + 'static,
    ) -> Result<PathBuf> {
        let tool = match entry.tool.as_str() {
            "yt-dlp" => Tool::YtDlp,
            "ffmpeg" => Tool::Ffmpeg,
            "ffprobe" => Tool::Ffprobe,
            _ => return Err(anyhow!("Unknown tool: {}", entry.tool)),
        };

        fs::create_dir_all(&self.config.updated_dir).await?;

        let temp_path = self
            .app_dirs
            .tmp
            .join(format!("{}.download", tool.binary_name()));
        let final_path = self.config.updated_dir.join(tool.binary_name());

        manifest::download_file(
            &entry.download_url,
            &temp_path,
            entry.size_bytes,
            progress_callback,
        )
        .await?;

        let actual_hash = version::compute_sha256(&temp_path).await?;
        if actual_hash != entry.sha256 {
            fs::remove_file(&temp_path).await?;
            return Err(anyhow!(
                "Checksum mismatch: expected {}, got {}",
                entry.sha256,
                actual_hash
            ));
        }

        if final_path.exists() {
            let backup_path = final_path.with_extension("bak");
            let _ = fs::rename(&final_path, &backup_path).await;
        }

        fs::rename(&temp_path, &final_path).await?;

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&final_path).await?.permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&final_path, perms).await?;
        }

        self.check_health(&final_path, tool).await?;

        Ok(final_path)
    }

    pub async fn reset_to_bundled(&self, tool: Tool) -> Result<()> {
        let updated_path = self.config.updated_dir.join(tool.binary_name());
        if updated_path.exists() {
            fs::remove_file(&updated_path).await?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_version_ytdlp() {
        let output = "2024.01.01\n";
        assert_eq!(
            version::parse_version(output, Tool::YtDlp),
            Some("2024.01.01".to_string())
        );
    }

    #[test]
    fn test_parse_version_ffmpeg() {
        let output = "ffmpeg version 6.1.1 Copyright (c) 2000-2023 the FFmpeg developers\n";
        assert_eq!(
            version::parse_version(output, Tool::Ffmpeg),
            Some("6.1.1".to_string())
        );
    }

    #[test]
    fn test_version_is_newer() {
        assert!(version::version_is_newer("2024.01.02", "2024.01.01"));
        assert!(!version::version_is_newer("2024.01.01", "2024.01.02"));
        assert!(!version::version_is_newer("2024.01.01", "2024.01.01"));
    }

    #[test]
    fn test_tool_binary_names() {
        #[cfg(target_os = "windows")]
        {
            assert_eq!(Tool::YtDlp.binary_name(), "yt-dlp.exe");
            assert_eq!(Tool::Ffmpeg.binary_name(), "ffmpeg.exe");
        }
        #[cfg(not(target_os = "windows"))]
        {
            assert_eq!(Tool::YtDlp.binary_name(), "yt-dlp");
            assert_eq!(Tool::Ffmpeg.binary_name(), "ffmpeg");
        }
    }
}
