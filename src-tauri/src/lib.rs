mod workflows;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
      workflows::watch_local_folder,
      workflows::stop_watching,
      workflows::read_local_file,
      workflows::write_local_file,
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
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
