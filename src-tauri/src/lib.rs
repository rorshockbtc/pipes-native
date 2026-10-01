mod workflows;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      workflows::watch_local_folder,
      workflows::stop_watching,
      workflows::read_local_file,
      workflows::get_default_sync_folder,
      workflows::hydrate_github_repo,
      workflows::provision_harness,
      workflows::record_outbound_lead
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        ).ok();
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
