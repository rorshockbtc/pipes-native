mod workflows;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      workflows::watch_local_folder,
      workflows::stop_watching,
      workflows::read_local_file,
      workflows::write_local_file,
      workflows::save_project_bundle,
      workflows::load_saved_project,
      workflows::open_project_folder,
      workflows::start_local_preview_server,
      workflows::open_external_url,
      workflows::publish_project_to_github,
      workflows::deploy_to_cloudflare,
      workflows::get_default_sync_folder,
      workflows::list_workspace_files,
      workflows::hydrate_github_repo,
      workflows::provision_harness,
      workflows::record_outbound_lead,
      workflows::detect_local_ai,
      workflows::pull_local_model,
      workflows::chat_local_ai,
      workflows::terminal_run,
      workflows::compute_merkle_tree,
      workflows::transcribe_audio_file
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        ).ok();
      }

      // Smart Online / Local / Offline Boot Probe:
      // 1. If local dev server (localhost:3000) is running and debug_assertions is enabled, prefer it.
      // 2. Otherwise verify https://www.pipes.pink/desktop/bang is reachable.
      // 3. If offline (airplane mode / no network), fall back to the bundled local studio (index.html).
      let app_handle = app.handle().clone();
      tauri::async_runtime::spawn(async move {
        let client = match reqwest::Client::builder()
          .timeout(std::time::Duration::from_millis(2200))
          .build()
        {
          Ok(c) => c,
          Err(_) => return,
        };

        if cfg!(debug_assertions) {
          if let Ok(resp) = client.get("http://localhost:3000/desktop/bang").send().await {
            if resp.status().is_success() {
              if let Some(win) = app_handle.get_webview_window("main") {
                if let Ok(url) = "http://localhost:3000/desktop/bang".parse() {
                  let _ = win.navigate(url);
                  return;
                }
              }
            }
          }
        }

        let online_ok = match client.get("https://www.pipes.pink/desktop/bang").send().await {
          Ok(resp) => resp.status().is_success(),
          Err(_) => false,
        };

        if !online_ok {
          // Try localhost:3000 even in release if developer has local server running while offline
          let local_ok = match client.get("http://localhost:3000/desktop/bang").send().await {
            Ok(resp) => resp.status().is_success(),
            Err(_) => false,
          };

          if let Some(win) = app_handle.get_webview_window("main") {
            let fallback_target = if local_ok {
              "http://localhost:3000/desktop/bang"
            } else {
              "tauri://localhost/index.html"
            };
            if let Ok(url) = fallback_target.parse() {
              let _ = win.navigate(url);
            }
          }
        }
      });

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}

