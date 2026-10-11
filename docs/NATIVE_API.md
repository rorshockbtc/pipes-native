# Pipes Native API Contract (v1)

This is the single source of truth for the Tauri IPC surface between the bundled frontend (`src/`, built with Vite into `dist/`) and the Rust backend (`src-tauri/`).

- Commands are invoked as `invoke("<name>", { camelCaseArgs })`. Tauri converts arg names from camelCase to snake_case.
- Events are emitted with `app.emit(name, payload)`.
- **Every command returns `Result<T, String>`.**
- Error strings that start with a code prefix let the UI branch on them:
  - `OFFLINE:` means the network is required and unavailable. The UI should queue the action or explain.
  - `NOT_INSTALLED:` means a dependency is missing (Ollama, a whisper model). The UI should offer the installer.
  - `SANDBOX:` means the path is outside the allowed roots.
  - `AUTH:` means the user is not signed in, or the token has expired.
  - `CANCELLED:` means the user cancelled the action.

## Architecture rules
1. **The app must fully work offline.** The UI is bundled into `dist/` and never loads `pipes.pink` as the window URL.
2. **All network calls go through Rust (`reqwest`).** That covers pipes.pink, GitHub, Ollama, Anthropic and OpenAI, and it avoids CORS and mixed-content problems in WKWebView and WebView2.
3. **Anything that needs the server is written to the SQLite outbox and flushed by the sync engine when the app is back online.** That covers credit debits, published nodes, notes and leads.
4. **Sandbox roots:**
   - `~/Documents/Pipes Projects`
   - `~/Documents/Pipes Drafts`
   - `~/.pipes`
   - the app data dir

   Credentials are always denied: `.ssh`, `.aws`, `.gnupg`, `.env*`, `id_rsa*`, `id_ed25519*`.
5. **Secrets go in the OS keychain** (`keyring` crate) and are never written to SQLite or localStorage. Secrets means the desktop auth token and BYOK keys.
6. **No simulated success.** If something cannot run, return an error with a code prefix.

---

## System
| Command | Args | Returns |
|---|---|---|
| `app_info` | – | `{ version, os: "macos"\|"windows"\|"linux", arch, dataDir }` |
| `check_connectivity` | – | `{ online: bool, latencyMs: number\|null }` (GET `https://www.pipes.pink/api/health`, 4s timeout) |
| `open_external` | `url` | `()` (http/https only) |
| `reveal_path` | `path` | `()` (open in Finder/Explorer, sandboxed) |

Event: `connectivity_changed { online }`. A background task polls every 20s.

## Local store & sync
SQLite file `pipes.db` lives in the app data dir.

| Command | Args | Returns |
|---|---|---|
| `kv_get` | `key` | `string \| null` |
| `kv_set` | `key, value` | `()` |
| `outbox_enqueue` | `kind, payload` (JSON value) | `id: number` |
| `outbox_list` | – | `OutboxItem[]` `{ id, kind, payload, status: "pending"\|"failed"\|"done", attempts, lastError, createdAt }` |
| `sync_now` | – | `SyncReport { pushed, failed, credits: CreditsState }` (error `OFFLINE:`/`AUTH:`) |
| `sync_status` | – | `{ pending, failed, lastSyncedAt, online }` |

Event: `sync_status_changed { pending, failed, lastSyncedAt, online }`.

The sync engine POSTs pending items in batches to `https://www.pipes.pink/api/desktop/sync` with `Authorization: Bearer <desktop token>`.
- Body: `{ items: [{ clientId, kind, payload, createdAt }] }`
- Response: `{ results: [{ clientId, ok, error? }], credits: { balance } }`
- It retries with backoff whenever the app is online and authenticated.

## Credits
The server is authoritative. Locally the app keeps a ledger plus a cached balance.

| Command | Args | Returns |
|---|---|---|
| `credits_get` | – | `CreditsState { balance, pendingDebits, lastSyncedAt, signedIn }` |
| `credits_debit` | `amount, reason, reference` | `CreditsState`. Writes a local ledger row and an outbox item of kind `credit_debit`. Errors if `balance - pendingDebits < amount` |

**Local compute (Ollama, whisper, file ops) always costs 0 credits.**

## Auth (device link, works with Clerk on the website)
| Command | Args | Returns |
|---|---|---|
| `auth_start_link` | – | `{ code, verifyUrl }`. POSTs `/api/desktop/link/start`, then opens `verifyUrl` in the system browser |
| `auth_poll_link` | `code` | `{ status: "pending"\|"approved"\|"expired", user?: { id, name, email, imageUrl } }`. On approval it stores the token in the keychain |
| `auth_status` | – | `{ signedIn, user? }` (cached user is kept in kv so it works offline) |
| `auth_sign_out` | – | `()` |

## Files & workspace
Existing commands are kept: `watch_local_folder`, `stop_watching`, `read_local_file`, `get_default_sync_folder`. Event: `file_change_detected { eventType, path }`.

| Command | Args | Returns |
|---|---|---|
| `get_workspace_roots` | – | `{ projects, drafts, pipesHome }` (created if missing) |
| `list_dir_tree` | `root, maxDepth` | `FileNode { name, path, isDir, size, modifiedMs, children?: FileNode[] }` (skips `.git`, `node_modules`, `target`) |
| `write_local_file` | `path, contents` | `()` (creates parent dirs) |
| `create_dir` | `path` | `()` |
| `delete_path` | `path` | `()` (moves to OS trash via the `trash` crate) |
| `rename_path` | `from, to` | `()` |
| `save_recording` | `base64, ext` | `path` (writes to `Pipes Drafts/Recordings/<timestamp>.<ext>`) |

## Projects (GitHub → local)
| Command | Args | Returns |
|---|---|---|
| `hydrate_github_repo` | `url` | `HydratedRepo { owner, repo, namespace, description, stars, license, defaultBranch, sizeKb, htmlUrl, isFirstParty, tokenCost }`. Calls the real GitHub REST API. Error `OFFLINE:` or `NOT_FOUND:` |
| `provision_project` | `repoUrl, namespace` | `{ localPath, fileCount }`. Downloads the zipball from `codeload.github.com` (no git required), extracts it into `Pipes Projects/<namespace>` and writes `.pipes/project.json` |

Event: `provision_progress { namespace, stage: "downloading"\|"extracting"\|"done", pct }`.

`tokenCost` is 10 for first-party owners and 21 otherwise. This is display-only; the server re-validates when the debit is synced.

## Integrity (Merkle) & code outline
| Command | Args | Returns |
|---|---|---|
| `compute_merkle_tree` | `root` | `{ rootHash, fileCount, tree: MerkleNode { name, path, hash, isDir, children? } }` (SHA-256, sorted children) |
| `merkle_proof` | `root, filePath` | `{ leafHash, rootHash, siblings: [{ hash, position: "left"\|"right" }] , verified: bool }` |
| `code_outline` | `path` | `Symbol[] { kind, name, line }` (regex outline for ts/tsx/js/rs/py/go/md headings) |

## Terminal
| Command | Args | Returns |
|---|---|---|
| `terminal_run` | `cwd, command` | `runId`. `cwd` must be sandboxed. Runs with `sh -lc` on macOS and `cmd /C` on Windows |
| `terminal_kill` | `runId` | `()` |

Events:
- `terminal_output { runId, stream: "stdout"\|"stderr", line }`
- `terminal_exit { runId, code }`

## Local AI (Ollama)
| Command | Args | Returns |
|---|---|---|
| `ai_detect` | – | `{ ollama: { installed, running, version?, models: [{ name, sizeBytes }] }, lmstudio: { running, models: string[] } }` |
| `ai_install_ollama` | – | `()`. Downloads the official installer and installs it: macOS uses `Ollama-darwin.zip` into `~/Applications` then launches it; Windows uses `OllamaSetup.exe /VERYSILENT /NORESTART /SUPPRESSMSGBOXES`. Afterwards it ensures the server is running |
| `ai_start_ollama` | – | `()` (launches the app or `ollama serve`, then waits until port 11434 responds) |
| `ai_pull_model` | `model` | `()` |
| `ai_delete_model` | `model` | `()` |
| `ai_chat` | `requestId, model, messages: [{role, content}], options?` | `()`. Streams via `/api/chat` with `stream: true` and no hard timeout |
| `ai_cancel` | `requestId` | `()` |

Events:
- `ai_install_progress { stage, pct, message }`
- `ai_pull_progress { model, status, completed, total }`
- `ai_token { requestId, token }`
- `ai_done { requestId, content, model, evalCount }`
- `ai_error { requestId, error }`

Recommended models:
- `llama3.2:3b` (general)
- `qwen2.5:3b` (general, multilingual)
- optional `qwen2.5-coder:7b` (Developer mode)

## Frontier escalation & BYOK
| Command | Args | Returns |
|---|---|---|
| `byok_set_key` | `provider: "anthropic"\|"openai", key` | `()` (keychain) |
| `byok_status` | – | `{ anthropic: bool, openai: bool }` |
| `byok_clear` | `provider` | `()` |
| `frontier_chat` | `requestId, provider, model, messages` | `()` (streams the same `ai_token` / `ai_done` / `ai_error` events) |
| `cloud_chat` | `requestId, messages, persona` | `()`. Calls `https://www.pipes.pink/api/chat` with the desktop token and emits the same events. Error `OFFLINE:` / `AUTH:` |

## Transcription (whisper.cpp via `whisper-rs`, fully on-device)
| Command | Args | Returns |
|---|---|---|
| `transcribe_status` | – | `{ modelInstalled, modelName, sizeMb }` |
| `transcribe_install_model` | `name` (`"base.en"` default, `"small"` optional) | `()`. Downloads the ggml model from Hugging Face into the app data dir |
| `transcribe_audio_file` | `path` | `{ transcript, segments: [{ startMs, endMs, text }], durationSeconds, language, engine: "whisper.cpp (on-device)" }` |

Events:
- `transcribe_model_progress { pct }`
- `transcribe_progress { pct }`

Audio decoding uses `symphonia` (wav/mp3/m4a-aac/flac/ogg-vorbis), resampled to 16 kHz mono. The frontend records the microphone as **WAV** (AudioWorklet PCM) so that live dictation works in both WebViews and offline.
