"use client";

import { useState, useEffect } from "react";
import { 
  FolderSync, 
  FileText, 
  CheckCircle2, 
  Play, 
  Square, 
  Folder, 
  Sparkles, 
  UploadCloud, 
  Radio, 
  ArrowRight, 
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Clock,
  Layers,
  FileCheck
} from "lucide-react";

interface FileChangeEvent {
  event_type: String;
  path: String;
}

interface SyncedDraft {
  path: string;
  filename: string;
  preview: string;
  timestamp: string;
}

export default function WorkflowsPage() {
  const [isTauri, setIsTauri] = useState(false);
  const [folderPath, setFolderPath] = useState("");
  const [isWatching, setIsWatching] = useState(false);
  const [events, setEvents] = useState<SyncedDraft[]>([]);
  const [activeTab, setActiveTab] = useState<"folder" | "agency" | "voice" | "audit">("folder");
  const [statusMessage, setStatusMessage] = useState<string>("");

  useEffect(() => {
    const isDesktopApp = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    setIsTauri(isDesktopApp);

    if (isDesktopApp) {
      import("@tauri-apps/api/core").then(({ invoke }) => {
        invoke<string>("get_default_sync_folder")
          .then((defaultDir) => {
            setFolderPath(defaultDir);
          })
          .catch((err) => console.warn("Failed to get default folder", err));
      });

      let unlisten: () => void;
      import("@tauri-apps/api/event").then(({ listen }) => {
        listen<{ event_type: string; path: string }>("file_change_detected", async (event) => {
          const filePath = event.payload.path;
          const filename = filePath.split("/").pop() || filePath.split("\\").pop() || "draft.md";

          let preview = "File detected by local sovereign daemon.";
          try {
            const { invoke } = await import("@tauri-apps/api/core");
            const content = await invoke<string>("read_local_file", { path: filePath });
            preview = content.slice(0, 180) + (content.length > 180 ? "..." : "");
          } catch (e) {
            // Binary file or non-text
            preview = "Local change staged. Ready for processing.";
          }

          const newDraft: SyncedDraft = {
            path: filePath,
            filename,
            preview,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
          };

          setEvents((prev) => [newDraft, ...prev.slice(0, 19)]);
          setStatusMessage(`Auto-synced: ${filename}`);
        }).then((fn) => {
          unlisten = fn;
        });
      });

      return () => {
        if (unlisten) unlisten();
      };
    } else {
      // Demo mock folder in browser
      setFolderPath("~/Documents/Pipes Drafts");
    }
  }, []);

  const handleToggleWatch = async () => {
    if (!folderPath.trim()) return;

    if (isWatching) {
      if (isTauri) {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          await invoke("stop_watching");
        } catch (e) {
          console.error(e);
        }
      }
      setIsWatching(false);
      setStatusMessage("Folder sync paused");
    } else {
      if (isTauri) {
        try {
          const { invoke } = await import("@tauri-apps/api/core");
          await invoke("watch_local_folder", { path: folderPath.trim() });
        } catch (e: any) {
          setStatusMessage(`Watch failed: ${e?.message ?? e}`);
          return;
        }
      }
      setIsWatching(true);
      setStatusMessage(`Watching: ${folderPath}`);
    }
  };

  return (
    <div className="h-full w-full bg-[#FAF8F5] text-[#111827] flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="border-b border-[#E2DBD0] bg-[#F4F0E8] px-8 py-6 shrink-0">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Local Sovereign Node</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF1777]"></span>
              <span className="text-[11px] font-bold text-[#FF1777] uppercase tracking-wider">Automations</span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#111827] flex items-center gap-3">
              Workflows Control Center
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Zero-cloud local automations connecting your desktop files, editor tools, and agency publishing directly to Pipes.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-[#EAE6DF] p-1 rounded-lg border border-[#E2DBD0]">
            <button
              onClick={() => setActiveTab("folder")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === "folder"
                  ? "bg-[#FAF8F5] text-[#111827] shadow-sm border border-[#E2DBD0]"
                  : "text-gray-600 hover:text-[#111827]"
              }`}
            >
              Folder Watcher
            </button>
            <button
              onClick={() => setActiveTab("agency")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === "agency"
                  ? "bg-[#FAF8F5] text-[#111827] shadow-sm border border-[#E2DBD0]"
                  : "text-gray-600 hover:text-[#111827]"
              }`}
            >
              Agency CMS
            </button>
            <button
              onClick={() => setActiveTab("voice")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === "voice"
                  ? "bg-[#FAF8F5] text-[#111827] shadow-sm border border-[#E2DBD0]"
                  : "text-gray-600 hover:text-[#111827]"
              }`}
            >
              Voice Memos
            </button>
            <button
              onClick={() => setActiveTab("audit")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === "audit"
                  ? "bg-[#FAF8F5] text-[#111827] shadow-sm border border-[#E2DBD0]"
                  : "text-gray-600 hover:text-[#111827]"
              }`}
            >
              Curation Audit
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto w-full p-8 flex-1">
        {/* TAB 1: LOCAL FOLDER WATCHER */}
        {activeTab === "folder" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Watcher Config */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-[#F4F0E8] border border-[#E2DBD0] rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#EAE6DF] border border-[#D4CFC4] flex items-center justify-center">
                      <FolderSync className="w-5 h-5 text-[#FF1777]" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#111827]">Obsidian &amp; MS Word Auto-Sync</h2>
                      <p className="text-xs text-gray-500">Cross-platform daemon watching Mac &amp; Windows local files</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${isWatching ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-600">
                      {isWatching ? "Active Daemon" : "Idle"}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed mb-5">
                  Point this daemon to your Obsidian Vault, local Word folder, or research notes. The second you hit Save in your favorite desktop editor, the sovereign node reads the document, generates a cryptographic hash, and stages it directly in Hash.
                </p>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Target Sync Directory
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Folder className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={folderPath}
                        onChange={(e) => setFolderPath(e.target.value)}
                        placeholder="/Users/you/Documents/Pipes Drafts"
                        className="w-full pl-9 pr-4 py-2.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-xs font-mono text-[#111827] focus:outline-none focus:border-[#FF1777]"
                      />
                    </div>
                    <button
                      onClick={handleToggleWatch}
                      className={`px-5 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm ${
                        isWatching
                          ? "bg-[#FAF8F5] text-amber-700 border border-amber-300 hover:bg-amber-50"
                          : "bg-[#FF1777] text-white hover:bg-pink-700"
                      }`}
                    >
                      {isWatching ? (
                        <>
                          <Square className="w-3.5 h-3.5 fill-current" />
                          Pause Watcher
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Start Watcher
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {statusMessage && (
                  <div className="mt-4 p-3 rounded-lg bg-[#FAF8F5] border border-[#E2DBD0] flex items-center justify-between text-xs text-gray-700">
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#FF1777]" />
                      {statusMessage}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">Live</span>
                  </div>
                )}
              </div>

              {/* Quick instructions / features */}
              <div className="bg-[#FAF8F5] border border-[#E2DBD0] rounded-xl p-6">
                <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Sovereign Privacy Guarantees
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-600">
                  <div className="p-3 bg-[#F4F0E8] rounded-lg border border-[#E2DBD0]">
                    <p className="font-bold text-[#111827] mb-1">100% Local Execution</p>
                    <p>Files never upload to third-party cloud servers. Tokenization and hashing happen in your local Rust daemon.</p>
                  </div>
                  <div className="p-3 bg-[#F4F0E8] rounded-lg border border-[#E2DBD0]">
                    <p className="font-bold text-[#111827] mb-1">Word &amp; Markdown Native</p>
                    <p>Supports .docx, .md, .txt, and raw code files. Automatically strips clutter and normalizes formatting.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Event Feed */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="bg-[#F4F0E8] border border-[#E2DBD0] rounded-xl p-5 flex-1 flex flex-col">
                <div className="flex items-center justify-between pb-3 border-b border-[#E2DBD0] mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#FF1777]" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827]">Live Sync Activity</h3>
                  </div>
                  <span className="text-[10px] font-bold text-gray-500 bg-[#EAE6DF] px-2 py-0.5 rounded border border-[#E2DBD0]">
                    {events.length} captured
                  </span>
                </div>

                {events.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-[#D4CFC4] rounded-lg bg-[#FAF8F5]">
                    <FileCheck className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-xs font-bold text-gray-700">Listening for filesystem saves</p>
                    <p className="text-[11px] text-gray-500 mt-1 max-w-xs">
                      Hit Save in any document inside your sync folder to see it staged here in real-time.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto max-h-[480px] pr-1">
                    {events.map((evt, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg shadow-sm hover:border-[#FF1777] transition-all group"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-[#111827] font-mono truncate max-w-[200px]">
                            {evt.filename}
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">{evt.timestamp}</span>
                        </div>
                        <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed mb-2 font-serif italic">
                          "{evt.preview}"
                        </p>
                        <div className="flex items-center justify-between pt-2 border-t border-[#EAE6DF]">
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Staged in Local Node
                          </span>
                          <a
                            href="/hash"
                            className="text-[11px] font-bold text-[#FF1777] hover:underline flex items-center gap-1"
                          >
                            Open in Hash <ArrowRight className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: AGENCY CMS AUTO-DEPLOY */}
        {activeTab === "agency" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-[#F4F0E8] border border-[#E2DBD0] rounded-xl p-8 shadow-sm">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAE6DF] border border-[#D4CFC4] text-[#FF1777] text-xs font-bold mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                Colon-Hyphen-Brackets Agency Infrastructure
              </div>
              <h2 className="text-2xl font-serif font-bold text-[#111827] mb-3">
                Modern Sovereign Web vs. $200/mo WordPress Bloat
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-6">
                Tired of sluggish WordPress dashboards, vulnerability-riddled plugins, and bloated hosting bills? We build modern, blazing-fast Next.js websites where you own 100% of your source code. Update your website through simple Word documents or conversation—Bang commits and deploys to the web invisibly.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="p-5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Business Setup Package</p>
                  <p className="text-2xl font-serif font-bold text-[#111827]">$2,500 <span className="text-xs font-sans font-normal text-gray-500">one-time</span></p>
                  <ul className="mt-3 space-y-2 text-xs text-gray-600">
                    <li className="flex items-center gap-2">✓ Full custom Next.js site development</li>
                    <li className="flex items-center gap-2">✓ Migration off legacy WordPress infrastructure</li>
                    <li className="flex items-center gap-2">✓ Bang Desktop IDE &amp; sovereign client harness</li>
                    <li className="flex items-center gap-2">✓ 1 Full Year highest-tier Pipes sovereign access</li>
                  </ul>
                </div>

                <div className="p-5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Ongoing Care &amp; Maintenance</p>
                  <p className="text-2xl font-serif font-bold text-[#111827]">$249 <span className="text-xs font-sans font-normal text-gray-500">/ month</span></p>
                  <ul className="mt-3 space-y-2 text-xs text-gray-600">
                    <li className="flex items-center gap-2">✓ Zero-downtime serverless hosting included</li>
                    <li className="flex items-center gap-2">✓ Continuous automated GitHub deployments</li>
                    <li className="flex items-center gap-2">✓ Direct curator support &amp; priority code review</li>
                    <li className="flex items-center gap-2">✓ No random plugin breaks or security panics</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <a
                  href="mailto:kyle@colonhyphenbrackets.com?subject=Inquiry%20Regarding%20Business%20CMS%20Migration"
                  className="w-full sm:w-auto px-6 py-3 bg-[#FF1777] hover:bg-pink-700 text-white font-bold rounded-lg text-xs text-center transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  Schedule Agency Implementation Call
                </a>
                <a
                  href="/desktop/bang"
                  className="w-full sm:w-auto px-6 py-3 bg-[#FAF8F5] border border-[#E2DBD0] hover:bg-[#EAE6DF] text-[#111827] font-bold rounded-lg text-xs text-center transition-colors flex items-center justify-center gap-2"
                >
                  Configure Local Client Harness in Bang
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VOICE MEMOS */}
        {activeTab === "voice" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-[#F4F0E8] border border-[#E2DBD0] rounded-xl p-8 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-[#EAE6DF] border border-[#D4CFC4] flex items-center justify-center mb-4">
                <Radio className="w-5 h-5 text-[#FF1777]" />
              </div>
              <h2 className="text-xl font-serif font-bold text-[#111827] mb-2">
                On-Device Speech-to-Text &amp; Voice Drops
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed mb-6">
                Capture thoughts on the go via WhatsApp voice memos or iPhone Voice Memos. AirDrop or save them to your local voice drop folder—the sovereign node transcribes and polishes them with zero cloud fees.
              </p>

              <div className="p-6 bg-[#FAF8F5] border border-dashed border-[#D4CFC4] rounded-xl text-center">
                <p className="text-xs font-bold text-gray-700 mb-1">Native OS Speech Engine Active</p>
                <p className="text-[11px] text-gray-500 mb-4">
                  Using Apple Speech Framework on macOS / Windows Voice Typing on Windows.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F4F0E8] border border-[#E2DBD0] text-xs font-mono text-gray-700">
                  ~/Desktop/Pipes Voice Drop
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CURATION AUDIT */}
        {activeTab === "audit" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-[#F4F0E8] border border-[#E2DBD0] rounded-xl p-8 shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-[#EAE6DF] border border-[#D4CFC4] flex items-center justify-center mb-4">
                <FileCheck className="w-5 h-5 text-[#FF1777]" />
              </div>
              <h2 className="text-xl font-serif font-bold text-[#111827] mb-2">
                Local Curation &amp; Epistemic Audit
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed mb-6">
                Semi scans your staged drafts to verify source links, ensure clean Markdown syntax, and check alignment with community guidelines before cryptographic signing.
              </p>

              <button className="px-5 py-2.5 rounded-lg bg-[#FF1777] text-white text-xs font-bold hover:bg-pink-700 transition-colors shadow-sm flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5" />
                Run Curation Audit on Staged Files
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
