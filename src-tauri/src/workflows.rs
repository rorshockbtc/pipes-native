use notify::{Watcher, RecursiveMode, RecommendedWatcher, Config};
use serde::Serialize;
use std::path::Path;
use std::sync::Mutex;
use std::thread;
use tauri::{AppHandle, Emitter};

#[derive(Clone, Serialize)]
pub struct FileChangeEvent {
    pub event_type: String,
    pub path: String,
}

lazy_static::lazy_static! {
    static ref WATCHER: Mutex<Option<RecommendedWatcher>> = Mutex::new(None);
}

#[tauri::command]
pub async fn watch_local_folder(app: AppHandle, path: String) -> Result<String, String> {
    let watch_path = Path::new(&path).to_path_buf();
    
    // Defensive Sandbox Check: If the path does not exist, ensure its parent is within allowed bounds
    // before calling create_dir_all to prevent creating directories in arbitrary filesystem locations.
    if !watch_path.exists() {
        if let Some(parent) = watch_path.parent() {
            let _ = assert_safe_path(parent)?;
        }
        if let Err(e) = std::fs::create_dir_all(&watch_path) {
            return Err(format!("Could not create directory: {}", e));
        }
    }

    // Defensive Sandbox Check: Validate canonical target path against sensitive files and allowed roots
    let safe_watch_path = assert_safe_path(&watch_path)?;

    let app_clone = app.clone();
    
    // Stop any previous watcher before creating a new one
    {
        let mut global_watcher = WATCHER.lock().unwrap();
        *global_watcher = None;
    }
    
    // Set up the watcher in a separate thread so it doesn't block the Tauri runtime
    thread::spawn(move || {
        let (tx, rx) = std::sync::mpsc::channel();
        
        let mut watcher = match RecommendedWatcher::new(tx, Config::default()) {
            Ok(w) => w,
            Err(e) => {
                println!("Failed to create watcher: {}", e);
                return;
            }
        };

        if let Err(e) = watcher.watch(safe_watch_path.as_path(), RecursiveMode::Recursive) {
            println!("Failed to watch path: {}", e);
            return;
        }

        // Store the watcher in the global state to keep it alive
        let mut global_watcher = WATCHER.lock().unwrap();
        *global_watcher = Some(watcher);
        drop(global_watcher);

        // Listen for events
        for res in rx {
            match res {
                Ok(event) => {
                    // Filter out uninteresting events (e.g. metadata changes without content changes)
                    if event.kind.is_modify() || event.kind.is_create() {
                        let path_str = event.paths.get(0)
                            .map(|p| p.to_string_lossy().to_string())
                            .unwrap_or_else(|| "".to_string());
                            
                        // Ignore hidden files / temporary system locks (like .DS_Store or ~$)
                        if !path_str.is_empty() && !path_str.contains(".DS_Store") && !path_str.contains("~$") {
                            let change = FileChangeEvent {
                                event_type: format!("{:?}", event.kind),
                                path: path_str,
                            };
                            
                            // Emit to the frontend
                            let _ = app_clone.emit("file_change_detected", change);
                        }
                    }
                },
                Err(e) => println!("Watch error: {:?}", e),
            }
        }
    });

    Ok(format!("Started watching {}", path))
}

#[tauri::command]
pub fn stop_watching() -> Result<String, String> {
    let mut watcher = WATCHER.lock().unwrap();
    *watcher = None; // Dropping the watcher stops it
    Ok("Stopped watching folder".to_string())
}

fn assert_safe_path(target_path: &Path) -> Result<std::path::PathBuf, String> {
    let canonical = target_path.canonicalize().map_err(|e| format!("Path cannot be resolved: {}", e))?;
    
    // Disallow dotfiles or sensitive credentials (.ssh, .aws, .env, id_rsa, etc.)
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
            return Err("Access to sensitive credentials or environment keys is strictly forbidden by sandbox.".to_string());
        }
    }

    let allowed_roots = [
        dirs::document_dir().map(|d| d.join("Pipes Projects")),
        dirs::document_dir().map(|d| d.join("Pipes Drafts")),
        dirs::home_dir().map(|h| h.join(".pipes")),
        dirs::home_dir().map(|h| h.join("Documents").join("Pipes Projects")),
        dirs::home_dir().map(|h| h.join("Documents").join("Pipes Drafts")),
    ];

    let mut is_allowed = false;
    for root_opt in allowed_roots.iter().flatten() {
        if !root_opt.exists() {
            let _ = std::fs::create_dir_all(root_opt);
        }
        if let Ok(canonical_root) = root_opt.canonicalize() {
            if canonical.starts_with(&canonical_root) {
                is_allowed = true;
                break;
            }
        }
    }

    if !is_allowed {
        return Err("Path sandboxing violation: File is outside authorized Pipes workspace directories.".to_string());
    }

    Ok(canonical)
}

#[tauri::command]
pub fn read_local_file(path: String) -> Result<String, String> {
    let target = Path::new(&path);
    let safe_path = assert_safe_path(target)?;
    std::fs::read_to_string(safe_path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub fn get_default_sync_folder() -> Result<String, String> {
    if let Some(doc_dir) = dirs::document_dir() {
        let pipes_sync = doc_dir.join("Pipes Drafts");
        let _ = std::fs::create_dir_all(&pipes_sync);
        Ok(pipes_sync.to_string_lossy().to_string())
    } else if let Some(home) = dirs::home_dir() {
        let pipes_sync = home.join("Pipes Drafts");
        let _ = std::fs::create_dir_all(&pipes_sync);
        Ok(pipes_sync.to_string_lossy().to_string())
    } else {
        Err("Could not determine default directory".to_string())
    }
}

#[derive(Clone, Serialize, serde::Deserialize)]
pub struct HydratedPipe {
    pub namespace: String,
    pub author: String,
    pub repo_name: String,
    pub repo_url: String,
    pub clone_url: String,
    pub claim_status: String,
    pub token_debit_cost: u32,
    pub is_chb_first_party: bool,
    pub creator_cut_usd: f64,
    pub foregone_earnings_usd: f64,
    pub claim_price_annual_usd: f64,
    pub claim_price_btc_year1_usd: f64,
    pub active_curator_sub_annual_usd: f64,
}

fn validate_github_url(url: &str) -> Result<(String, String), String> {
    let github_regex = regex::Regex::new(r"^https://github\.com/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+?)(\.git)?$")
        .map_err(|e| e.to_string())?;

    if let Some(caps) = github_regex.captures(url.trim()) {
        let author = caps.get(1).map_or("", |m| m.as_str()).to_string();
        let repo = caps.get(2).map_or("", |m| m.as_str()).to_string();
        if author.is_empty() || repo.is_empty() {
            return Err("Invalid GitHub repository URL format".to_string());
        }
        Ok((author, repo))
    } else {
        Err("Security Violation: Only valid https://github.com/username/repo URLs are permitted.".to_string())
    }
}

#[tauri::command]
pub async fn hydrate_github_repo(url: String) -> Result<HydratedPipe, String> {
    let (author, repo_name) = validate_github_url(&url)?;
    let namespace = repo_name.to_lowercase().replace('_', "-");
    let repo_url = format!("https://github.com/{}/{}", author, repo_name);
    let clone_url = format!("https://github.com/{}/{}.git", author, repo_name);
    let author_lower = author.to_lowercase();
    let is_chb_first_party = author_lower == "rorshockbtc" 
        || author_lower == "colon-hyphen-brackets" 
        || author_lower == "marigold-ai";
    let token_debit_cost = if is_chb_first_party { 10 } else { 21 };

    Ok(HydratedPipe {
        namespace,
        author,
        repo_name,
        repo_url,
        clone_url,
        claim_status: "unclaimed".to_string(),
        token_debit_cost,
        is_chb_first_party,
        creator_cut_usd: 0.0,
        foregone_earnings_usd: 0.25,
        claim_price_annual_usd: 48.00,
        claim_price_btc_year1_usd: 36.00,
        active_curator_sub_annual_usd: 299.00,
    })
}

#[tauri::command]
pub async fn provision_harness(repo_url: String, namespace: String) -> Result<String, String> {
    let (author, repo_name) = validate_github_url(&repo_url)?;
    let safe_repo_url = format!("https://github.com/{}/{}", author, repo_name);

    // Sanitize namespace: must start and end with alphanumeric, max 64 chars
    if namespace.is_empty() 
        || namespace.len() > 64 
        || namespace.starts_with('-') 
        || namespace.ends_with('-')
        || !namespace.chars().all(|c| c.is_ascii_alphanumeric() || c == '-') {
        return Err("Invalid namespace: Must be 1-64 alphanumeric characters or hyphens, and cannot start or end with a hyphen.".to_string());
    }

    let projects_dir = dirs::document_dir()
        .or_else(dirs::home_dir)
        .ok_or("Could not locate home directory")?
        .join("Pipes Projects")
        .join(&namespace);

    std::fs::create_dir_all(&projects_dir).map_err(|e| e.to_string())?;

    // Attempt sparse git clone with -- option terminator to prevent flag injection
    let _ = std::process::Command::new("git")
        .arg("clone")
        .arg("--depth")
        .arg("1")
        .arg("--") // Terminates options
        .arg(&safe_repo_url)
        .arg(&projects_dir)
        .output();

    let local_path = projects_dir.to_string_lossy().to_string();

    // Write a local .pipes/harness.json spec inside the project directory
    let pipes_meta_dir = projects_dir.join(".pipes");
    let _ = std::fs::create_dir_all(&pipes_meta_dir);
    let harness_file = pipes_meta_dir.join("harness.json");

    let harness_payload = serde_json::json!({
        "namespace": namespace,
        "repo_url": safe_repo_url,
        "local_path": local_path,
        "runtime": "duckdb-wasm",
        "zeroCloud": true
    });

    let _ = std::fs::write(&harness_file, serde_json::to_string_pretty(&harness_payload).unwrap_or_default());

    Ok(local_path)
}

#[tauri::command]
pub fn record_outbound_lead(author: String, repo_name: String, repo_url: String) -> Result<String, String> {
    let pipes_dir = dirs::home_dir().ok_or("No home directory")?.join(".pipes");
    let _ = std::fs::create_dir_all(&pipes_dir);
    let leads_file = pipes_dir.join("outbound_leads.json");

    let mut leads: Vec<serde_json::Value> = if leads_file.exists() {
        let content = std::fs::read_to_string(&leads_file).unwrap_or_default();
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        Vec::new()
    };

    let new_lead = serde_json::json!({
        "author": author,
        "repo_name": repo_name,
        "repo_url": repo_url,
        "unclaimed_payout_usd": 0.00,
        "platform_revenue_retained_usd": 0.25,
        "foregone_earnings_usd": 0.25,
        "token_cost": 21,
        "claim_namespace_price_usd": 48.00,
        "claim_namespace_btc_year1_price_usd": 36.00, // 25% discount in Bitcoin sats Year 1
        "active_curator_sub_price_usd": 299.00,
        "active_curator_btc_year1_price_usd": 224.00, // 25% discount for Year 1 Bitcoin subscribers
        "btc_renewal_policy": "Year 1 is 25% off. Year 2 evaluated based on network participation and Bitcoin incentives.",
        "status": "pending_curator_pitch"
    });

    leads.push(new_lead);
    let _ = std::fs::write(&leads_file, serde_json::to_string_pretty(&leads).unwrap_or_default());

    Ok("Lead recorded in local CRM".to_string())
}
