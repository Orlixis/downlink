use std::time::Duration;
use tauri::{Listener, WebviewUrl, WebviewWindowBuilder};

/// Extracts a canonical https://www.dailymotion.com/video/{id} URL from any Dailymotion embed, manifest, player URL, or HTML snippet.
pub fn extract_dailymotion_canonical_url(text_or_url: &str) -> Option<String> {
    // 1. Matches geo.dailymotion.com/player.html?video=ID or ?video=ID or &video=ID
    if let Ok(re) = regex::Regex::new(r#"(?i)(?:geo\.dailymotion\.com/player[^"'\s<>]*[?&]video=|[?&]video=)([a-zA-Z0-9]+)"#) {
        if let Some(caps) = re.captures(text_or_url) {
            if let Some(id) = caps.get(1) {
                let id_str = id.as_str();
                if id_str.len() >= 4 {
                    return Some(format!("https://www.dailymotion.com/video/{}", id_str));
                }
            }
        }
    }

    // 2. Matches dailymotion.com/(embed/video|video|cdn/manifest/video)/ID
    if let Ok(re) = regex::Regex::new(r#"(?i)dailymotion\.com/(?:embed/video/|video/|cdn/manifest/video/)([a-zA-Z0-9]+)"#) {
        if let Some(caps) = re.captures(text_or_url) {
            if let Some(id) = caps.get(1) {
                let id_str = id.as_str();
                if id_str.len() >= 4 {
                    return Some(format!("https://www.dailymotion.com/video/{}", id_str));
                }
            }
        }
    }

    // 3. Matches data-video="ID"
    if let Ok(re) = regex::Regex::new(r#"(?i)data-video=["']([a-zA-Z0-9]+)["']"#) {
        if let Some(caps) = re.captures(text_or_url) {
            if let Some(id) = caps.get(1) {
                let id_str = id.as_str();
                if id_str.len() >= 4 {
                    return Some(format!("https://www.dailymotion.com/video/{}", id_str));
                }
            }
        }
    }

    None
}

/// Returns true if the URL points directly to a platform with native yt-dlp extractor support.
pub fn is_native_platform_url(url: &str) -> bool {
    let lower = url.to_lowercase();
    lower.contains("youtube.com") || lower.contains("youtu.be") ||
    lower.contains("vimeo.com") || lower.contains("twitch.tv") ||
    lower.contains("tiktok.com") || lower.contains("twitter.com") || lower.contains("x.com") ||
    lower.contains("instagram.com") || lower.contains("dailymotion.com/video") ||
    lower.contains("soundcloud.com") || lower.contains("bilibili.com/video") ||
    lower.contains("reddit.com")
}

/// Cleans media URLs — strips playlist/radio noise from YouTube watch URLs:
/// - `list=RD...` (auto-mix playlists)
/// - `index=` (position in playlist, meaningless with --no-playlist)
/// - `start_radio=` (radio session param)
pub fn clean_media_url(url: &str) -> String {
    let trimmed = url.trim();
    let is_youtube = trimmed.contains("youtube.com/watch") || trimmed.contains("youtu.be/");
    if !is_youtube {
        return trimmed.to_string();
    }

    let needs_cleaning = trimmed.contains("list=RD")
        || trimmed.contains("index=")
        || trimmed.contains("start_radio=");

    if !needs_cleaning {
        return trimmed.to_string();
    }

    if let Ok(mut parsed) = url::Url::parse(trimmed) {
        let clean_pairs: Vec<(String, String)> = parsed.query_pairs()
            .filter(|(k, v)| {
                if k == "list" && v.starts_with("RD") { return false; }
                if k == "index" { return false; }
                if k == "start_radio" { return false; }
                true
            })
            .map(|(k, v)| (k.into_owned(), v.into_owned()))
            .collect();
        parsed.query_pairs_mut().clear().extend_pairs(clean_pairs);
        return parsed.to_string();
    }
    trimmed.to_string()
}

pub async fn fallback_iframe_sniffer(url: &str) -> Option<String> {
    if !url.starts_with("http") || is_native_platform_url(url) {
        return None;
    }

    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")
        .timeout(Duration::from_secs(6))
        .build()
        .ok()?;

    let text = client.get(url).send().await.ok()?.text().await.ok()?;

    // 1. Direct Dailymotion canonical extraction (player.html, video=, embed, etc.)
    if let Some(canonical) = extract_dailymotion_canonical_url(&text) {
        log::info!("fallback_iframe_sniffer: Found Dailymotion canonical URL {}", canonical);
        return Some(canonical);
    }

    // 2. Check for schema.org / OpenGraph meta tags
    let meta_re = regex::Regex::new(r#"(?:itemprop=["'](?:embedUrl|contentUrl)["']|property=["'](?:og:video|og:video:url)["']|name=["']twitter:player["'])[^>]*content=["']([^"']+)["']"#).ok()?;
    if let Some(caps) = meta_re.captures(&text) {
        if let Some(m) = caps.get(1) {
            let u = m.as_str();
            if let Some(canonical) = extract_dailymotion_canonical_url(u) {
                return Some(canonical);
            }
            if u.starts_with("http") {
                log::info!("fallback_iframe_sniffer: Found meta embed URL {}", u);
                return Some(u.to_string());
            }
        }
    }

    // 3. Check for standard iframe / video provider links
    let re = regex::Regex::new(r#"(?i)https?://(?:www\.)?(?:ok\.ru|vidmoly|streamtape|dood|filemoon|mp4upload|vidsrc|megacloud|rabbitstream|streamwish|vidhide|sibnet|bilibili|iqiyi|youku|dailymotion|vimeo|rumble|bitchute|streamable)[^"'\s<>]+"#).ok()?;

    if let Some(captures) = re.captures(&text) {
        if let Some(m) = captures.get(0) {
            let u = m.as_str();
            if let Some(canonical) = extract_dailymotion_canonical_url(u) {
                return Some(canonical);
            }
            log::info!("fallback_iframe_sniffer: Found provider URL {}", u);
            return Some(u.to_string());
        }
    }
    None
}

pub async fn advanced_webview_sniffer(app: &tauri::AppHandle, url: &str) -> Option<String> {
    log::info!("Tier 3: Starting headless webview sniffer for {}", url);

    let (tx, mut rx) = tokio::sync::mpsc::channel::<String>(4);
    let tx_listen = tx.clone();
    let tx_eval = tx.clone();

    let event_id = app.listen("sniffed-url", move |event| {
        let payload = event.payload();
        let parsed = serde_json::from_str::<serde_json::Value>(payload).ok();
        let found = parsed
            .as_ref()
            .and_then(|v| v.get("url"))
            .and_then(|u| u.as_str())
            .map(|s| s.to_string())
            .or_else(|| {
                serde_json::from_str::<String>(payload)
                    .ok()
                    .filter(|s| s.starts_with("http"))
            });
        if let Some(u) = found {
            let _ = tx_listen.try_send(u);
        }
    });

    let init_script = r#"
        try {
            Object.defineProperty(navigator, 'webdriver', {
                get: function() { return false; },
                configurable: true
            });
        } catch(e) {}

        function _dlEmit(rawUrl) {
            if (!rawUrl || typeof rawUrl !== 'string') return;
            if (!rawUrl.startsWith('http')) return;
            if (window._dlSeen && window._dlSeen.has(rawUrl)) return;
            if (!window._dlSeen) window._dlSeen = new Set();
            window._dlSeen.add(rawUrl);

            try {
                var img = new Image();
                img.src = 'dlsniff://sniff?url=' + encodeURIComponent(rawUrl);
            } catch(e) {}

            try { window.top.postMessage({ type: 'dl-sniff', url: rawUrl }, '*'); } catch(e) {}
        }

        if (window === window.top) {
            window.addEventListener('message', function(ev) {
                if (ev && ev.data && ev.data.type === 'dl-sniff') {
                    _dlEmit(ev.data.url);
                }
            });
        }

        var DL_HITS = [
            '.m3u8', '.mp4', '.ts', '.mkv', '.webm',
            'vidmoly', 'streamtape', 'dood.', 'filemoon',
            'ok.ru/video', 'sibnet', 'megacloud', 'rabbitstream',
            'streamwish', 'vidhide', 'vidsrc', 'mp4upload',
            'mixdrop', 'upstream', 'uqload', 'fembed', 'hydrax'
        ];

        function _dlCheck(u) {
            if (!u || typeof u !== 'string') return;
            for (var i = 0; i < DL_HITS.length; i++) {
                if (u.indexOf(DL_HITS[i]) !== -1) { _dlEmit(u); return; }
            }
        }

        var _origFetch = window.fetch;
        window.fetch = function() {
            var u = arguments[0];
            _dlCheck(typeof u === 'string' ? u : (u && u.url));
            return _origFetch.apply(this, arguments);
        };

        var _origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(m, u) {
            _dlCheck(u);
            return _origOpen.apply(this, arguments);
        };

        try {
            var _srcDesc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src');
            if (_srcDesc && _srcDesc.set) {
                Object.defineProperty(HTMLMediaElement.prototype, 'src', {
                    set: function(v) { _dlCheck(v); _srcDesc.set.call(this, v); },
                    get: function()  { return _srcDesc.get.call(this); },
                    configurable: true
                });
            }
        } catch(e) {}

        try {
            var _mo = new MutationObserver(function(muts) {
                muts.forEach(function(m) {
                    m.addedNodes.forEach(function(n) {
                        if (!n || n.nodeType !== 1) return;
                        if (n.src) _dlCheck(n.src);
                        if (n.querySelectorAll) {
                            n.querySelectorAll('[src]').forEach(function(el) {
                                _dlCheck(el.src || el.getAttribute('src'));
                            });
                        }
                    });
                    if (m.type === 'attributes' && m.attributeName === 'src') {
                        _dlCheck(m.target && (m.target.src || m.target.getAttribute('src')));
                    }
                });
            });
            _mo.observe(document.documentElement || document, {
                childList: true, subtree: true, attributes: true, attributeFilter: ['src']
            });
        } catch(e) {}
    "#;

    let label = format!("sniffer_{}", uuid::Uuid::new_v4().simple());

    let hits: Vec<&'static str> = vec![
        ".m3u8", ".mp4", ".ts", ".mkv", ".webm",
        "vidmoly", "streamtape", "dood.", "filemoon",
        "ok.ru/video", "sibnet", "megacloud", "rabbitstream",
        "streamwish", "vidhide", "vidsrc", "mp4upload",
        "mixdrop", "upstream", "uqload", "fembed", "hydrax",
    ];
    let hits_pattern = hits.join("|").replace('.', "\\.");
    let scan_js = format!(
        r#"
        (function() {{
            var HITS = /({hits})/ ;
            performance.getEntriesByType('resource').forEach(function(e) {{
                if (HITS.test(e.name)) {{ _dlCheck(e.name); }}
            }});
        }})();
        "#,
        hits = hits_pattern
    );

    let window = match WebviewWindowBuilder::new(
        app,
        label,
        WebviewUrl::External(url.parse().unwrap_or_else(|_| "about:blank".parse().unwrap())),
    )
    .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15")
    .visible(false)
    .initialization_script_for_all_frames(init_script)
    .on_page_load(move |win, _payload| {
        let scan = scan_js.clone();
        let tx2 = tx_eval.clone();
        tauri::async_runtime::spawn(async move {
            for _ in 0..12u8 {
                tokio::time::sleep(std::time::Duration::from_secs(2)).await;
                if tx2.is_closed() {
                    break;
                }
                let _ = win.eval(&scan);
            }
        });
    })
    .build()
    {
        Ok(w) => w,
        Err(e) => {
            log::error!("Failed to create sniffer window: {}", e);
            app.unlisten(event_id);
            return None;
        }
    };

    let result = match tokio::time::timeout(std::time::Duration::from_secs(25), rx.recv()).await {
        Ok(Some(sniffed)) => {
            log::info!("Tier 3: Sniffed stream URL: {}", sniffed);
            Some(sniffed)
        }
        _ => {
            log::warn!("Tier 3: Timeout — no stream URL detected in 25 s");
            None
        }
    };

    app.unlisten(event_id);
    let _ = window.close();

    result
}

/// Fallback resolver for TikTok videos when yt-dlp is blocked by rehydration challenges.
pub async fn resolve_tiktok_fallback(url: &str) -> Option<(String, String, Option<String>)> {
    if !url.contains("tiktok.com") {
        return None;
    }

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(8))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()
        .ok()?;

    let endpoint = format!("https://www.tikwm.com/api/?url={}", urlencoding::encode(url));
    let resp = client.get(&endpoint).send().await.ok()?;
    let json: serde_json::Value = resp.json().await.ok()?;

    if json.get("code").and_then(|c| c.as_i64()) == Some(0) {
        if let Some(data) = json.get("data") {
            let play_url = data.get("play").and_then(|p| p.as_str())?.to_string();
            let title = data
                .get("title")
                .and_then(|t| t.as_str())
                .filter(|s| !s.trim().is_empty())
                .unwrap_or("TikTok Video")
                .to_string();
            let cover = data
                .get("cover")
                .and_then(|c| c.as_str())
                .map(|s| s.to_string());
            log::info!("[TikTok Fallback] Successfully resolved direct stream for: {}", url);
            return Some((play_url, title, cover));
        }
    }
    None
}

