fn load_env_var(key: &str) -> String {
    if let Ok(v) = std::env::var(key) {
        let clean = v.trim().trim_matches('"').trim_matches('\'');
        if !clean.is_empty() {
            return clean.to_string();
        }
    }
    for path in &["../.env", ".env", "../../.env"] {
        if let Ok(content) = std::fs::read_to_string(path) {
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with('#') || trimmed.is_empty() {
                    continue;
                }
                if let Some((k, v)) = trimmed.split_once('=') {
                    if k.trim() == key {
                        let cleaned = v.trim().trim_matches('"').trim_matches('\'');
                        if !cleaned.is_empty() {
                            return cleaned.to_string();
                        }
                    }
                }
            }
        }
    }
    String::new()
}

fn main() {
    tauri_build::build();

    // Embed the bundled Groq API key at compile time from env or root .env file.
    let key = load_env_var("DOWNLINK_GROQ_KEY");
    println!("cargo:rustc-env=DOWNLINK_GROQ_KEY={key}");
    println!("cargo:rerun-if-env-changed=DOWNLINK_GROQ_KEY");
    println!("cargo:rerun-if-changed=../.env");
    println!("cargo:rerun-if-changed=.env");
}
