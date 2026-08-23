/// Cinema & Broadcast Standard Subtitle Chunker and Formatter (Netflix / BBC Standard)
/// 
/// Features:
/// - Max 38–42 characters per line (CPL)
/// - Max 1–2 lines per subtitle cue (never 3+ lines covering the video)
/// - Strict Sentence & Phrase Isolation (sequential cinematic rhythm)
/// - Word-level and proportional timestamp interpolation
/// - Robust Silence, Background Noise, and Hallucination Filter (VAD & Repetition Guards)

use serde_json::Value;

#[derive(Debug, Clone)]
pub struct SubtitleCue {
    pub start: f64,
    pub end: f64,
    pub lines: Vec<String>,
}

const MAX_LINE_LENGTH: usize = 38;
const MAX_CUE_CHARS: usize = 70;
const MAX_CUE_DURATION: f64 = 4.5;
const MIN_CUE_DURATION: f64 = 1.0;

/// Converts Whisper verbose_json output into clean, movie-standard SRT subtitles
pub fn format_whisper_json_to_srt(json_str: &str) -> String {
    let Ok(val) = serde_json::from_str::<Value>(json_str) else {
        return json_str.trim().to_string();
    };

    let cues = extract_and_chunk_cues(&val);
    if cues.is_empty() {
        if let Some(text) = val.get("text").and_then(|v| v.as_str()) {
            let clean = text.trim();
            if !is_noise_or_hallucination(clean) {
                return clean.to_string();
            }
        }
        return String::new();
    }

    render_srt(&cues)
}

fn extract_and_chunk_cues(val: &Value) -> Vec<SubtitleCue> {
    let mut all_cues = Vec::new();

    let Some(segments) = val.get("segments").and_then(|v| v.as_array()) else {
        return all_cues;
    };

    for seg in segments {
        // 1. Voice Activity Detection (VAD) — tighter threshold catches
        //    instrumental sections where Whisper hallucinates speech
        if let Some(no_speech) = seg.get("no_speech_prob").and_then(|v| v.as_f64()) {
            if no_speech > 0.5 {
                continue;
            }
        }

        // 2. Average log-probability gate — low confidence = garbage text
        if let Some(avg_logprob) = seg.get("avg_logprob").and_then(|v| v.as_f64()) {
            if avg_logprob < -0.8 {
                continue;
            }
        }

        // 3. Repetition & Hallucination Loop Protection
        if let Some(compression) = seg.get("compression_ratio").and_then(|v| v.as_f64()) {
            if compression > 2.0 {
                continue;
            }
        }

        let seg_start = seg.get("start").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let seg_end = seg.get("end").and_then(|v| v.as_f64()).unwrap_or(seg_start + 2.0);
        let seg_text = seg.get("text").and_then(|v| v.as_str()).unwrap_or("").trim();

        if seg_text.is_empty() || is_noise_or_hallucination(seg_text) {
            continue;
        }

        // Check if word-level timestamps are present
        if let Some(words) = seg.get("words").and_then(|v| v.as_array()) {
            // Filter out low-confidence words before chunking
            let confident_words: Vec<Value> = words
                .iter()
                .filter(|w| {
                    let prob = w.get("probability").and_then(|v| v.as_f64()).unwrap_or(1.0);
                    prob > 0.35
                })
                .cloned()
                .collect();

            if !confident_words.is_empty() {
                let mut word_cues = chunk_from_words(&confident_words);
                if !word_cues.is_empty() {
                    all_cues.append(&mut word_cues);
                    continue;
                }
            }
        }

        // Otherwise, split segment sentence-by-sentence and phrase-by-phrase
        let mut sub_cues = chunk_segment_proportionally(seg_start, seg_end, seg_text);
        all_cues.append(&mut sub_cues);
    }

    all_cues
}

/// Detects background noise tokens, silence placeholders, and common Whisper hallucinations
pub fn is_noise_or_hallucination(text: &str) -> bool {
    let clean = text.trim();
    if clean.is_empty() {
        return true;
    }

    // Strip punctuation only check
    let only_punct = clean.chars().all(|c| c.is_ascii_punctuation() || c.is_whitespace() || c == '♪' || c == '♫');
    if only_punct {
        return true;
    }

    let lower = clean.to_lowercase();

    // Noise and non-speech brackets
    let noise_patterns = [
        "[music]", "[applause]", "[laughter]", "[silence]", "[cheering]", "[gasp]",
        "[inaudible]", "[screaming]", "[crying]", "[snicker]", "[groan]", "[sigh]",
        "(music)", "(applause)", "(laughter)", "(silence)", "(cheering)", "(gasp)",
        "*music*", "*applause*", "*laughter*", "*silence*",
        "♪", "♪♪", "♪♪♪", "♫", "...", "--",
    ];
    for pattern in &noise_patterns {
        if lower == *pattern || lower == format!("[{}]", pattern) {
            return true;
        }
    }

    // Whisper ending / loop hallucinations
    let hallucination_prefixes = [
        "subtitles by", "transcribed by", "translated by", "amara.org",
        "thank you for watching", "thanks for watching", "please subscribe",
        "like and subscribe", "copyright", "all rights reserved",
    ];
    for prefix in &hallucination_prefixes {
        if lower.starts_with(prefix) || lower == *prefix {
            return true;
        }
    }

    false
}

/// Chunk using word-level timestamps for frame-accurate movie pacing
fn chunk_from_words(words: &[Value]) -> Vec<SubtitleCue> {
    let mut cues = Vec::new();
    let mut current_words: Vec<(String, f64, f64)> = Vec::new();

    for (idx, w) in words.iter().enumerate() {
        let text = w.get("word").and_then(|v| v.as_str()).unwrap_or("").trim();
        if text.is_empty() || is_noise_or_hallucination(text) {
            continue;
        }
        let start = w.get("start").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let end = w.get("end").and_then(|v| v.as_f64()).unwrap_or(start + 0.3);

        let is_sentence_end = text.ends_with('.') || text.ends_with('!') || text.ends_with('?');
        let is_clause_end = text.ends_with(',') || text.ends_with(';') || text.ends_with(':') || text.ends_with('—') || text.ends_with('-');
        
        let next_is_capital = words.get(idx + 1)
            .and_then(|nw| nw.get("word").and_then(|v| v.as_str()))
            .map(|nw| nw.trim().chars().next().map(|c| c.is_uppercase()).unwrap_or(false))
            .unwrap_or(false);

        current_words.push((text.to_string(), start, end));

        let total_chars: usize = current_words.iter().map(|(t, _, _)| t.len() + 1).sum();
        let cue_duration = end - current_words.first().map(|w| w.1).unwrap_or(start);

        let should_split = is_sentence_end
            || (next_is_capital && total_chars >= 20)
            || (is_clause_end && total_chars >= 24)
            || total_chars >= MAX_CUE_CHARS
            || cue_duration >= MAX_CUE_DURATION;

        if should_split {
            if let Some(cue) = build_cue_from_word_list(&current_words) {
                cues.push(cue);
            }
            current_words.clear();
        }
    }

    if !current_words.is_empty() {
        if let Some(cue) = build_cue_from_word_list(&current_words) {
            cues.push(cue);
        }
    }

    cues
}

fn build_cue_from_word_list(words: &[(String, f64, f64)]) -> Option<SubtitleCue> {
    if words.is_empty() {
        return None;
    }
    let start = words.first()?.1;
    let end = words.last()?.2.max(start + MIN_CUE_DURATION);
    let full_text: String = words.iter().map(|(t, _, _)| t.as_str()).collect::<Vec<_>>().join(" ");

    if is_noise_or_hallucination(&full_text) {
        return None;
    }

    let lines = balance_lines(&full_text);
    Some(SubtitleCue { start, end, lines })
}

/// Chunk long segments proportionally into short, single-sentence / single-phrase cues
fn chunk_segment_proportionally(start: f64, end: f64, text: &str) -> Vec<SubtitleCue> {
    if is_noise_or_hallucination(text) {
        return Vec::new();
    }

    let words: Vec<&str> = text.split_whitespace().collect();
    if words.is_empty() {
        return Vec::new();
    }

    let full_len = text.len();
    if full_len <= MAX_LINE_LENGTH && (end - start) <= MAX_CUE_DURATION {
        return vec![SubtitleCue {
            start,
            end: end.max(start + MIN_CUE_DURATION),
            lines: vec![text.trim().to_string()],
        }];
    }

    // Split into natural phrase chunks
    let mut chunks: Vec<Vec<&str>> = Vec::new();
    let mut current_chunk: Vec<&str> = Vec::new();
    let mut current_len = 0;

    for (idx, word) in words.iter().enumerate() {
        let w_len = word.len() + 1;
        let is_sentence_end = word.ends_with('.') || word.ends_with('!') || word.ends_with('?');
        let is_clause_end = word.ends_with(',') || word.ends_with(';') || word.ends_with(':') || word.ends_with('—') || word.ends_with('-');
        
        let next_is_capital = words.get(idx + 1)
            .map(|nw| nw.chars().next().map(|c| c.is_uppercase()).unwrap_or(false))
            .unwrap_or(false);

        let reached_limit = current_len + w_len >= MAX_CUE_CHARS;
        let natural_split = is_sentence_end || (is_clause_end && current_len >= 22) || (next_is_capital && current_len >= 20);

        if (reached_limit || natural_split) && !current_chunk.is_empty() {
            current_chunk.push(*word);
            chunks.push(current_chunk);
            current_chunk = Vec::new();
            current_len = 0;
        } else {
            current_chunk.push(*word);
            current_len += w_len;
        }
    }

    if !current_chunk.is_empty() {
        chunks.push(current_chunk);
    }

    let total_chars: usize = chunks
        .iter()
        .map(|c| c.iter().map(|w| w.len() + 1).sum::<usize>())
        .sum();
    let duration = (end - start).max(0.1);

    let mut result = Vec::new();
    let mut accumulated_chars = 0;

    for chunk in chunks {
        let chunk_text = chunk.join(" ");
        if is_noise_or_hallucination(&chunk_text) {
            continue;
        }

        let chunk_len = chunk_text.len() + 1;
        let sub_start = start + (accumulated_chars as f64 / total_chars as f64) * duration;
        accumulated_chars += chunk_len;
        let sub_end = start + (accumulated_chars as f64 / total_chars as f64) * duration;

        result.push(SubtitleCue {
            start: sub_start,
            end: sub_end.max(sub_start + MIN_CUE_DURATION),
            lines: balance_lines(&chunk_text),
        });
    }

    result
}

/// Balance a phrase into 1 or at most 2 clean lines (max 38 characters each)
fn balance_lines(text: &str) -> Vec<String> {
    let clean = text.trim();
    if clean.len() <= MAX_LINE_LENGTH {
        return vec![clean.to_string()];
    }

    let words: Vec<&str> = clean.split_whitespace().collect();
    if words.len() <= 1 {
        return vec![clean.to_string()];
    }

    let total_len = clean.len();
    let target_mid = total_len / 2;

    let mut best_split_idx = 1;
    let mut best_diff = usize::MAX;
    let mut running_len = 0;

    for (i, word) in words.iter().enumerate().take(words.len() - 1) {
        running_len += word.len() + 1;
        let diff = if running_len > target_mid {
            running_len - target_mid
        } else {
            target_mid - running_len
        };

        // Natural split bonuses: punctuation or short conjunctions
        let has_punct = word.ends_with(',') || word.ends_with(';') || word.ends_with(':') || word.ends_with('.');
        let is_conjunction = matches!(*word, "and" | "but" | "or" | "because" | "when" | "if" | "so" | "that");
        
        let mut bonus = 0;
        if has_punct { bonus += 8; }
        if is_conjunction { bonus += 4; }

        let adjusted_diff = diff.saturating_sub(bonus);

        if adjusted_diff < best_diff {
            best_diff = adjusted_diff;
            best_split_idx = i + 1;
        }
    }

    let line1 = words[..best_split_idx].join(" ");
    let line2 = words[best_split_idx..].join(" ");

    if line2.is_empty() {
        vec![line1]
    } else {
        vec![line1, line2]
    }
}

/// Render cues to standardized SRT file format
pub fn render_srt(cues: &[SubtitleCue]) -> String {
    let mut srt = String::new();
    let mut cue_number = 1;

    for cue in cues {
        if cue.lines.is_empty() {
            continue;
        }

        srt.push_str(&format!("{}\n", cue_number));
        srt.push_str(&format!(
            "{} --> {}\n",
            format_timestamp(cue.start),
            format_timestamp(cue.end)
        ));
        for line in &cue.lines {
            srt.push_str(line);
            srt.push('\n');
        }
        srt.push('\n');
        cue_number += 1;
    }

    srt.trim_end().to_string()
}

fn format_timestamp(seconds: f64) -> String {
    let hours = (seconds / 3600.0) as u64;
    let minutes = ((seconds % 3600.0) / 60.0) as u64;
    let secs = (seconds % 60.0) as u64;
    let millis = (seconds.fract() * 1000.0).round() as u64;
    format!("{:02}:{:02}:{:02},{:03}", hours, minutes, secs, millis.min(999))
}
