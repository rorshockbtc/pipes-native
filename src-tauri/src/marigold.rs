use serde::Serialize;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs::File;
use std::io::{BufRead, BufReader, BufWriter, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::time::Instant;
use tauri::{AppHandle, Emitter};

use crate::workflows::assert_safe_path;

const STREAM_IO_BUFFER_BYTES: usize = 256 * 1024;
const MAX_GROUP_BUCKETS: usize = 500;
const PROGRESS_EMIT_INTERVAL_ROWS: u64 = 100_000;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarigoldNativeCapabilities {
    pub available: bool,
    pub engine: String,
    pub out_of_core_zip_streaming: bool,
    pub wasm32_ceiling_bypassed: bool,
    pub default_vault_dir: String,
    pub supported_extensions: Vec<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarigoldLocalDatasetItem {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub location: String,
    pub extension: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarigoldGroupCount {
    pub value: String,
    pub count: u64,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarigoldStreamProfile {
    pub source_path: String,
    pub entry_name: String,
    pub file_bytes: u64,
    pub sha256: String,
    pub delimiter: String,
    pub headers: Vec<String>,
    pub total_rows: u64,
    pub elapsed_ms: u64,
    pub group_by_column: Option<String>,
    pub top_groups: Vec<MarigoldGroupCount>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarigoldShardItem {
    pub file_name: String,
    pub path: String,
    pub row_count: u64,
    pub byte_size: u64,
    pub sha256: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MarigoldShardManifest {
    pub source_path: String,
    pub entry_name: String,
    pub output_dir: String,
    pub total_rows: u64,
    pub rows_per_shard: usize,
    pub shard_count: usize,
    pub merkle_root: String,
    pub elapsed_ms: u64,
    pub shards: Vec<MarigoldShardItem>,
}

fn expand_user_path(raw: &str) -> PathBuf {
    let trimmed = raw.trim();
    if let Some(stripped) = trimmed.strip_prefix("~/").or_else(|| trimmed.strip_prefix("~\\")) {
        if let Some(home) = dirs::home_dir() {
            return home.join(stripped);
        }
    }
    PathBuf::from(trimmed)
}

fn get_default_marigold_vault_dir() -> Result<PathBuf, String> {
    let base = dirs::document_dir()
        .or_else(|| dirs::home_dir().map(|h| h.join("Documents")))
        .or_else(dirs::home_dir)
        .ok_or_else(|| "Could not determine user Documents directory.".to_string())?;
    let vault = base.join("Marigold_Local");
    if !vault.exists() {
        std::fs::create_dir_all(&vault)
            .map_err(|e| format!("Failed to initialize Marigold_Local vault: {}", e))?;
    }
    Ok(vault)
}

fn check_no_sensitive_components(canonical: &Path) -> Result<(), String> {
    for component in canonical.components() {
        let comp_str = component.as_os_str().to_string_lossy();
        if comp_str.starts_with(".ssh")
            || comp_str.starts_with(".aws")
            || comp_str.starts_with(".gnupg")
            || comp_str == ".env"
            || comp_str.starts_with(".env.")
            || comp_str.contains("id_rsa")
            || comp_str.contains("id_ed25519")
        {
            return Err(
                "Access to sensitive credentials or environment keys is strictly forbidden by sandbox."
                    .to_string(),
            );
        }
    }
    Ok(())
}

fn is_supported_civic_extension(path: &Path) -> bool {
    match path.extension().and_then(|e| e.to_str()) {
        Some(ext) => matches!(ext.to_ascii_lowercase().as_str(), "zip" | "csv" | "tsv" | "txt"),
        None => false,
    }
}

fn assert_safe_read_civic_source(raw_path: &str) -> Result<PathBuf, String> {
    let target = expand_user_path(raw_path);
    let canonical = target
        .canonicalize()
        .map_err(|e| format!("Dataset path cannot be resolved ({}): {}", raw_path, e))?;

    if !canonical.is_file() {
        return Err("Selected dataset path is not a regular file.".to_string());
    }

    check_no_sensitive_components(&canonical)?;

    if !is_supported_civic_extension(&canonical) {
        return Err(
            "Unsupported dataset format. Authorized formats: .zip, .csv, .tsv, .txt".to_string(),
        );
    }

    if assert_safe_path(&canonical).is_ok() {
        return Ok(canonical);
    }

    let read_roots = [
        dirs::download_dir(),
        dirs::desktop_dir(),
        dirs::document_dir(),
        dirs::home_dir().map(|h| h.join("Downloads")),
        dirs::home_dir().map(|h| h.join("Desktop")),
        dirs::home_dir().map(|h| h.join("Documents")),
    ];

    for root_opt in read_roots.iter().flatten() {
        if let Ok(canonical_root) = root_opt.canonicalize() {
            if canonical.starts_with(&canonical_root) {
                return Ok(canonical);
            }
        }
    }

    Err(
        "Path sandboxing violation: Civic dataset must live inside Downloads, Desktop, Documents, or ~/Documents/Marigold_Local."
            .to_string(),
    )
}

fn sanitize_subdir_name(raw: &str) -> String {
    let cleaned: String = raw
        .chars()
        .map(|c| {
            if c.is_ascii_alphanumeric() || c == '_' || c == '-' {
                c
            } else {
                '_'
            }
        })
        .collect();
    let trimmed = cleaned.trim_matches('_');
    if trimmed.is_empty() {
        "civic_shards".to_string()
    } else {
        trimmed.chars().take(64).collect()
    }
}

fn hash_file_streaming(path: &Path) -> Result<(String, u64), String> {
    let mut file = File::open(path).map_err(|e| format!("Failed opening file for hashing: {}", e))?;
    let mut hasher = Sha256::new();
    let mut buf = [0u8; 65536];
    let mut total_bytes: u64 = 0;

    loop {
        let read = file
            .read(&mut buf)
            .map_err(|e| format!("Failed streaming file bytes: {}", e))?;
        if read == 0 {
            break;
        }
        hasher.update(&buf[..read]);
        total_bytes += read as u64;
    }

    let digest = hasher
        .finalize()
        .iter()
        .map(|b| format!("{:02x}", b))
        .collect::<String>();
    Ok((digest, total_bytes))
}

fn is_valid_zip_tabular_entry(name: &str) -> bool {
    let trimmed = name.trim();
    if trimmed.is_empty()
        || trimmed.ends_with('/')
        || trimmed.starts_with("__MACOSX/")
        || trimmed.contains("/.")
        || trimmed.starts_with('.')
    {
        return false;
    }
    let lower = trimmed.to_ascii_lowercase();
    lower.ends_with(".txt") || lower.ends_with(".csv") || lower.ends_with(".tsv")
}

fn pick_best_zip_entry(listing_stdout: &[u8]) -> Option<String> {
    let listing = String::from_utf8_lossy(listing_stdout);
    let mut candidates: Vec<String> = listing
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| is_valid_zip_tabular_entry(l))
        .collect();

    if candidates.is_empty() {
        return None;
    }

    candidates.sort_by_key(|name| {
        let lower = name.to_ascii_lowercase();
        let priority = if lower.contains("statewide") || lower.contains("voter") {
            0
        } else if lower.ends_with(".csv") || lower.ends_with(".tsv") {
            1
        } else {
            2
        };
        (priority, name.len())
    });

    candidates.into_iter().next()
}

fn inspect_zip_tabular_entry(zip_path: &Path) -> Result<String, String> {
    #[cfg(not(target_os = "windows"))]
    let output = Command::new("unzip")
        .arg("-Z1")
        .arg(zip_path)
        .output()
        .map_err(|e| format!("Failed running system `unzip -Z1`: {}", e))?;

    #[cfg(target_os = "windows")]
    let output = Command::new("tar")
        .arg("-tf")
        .arg(zip_path)
        .output()
        .map_err(|e| format!("Failed running system `tar -tf`: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Unable to inspect .zip archive entries: {}", stderr.trim()));
    }

    pick_best_zip_entry(&output.stdout).ok_or_else(|| {
        "No tabular .csv, .tsv, or .txt entry found inside the selected .zip archive.".to_string()
    })
}

fn open_tabular_line_reader(
    path: &Path,
) -> Result<(Box<dyn BufRead + Send>, Option<Child>, String), String> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    if ext == "zip" {
        let entry_name = inspect_zip_tabular_entry(path)?;

        #[cfg(not(target_os = "windows"))]
        let mut child = Command::new("unzip")
            .arg("-p")
            .arg(path)
            .arg(&entry_name)
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("Failed launching streaming `unzip -p`: {}", e))?;

        #[cfg(target_os = "windows")]
        let mut child = Command::new("tar")
            .arg("-xOf")
            .arg(path)
            .arg(&entry_name)
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("Failed launching streaming `tar -xOf`: {}", e))?;

        let stdout = child
            .stdout
            .take()
            .ok_or_else(|| "Failed to attach stdout pipe for .zip stream.".to_string())?;
        let reader = BufReader::with_capacity(STREAM_IO_BUFFER_BYTES, stdout);
        Ok((Box::new(reader), Some(child), entry_name))
    } else {
        let file = File::open(path).map_err(|e| format!("Failed to open dataset file: {}", e))?;
        let entry_name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "dataset.csv".to_string());
        let reader = BufReader::with_capacity(STREAM_IO_BUFFER_BYTES, file);
        Ok((Box::new(reader), None, entry_name))
    }
}

fn detect_delimiter(header_line: &str, override_delim: Option<&str>) -> char {
    if let Some(d) = override_delim {
        let trimmed = d.trim();
        if trimmed == "\t" || trimmed.eq_ignore_ascii_case("tab") || trimmed == "\\t" {
            return '\t';
        }
        if trimmed == "|" {
            return '|';
        }
        if trimmed == "," {
            return ',';
        }
    }

    let tabs = header_line.matches('\t').count();
    let pipes = header_line.matches('|').count();
    let commas = header_line.matches(',').count();

    if tabs > 0 && tabs >= commas && tabs >= pipes {
        '\t'
    } else if pipes > 0 && pipes > commas {
        '|'
    } else {
        ','
    }
}

fn split_delimited_line(line: &str, delim: char) -> Vec<String> {
    let mut fields = Vec::new();
    let mut current = String::new();
    let mut in_quotes = false;
    let mut chars = line.chars().peekable();

    while let Some(c) = chars.next() {
        if c == '"' {
            if in_quotes && chars.peek() == Some(&'"') {
                current.push('"');
                let _ = chars.next();
            } else {
                in_quotes = !in_quotes;
            }
        } else if c == delim && !in_quotes {
            fields.push(current.trim().to_string());
            current.clear();
        } else {
            current.push(c);
        }
    }
    fields.push(current.trim().to_string());
    fields
}

fn extract_nth_field(line: &str, delim: char, target_idx: usize) -> Option<String> {
    if !line.contains('"') {
        return line
            .split(delim)
            .nth(target_idx)
            .map(|s| s.trim().to_string());
    }
    split_delimited_line(line, delim).into_iter().nth(target_idx)
}

fn is_pii_header(header_lower: &str) -> bool {
    const PII_TOKENS: [&str; 12] = [
        "name",
        "addr",
        "street",
        "house_num",
        "dob",
        "birth",
        "phone",
        "email",
        "ssn",
        "dl_num",
        "voter_reg_num",
        "ncid",
    ];
    PII_TOKENS.iter().any(|tok| header_lower.contains(tok))
}

fn resolve_group_by_index(headers: &[String], requested: Option<&str>) -> Option<(usize, String)> {
    if let Some(req) = requested {
        let req_trim = req.trim();
        if !req_trim.is_empty() && !is_pii_header(&req_trim.to_ascii_lowercase()) {
            if let Some((idx, name)) = headers
                .iter()
                .enumerate()
                .find(|(_, h)| h.eq_ignore_ascii_case(req_trim))
            {
                return Some((idx, name.clone()));
            }
        }
    }

    const PREFERRED_CATEGORICAL: [&str; 8] = [
        "county_desc",
        "county",
        "county_name",
        "voter_status_desc",
        "status",
        "party_cd",
        "state",
        "precinct_abbrv",
    ];

    for preferred in PREFERRED_CATEGORICAL {
        if let Some((idx, name)) = headers
            .iter()
            .enumerate()
            .find(|(_, h)| h.eq_ignore_ascii_case(preferred))
        {
            return Some((idx, name.clone()));
        }
    }

    None
}

fn trim_line_endings(s: &str) -> &str {
    s.trim_end_matches(|c| c == '\r' || c == '\n')
}

#[tauri::command]
pub fn marigold_native_capabilities() -> MarigoldNativeCapabilities {
    let default_vault_dir = get_default_marigold_vault_dir()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|_| "~/Documents/Marigold_Local".to_string());

    MarigoldNativeCapabilities {
        available: true,
        engine: "pipes-native-rust-v2".to_string(),
        out_of_core_zip_streaming: true,
        wasm32_ceiling_bypassed: true,
        default_vault_dir,
        supported_extensions: vec![
            ".zip".to_string(),
            ".csv".to_string(),
            ".tsv".to_string(),
            ".txt".to_string(),
        ],
    }
}

#[tauri::command]
pub fn marigold_list_local_datasets() -> Result<Vec<MarigoldLocalDatasetItem>, String> {
    let mut items: Vec<MarigoldLocalDatasetItem> = Vec::new();
    let vault_dir = get_default_marigold_vault_dir()?;

    let mut scan_dirs: Vec<(PathBuf, &str)> = vec![(vault_dir, "Marigold_Local")];
    if let Some(downloads) = dirs::download_dir().or_else(|| dirs::home_dir().map(|h| h.join("Downloads"))) {
        scan_dirs.push((downloads, "Downloads"));
    }

    for (dir_path, label) in scan_dirs {
        if let Ok(entries) = std::fs::read_dir(&dir_path) {
            for entry in entries.flatten() {
                let p = entry.path();
                if !p.is_file() || !is_supported_civic_extension(&p) {
                    continue;
                }
                let name = p
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();
                if name.starts_with('.') {
                    continue;
                }
                let ext = p
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("")
                    .to_ascii_lowercase();
                let size_bytes = entry.metadata().map(|m| m.len()).unwrap_or(0);

                items.push(MarigoldLocalDatasetItem {
                    name,
                    path: p.to_string_lossy().to_string(),
                    size_bytes,
                    location: label.to_string(),
                    extension: ext,
                });
            }
        }
    }

    items.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes).then_with(|| a.name.cmp(&b.name)));
    items.truncate(40);
    Ok(items)
}

#[tauri::command]
pub async fn marigold_stream_profile_dataset(
    path: String,
    delimiter: Option<String>,
    group_by_col: Option<String>,
) -> Result<MarigoldStreamProfile, String> {
    tokio::task::spawn_blocking(move || {
        let start = Instant::now();
        let safe_path = assert_safe_read_civic_source(&path)?;
        let (sha256, file_bytes) = hash_file_streaming(&safe_path)?;

        let (mut reader, child_opt, entry_name) = open_tabular_line_reader(&safe_path)?;
        let mut raw_line: Vec<u8> = Vec::with_capacity(4096);

        // Read first non-empty header line
        let mut header_line_str = String::new();
        loop {
            raw_line.clear();
            let bytes = reader
                .read_until(b'\n', &mut raw_line)
                .map_err(|e| format!("Failed reading dataset header: {}", e))?;
            if bytes == 0 {
                break;
            }
            let decoded = String::from_utf8_lossy(&raw_line);
            let stripped = trim_line_endings(&decoded).trim_start_matches('\u{feff}');
            if !stripped.trim().is_empty() {
                header_line_str = stripped.to_string();
                break;
            }
        }

        if header_line_str.is_empty() {
            if let Some(mut child) = child_opt {
                let _ = child.wait();
            }
            return Err("Dataset appears empty; no header line found.".to_string());
        }

        let delim_char = detect_delimiter(&header_line_str, delimiter.as_deref());
        let headers: Vec<String> = split_delimited_line(&header_line_str, delim_char)
            .into_iter()
            .filter(|h| !h.is_empty())
            .collect();

        let group_target = resolve_group_by_index(&headers, group_by_col.as_deref());
        let mut group_counts: HashMap<String, u64> = HashMap::new();
        let mut total_rows: u64 = 0;

        loop {
            raw_line.clear();
            let bytes = reader
                .read_until(b'\n', &mut raw_line)
                .map_err(|e| format!("Error streaming row {}: {}", total_rows + 1, e))?;
            if bytes == 0 {
                break;
            }

            let decoded = String::from_utf8_lossy(&raw_line);
            let line = trim_line_endings(&decoded);
            if line.trim().is_empty() {
                continue;
            }
            total_rows += 1;

            if let Some((col_idx, _)) = &group_target {
                let val = extract_nth_field(line, delim_char, *col_idx)
                    .unwrap_or_default();
                let key = if val.is_empty() {
                    "(blank)".to_string()
                } else if group_counts.len() >= MAX_GROUP_BUCKETS && !group_counts.contains_key(&val) {
                    "OTHER".to_string()
                } else {
                    val
                };
                *group_counts.entry(key).or_insert(0) += 1;
            }
        }

        drop(reader);
        if let Some(mut child) = child_opt {
            let _ = child.wait();
        }

        let mut top_groups: Vec<MarigoldGroupCount> = group_counts
            .into_iter()
            .map(|(value, count)| MarigoldGroupCount { value, count })
            .collect();
        top_groups.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.value.cmp(&b.value)));
        top_groups.truncate(25);

        let delim_label = match delim_char {
            '\t' => "TAB (\\t)".to_string(),
            '|' => "PIPE (|)".to_string(),
            _ => "CSV (,)".to_string(),
        };

        Ok(MarigoldStreamProfile {
            source_path: safe_path.to_string_lossy().to_string(),
            entry_name,
            file_bytes,
            sha256,
            delimiter: delim_label,
            headers,
            total_rows,
            elapsed_ms: start.elapsed().as_millis() as u64,
            group_by_column: group_target.map(|(_, name)| name),
            top_groups,
        })
    })
    .await
    .map_err(|e| format!("Background streaming task failed: {}", e))?
}

fn open_shard_writer(
    out_dir: &Path,
    shard_index: usize,
    ext: &str,
    header_bytes: &[u8],
) -> Result<(BufWriter<File>, PathBuf, Sha256, u64), String> {
    let file_name = format!("shard_{:03}.{}", shard_index, ext);
    let shard_path = out_dir.join(&file_name);
    let file = File::create(&shard_path)
        .map_err(|e| format!("Failed creating shard {}: {}", file_name, e))?;
    let mut writer = BufWriter::with_capacity(STREAM_IO_BUFFER_BYTES, file);
    let mut hasher = Sha256::new();

    writer
        .write_all(header_bytes)
        .map_err(|e| format!("Failed writing shard header {}: {}", file_name, e))?;
    writer
        .write_all(b"\n")
        .map_err(|e| format!("Failed writing shard header newline {}: {}", file_name, e))?;
    hasher.update(header_bytes);
    hasher.update(b"\n");

    let initial_bytes = (header_bytes.len() + 1) as u64;
    Ok((writer, shard_path, hasher, initial_bytes))
}

#[tauri::command]
pub async fn marigold_shard_massive_archive(
    app: AppHandle,
    path: String,
    rows_per_shard: Option<usize>,
    output_subdir: Option<String>,
) -> Result<MarigoldShardManifest, String> {
    tokio::task::spawn_blocking(move || {
        let start = Instant::now();
        let safe_source = assert_safe_read_civic_source(&path)?;
        let per_shard = rows_per_shard.unwrap_or(250_000).clamp(10_000, 2_000_000);

        let vault_root = get_default_marigold_vault_dir()?;
        let default_subdir = safe_source
            .file_stem()
            .map(|s| format!("{}_shards", s.to_string_lossy()))
            .unwrap_or_else(|| "civic_shards".to_string());
        let subdir = sanitize_subdir_name(output_subdir.as_deref().unwrap_or(&default_subdir));
        let target_out_dir = vault_root.join(subdir);
        if !target_out_dir.exists() {
            std::fs::create_dir_all(&target_out_dir)
                .map_err(|e| format!("Could not create shard output folder: {}", e))?;
        }
        let safe_out_dir = assert_safe_path(&target_out_dir)?;

        let (mut reader, child_opt, entry_name) = open_tabular_line_reader(&safe_source)?;
        let mut raw_line: Vec<u8> = Vec::with_capacity(4096);

        let mut header_line_str = String::new();
        loop {
            raw_line.clear();
            let bytes = reader
                .read_until(b'\n', &mut raw_line)
                .map_err(|e| format!("Failed reading header for sharding: {}", e))?;
            if bytes == 0 {
                break;
            }
            let decoded = String::from_utf8_lossy(&raw_line);
            let stripped = trim_line_endings(&decoded).trim_start_matches('\u{feff}');
            if !stripped.trim().is_empty() {
                header_line_str = stripped.to_string();
                break;
            }
        }

        if header_line_str.is_empty() {
            if let Some(mut child) = child_opt {
                let _ = child.wait();
            }
            return Err("Dataset header missing; cannot shard empty file.".to_string());
        }

        let delim_char = detect_delimiter(&header_line_str, None);
        let shard_ext = if delim_char == '\t' { "tsv" } else { "csv" };
        let header_bytes = header_line_str.as_bytes().to_vec();

        let mut shards: Vec<MarigoldShardItem> = Vec::new();
        let mut total_rows: u64 = 0;
        let mut shard_index: usize = 1;
        let mut current_shard_rows: u64 = 0;

        let (mut writer, mut current_path, mut hasher, mut current_bytes) =
            open_shard_writer(&safe_out_dir, shard_index, shard_ext, &header_bytes)?;

        loop {
            raw_line.clear();
            let bytes = reader
                .read_until(b'\n', &mut raw_line)
                .map_err(|e| format!("Error sharding row {}: {}", total_rows + 1, e))?;
            if bytes == 0 {
                break;
            }

            let decoded = String::from_utf8_lossy(&raw_line);
            let trimmed = trim_line_endings(&decoded);
            if trimmed.trim().is_empty() {
                continue;
            }

            if current_shard_rows >= per_shard as u64 {
                writer.flush().map_err(|e| format!("Flush error: {}", e))?;
                let digest = hasher
                    .finalize()
                    .iter()
                    .map(|b| format!("{:02x}", b))
                    .collect::<String>();
                shards.push(MarigoldShardItem {
                    file_name: current_path
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_default(),
                    path: current_path.to_string_lossy().to_string(),
                    row_count: current_shard_rows,
                    byte_size: current_bytes,
                    sha256: digest,
                });

                shard_index += 1;
                current_shard_rows = 0;
                let opened = open_shard_writer(&safe_out_dir, shard_index, shard_ext, &header_bytes)?;
                writer = opened.0;
                current_path = opened.1;
                hasher = opened.2;
                current_bytes = opened.3;
            }

            let line_bytes = trimmed.as_bytes();
            writer
                .write_all(line_bytes)
                .map_err(|e| format!("Failed writing shard row: {}", e))?;
            writer
                .write_all(b"\n")
                .map_err(|e| format!("Failed writing newline: {}", e))?;
            hasher.update(line_bytes);
            hasher.update(b"\n");

            current_bytes += (line_bytes.len() + 1) as u64;
            current_shard_rows += 1;
            total_rows += 1;

            if total_rows % PROGRESS_EMIT_INTERVAL_ROWS == 0 {
                let _ = app.emit(
                    "marigold_shard_progress",
                    serde_json::json!({
                        "totalRows": total_rows,
                        "currentShard": shard_index,
                        "entryName": entry_name
                    }),
                );
            }
        }

        // Flush final open shard if it holds rows (or if input had 0 data rows, keep shard 001 with header)
        writer.flush().map_err(|e| format!("Final flush error: {}", e))?;
        let final_digest = hasher
            .finalize()
            .iter()
            .map(|b| format!("{:02x}", b))
            .collect::<String>();
        shards.push(MarigoldShardItem {
            file_name: current_path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default(),
            path: current_path.to_string_lossy().to_string(),
            row_count: current_shard_rows,
            byte_size: current_bytes,
            sha256: final_digest,
        });

        drop(reader);
        if let Some(mut child) = child_opt {
            let _ = child.wait();
        }

        let mut root_hasher = Sha256::new();
        for shard in &shards {
            root_hasher.update(shard.sha256.as_bytes());
        }
        let merkle_root = root_hasher
            .finalize()
            .iter()
            .map(|b| format!("{:02x}", b))
            .collect::<String>();

        let manifest = MarigoldShardManifest {
            source_path: safe_source.to_string_lossy().to_string(),
            entry_name,
            output_dir: safe_out_dir.to_string_lossy().to_string(),
            total_rows,
            rows_per_shard: per_shard,
            shard_count: shards.len(),
            merkle_root,
            elapsed_ms: start.elapsed().as_millis() as u64,
            shards,
        };

        let manifest_path = safe_out_dir.join("_marigold_native_shard_manifest.json");
        let manifest_json = serde_json::to_string_pretty(&manifest)
            .map_err(|e| format!("Failed serializing shard manifest: {}", e))?;
        std::fs::write(&manifest_path, manifest_json)
            .map_err(|e| format!("Failed writing shard manifest JSON: {}", e))?;

        Ok(manifest)
    })
    .await
    .map_err(|e| format!("Background sharding task failed: {}", e))?
}
