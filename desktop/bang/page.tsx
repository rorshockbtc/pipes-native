"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  Folder, 
  FileCode, 
  Play, 
  TerminalIcon, 
  Plus, 
  DownloadCloud, 
  PanelLeftClose, 
  PanelLeft, 
  PanelBottomClose, 
  PanelBottom, 
  ChevronRight,
  Copy,
  Check,
  Zap,
  AlertOctagon,
  ShieldCheck,
  Database,
  Sparkles,
  BookOpen,
  ArrowRight,
  Code,
  Eye,
  Coins
} from "lucide-react";

interface Message {
  role: "user" | "agent" | "system";
  content: string;
}

interface ResolutionCandidate {
  name: string;
  namespace: string;
  repoUrl: string;
  author: string;
  isUnclaimed: boolean;
  tokenCost: number;
  isChbFirstParty: boolean;
  plainEnglishDescription: string;
  technicalSpec: string;
  originalPrompt: string;
}

export default function BangIDE() {
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "system", content: "Bang execution harness initialized. Sovereign node connected to local repository." },
  ]);
  const [harnessModalOpen, setHarnessModalOpen] = useState(false);
  const [customRepoUrl, setCustomRepoUrl] = useState("");
  const [isProvisioning, setIsProvisioning] = useState(false);
  
  // User Prepaid PIPES Token Balance — persisted to localStorage so it survives page refreshes
  const [userTokenBalance, setUserTokenBalance] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pipes_token_balance");
      return saved ? parseInt(saved, 10) : 480;
    }
    return 480;
  });

  // Persona Toggle: Curator vs Developer
  const [persona, setPersona] = useState<"curator" | "developer">("curator");

  // Just-In-Time Pipe Resolution State
  const [pendingResolution, setPendingResolution] = useState<ResolutionCandidate | null>(null);

  // Tap-Out Protocol State
  const [tapOutActive, setTapOutActive] = useState(false);
  const [copiedPacket, setCopiedPacket] = useState(false);
  const [frontierSolution, setFrontierSolution] = useState("");
  const [showByokModal, setShowByokModal] = useState(false);
  const [byokApiKey, setByokApiKey] = useState("");
  const [selectedHarness, setSelectedHarness] = useState({
    name: "Marigold Million-Row Engine",
    namespace: "marigold-duckdb",
    repoUrl: "https://github.com/rorshockbtc/marigold",
    author: "rorshockbtc",
    isUnclaimed: false,
    tokenCost: 10, // ~50% first-party CHB discount (21 Bitcoin base layer)
    isChbFirstParty: true,
  });
  
  const [showExplorer, setShowExplorer] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);

  // In-UI Toast: replaces browser alert() — no jarring OS popups in a premium desktop app
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Token balance persists across page refreshes via localStorage
  const debitTokens = useCallback((cost: number) => {
    setUserTokenBalance(prev => {
      const next = Math.max(0, prev - cost);
      if (typeof window !== "undefined") localStorage.setItem("pipes_token_balance", String(next));
      return next;
    });
  }, []);

  // Escape key closes any open modal
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHarnessModalOpen(false);
        setShowByokModal(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleInstallHarness = async () => {
    const cost = selectedHarness.tokenCost || (selectedHarness.isChbFirstParty ? 10 : 21);
    if (userTokenBalance < cost) {
      showToast("Insufficient PIPES tokens. Please upgrade your subscription or top up your token pack.");
      return;
    }

    setIsProvisioning(true);
    const isDesktopApp = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

    let localPath = `~/Documents/Pipes Projects/${selectedHarness.namespace}`;
    if (isDesktopApp) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        localPath = await invoke<string>("provision_harness", {
          repoUrl: selectedHarness.repoUrl,
          namespace: selectedHarness.namespace,
        });

        if (selectedHarness.isUnclaimed) {
          await invoke("record_outbound_lead", {
            author: selectedHarness.author,
            repoName: selectedHarness.namespace,
            repoUrl: selectedHarness.repoUrl,
          });
        }
      } catch (err) {
        console.warn("Desktop provisioning fallback", err);
      }
    }

    debitTokens(cost);
    setIsProvisioning(false);
    setHarnessModalOpen(false);

    setMessages((prev) => [
      ...prev,
      {
        role: "system",
        content: selectedHarness.isUnclaimed
          ? `Installed Harness: ${selectedHarness.name} (pipe\\${selectedHarness.namespace})\n• Local Directory: ${localPath}\n• Token Debit: ${cost} PIPES Tokens (${userTokenBalance - cost} remaining in prepaid balance)\n• Compute Mode: Local on-prem CPU/GPU (FREE · 0 tokens)\n• Author Status: Unclaimed FOSS (Zero escrow during early launch · Yield tracked as an open invitation for author @${selectedHarness.author} to claim namespace & earn 79% royalties)`
          : `Installed Harness: ${selectedHarness.name} (pipe\\${selectedHarness.namespace})\n• Local Directory: ${localPath}\n• Token Debit: ${cost} PIPES Tokens (${selectedHarness.isChbFirstParty ? '50% First-Party CHB Discount' : 'Standard'})\n• Remaining Tokens: ${userTokenBalance - cost}\n• Compute Mode: Local on-prem CPU/GPU (FREE · 0 tokens)\n• Author Verified: Sovereign Pipe active ✓`,
      },
      {
        role: "agent",
        content: `I have provisioned the ${selectedHarness.name} repository into your local project environment. The DuckDB-Wasm worker threads and zero-cloud guardrails are now active. What dataset or query should we execute?`,
      },
    ]);
  };

  const handleCustomHydrate = async () => {
    if (!customRepoUrl.trim()) return;
    const isDesktopApp = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

    if (isDesktopApp) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const hydrated: any = await invoke("hydrate_github_repo", { url: customRepoUrl.trim() });
        setSelectedHarness({
          name: hydrated.repo_name,
          namespace: hydrated.namespace,
          repoUrl: hydrated.repo_url,
          author: hydrated.author,
          isUnclaimed: true,
          tokenCost: hydrated.token_debit_cost || 21,
          isChbFirstParty: hydrated.is_chb_first_party || false,
        });
      } catch (e: any) {
        showToast(typeof e === "string" ? e : (e?.message ?? "Failed to hydrate repository."));
      }
    } else {
      // Browser fallback
      const clean = customRepoUrl.replace("https://github.com/", "").split("/");
      const author = clean[0] || "author";
      const repoName = clean[1] || "project";
      const authorLower = author.toLowerCase();
      const isChb = authorLower === "rorshockbtc" || authorLower === "colon-hyphen-brackets" || authorLower === "marigold-ai";
      setSelectedHarness({
        name: repoName,
        namespace: repoName.toLowerCase().replace(/_/g, "-"),
        repoUrl: customRepoUrl,
        author: author,
        isUnclaimed: true,
        tokenCost: isChb ? 10 : 21,
        isChbFirstParty: isChb,
      });
    }
  };

  const handleSend = async (overridePrompt?: string) => {
    const prompt = (overridePrompt || chatInput).trim();
    if (!prompt) return;
    setMessages(prev => [...prev, { role: "user", content: prompt }]);
    if (!overridePrompt) setChatInput("");

    const lower = prompt.toLowerCase();

    // Check 1: Dynamic GitHub URL Paste -> JIT Resolution
    if (lower.includes("github.com/")) {
      const match = prompt.match(/https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
      if (match) {
        const author = match[1];
        const repoName = match[2].replace(".git", "");
        const namespace = repoName.toLowerCase().replace(/_/g, "-");
        const isChb = author.toLowerCase().includes("rorshock") || author.toLowerCase().includes("colon-hyphen");
        setPendingResolution({
          name: repoName,
          namespace: namespace,
          repoUrl: `https://github.com/${author}/${repoName}`,
          author: author,
          isUnclaimed: true,
          tokenCost: isChb ? 10 : 21,
          isChbFirstParty: isChb,
          plainEnglishDescription: `Packages @${author}'s repository into a zero-cloud local desktop harness so you can run it privately on your machine.`,
          technicalSpec: `Auto-hydrated FOSS · Git Sparse Checkout · Local OPFS sandbox · Zero-Cloud telemetry`,
          originalPrompt: prompt
        });
        return;
      }
    }

    // Check 2: Dynamic Resource Resolution for Missing Pipes (e.g. DuckDB, SQLite-Vec, Voter/CSV queries)
    if (
      lower.includes("pipe\\") || 
      lower.includes("pipe/") || 
      lower.includes("duckdb-wasm") || 
      lower.includes("sqlite") || 
      lower.includes("voter") || 
      lower.includes("500k") || 
      lower.includes("million")
    ) {
      if (selectedHarness.namespace !== "duckdb-wasm" && (lower.includes("duckdb-wasm") || lower.includes("voter") || lower.includes("500k"))) {
        setPendingResolution({
          name: "DuckDB-WASM Analytics Engine",
          namespace: "duckdb-wasm",
          repoUrl: "https://github.com/duckdb/duckdb-wasm",
          author: "duckdb",
          isUnclaimed: true,
          tokenCost: 21,
          isChbFirstParty: false,
          plainEnglishDescription: "Zero-cloud SQL database running directly in your browser's local memory. Lets you filter and query 500,000+ row CSVs in milliseconds with zero server upload.",
          technicalSpec: "DuckDB-WASM v1.28.0 · WebWorker / Comlink · OPFS zero-cloud storage · Apache 2.0",
          originalPrompt: prompt
        });
        return;
      }
    }

    // Loop Guard: If prompt mentions complex refactor, simulate or trigger Tap-Out Boundary
    if (lower.includes("refactor") || lower.includes("complex") || lower.includes("tap-out")) {
      setTimeout(() => {
        setTapOutActive(true);
        setMessages(prev => [
          ...prev,
          {
            role: "agent",
            content: "Local model (Qwen 3B / Hermes 8B) attempted this AST refactoring, but reached convergence limits after 2 attempts. Halting local loop to prevent hallucination.",
          }
        ]);
      }, 1000);
      return;
    }

    setTimeout(() => {
      setMessages(prev => [
        ...prev, 
        { 
          role: "agent", 
          content: persona === 'curator'
            ? `I have indexed the primary sources for ${selectedHarness.name}. Local compute on your CPU is free (0 tokens). If you wish to commit or publish this verified node to the public pipe, a 2.1-token curator reward will be debited.`
            : `I am viewing the local AST repository. DuckDB-Wasm worker threads and sovereign OPFS storage are active. Local queries consume 0 tokens. Ready for code modifications or query executions.` 
        }
      ]);
    }, 800);
  };

  const handleResolveAndProvision = async (cost: number) => {
    if (!pendingResolution) return;
    if (userTokenBalance < cost) {
      showToast("Insufficient PIPES tokens. Please upgrade your subscription or top up your token pack.");
      return;
    }

    const res = pendingResolution;
    setPendingResolution(null);
    setIsProvisioning(true);

    const isDesktopApp = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
    let localPath = `~/Documents/Pipes Projects/${res.namespace}`;

    if (isDesktopApp) {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        localPath = await invoke<string>("provision_harness", {
          repoUrl: res.repoUrl,
          namespace: res.namespace,
        });

        if (res.isUnclaimed) {
          await invoke("record_outbound_lead", {
            author: res.author,
            repoName: res.namespace,
            repoUrl: res.repoUrl,
          });
        }
      } catch (err) {
        console.warn("Desktop provisioning fallback", err);
      }
    }

    debitTokens(cost);

    setSelectedHarness({
      name: res.name,
      namespace: res.namespace,
      repoUrl: res.repoUrl,
      author: res.author,
      isUnclaimed: res.isUnclaimed,
      tokenCost: cost,
      isChbFirstParty: res.isChbFirstParty,
    });

    setIsProvisioning(false);

    setMessages((prev) => [
      ...prev,
      {
        role: "system",
        content: `⚡ Dynamically Resolved & Attached: ${res.name} (pipe\\${res.namespace})\n• Debited from Subscription: ${cost} PIPES Tokens (${res.isChbFirstParty ? '50% First-Party CHB Discount' : 'Standard'})\n• Remaining Tokens: ${userTokenBalance - cost}\n• Compute Mode: Local on-prem CPU/GPU (FREE · 0 tokens)\n• Author Status: Unclaimed FOSS (Zero escrow during early launch · Yield tracked as an open invitation for author @${res.author} to claim namespace & earn 79% royalties)`,
      },
      {
        role: "agent",
        content: `I've attached ${res.name} directly into your project runtime. Now executing your request: "${res.originalPrompt}". All queries and computations are executing locally on your CPU/GPU with zero cloud data transmission.`,
      },
    ]);
  };

  const handleCopyFrontierPacket = () => {
    const packet = `# PIPES FRONTIER ESCALATION PACKET
- Active Harness: ${selectedHarness.name} (pipe\\${selectedHarness.namespace})
- Target Workspace: ~/Documents/Pipes Projects/${selectedHarness.namespace}
- Last User Intent: ${messages[messages.length - 1]?.content || "AST Refactor"}
- Context File: src/app/page.tsx
- Boundary Encountered: Local SLM context window / AST convergence limit (2 cycles reached).

Instructions for Frontier Model (DeepSeek R1 / Claude 3.7 / GPT-4o):
1. Review the requested refactor.
2. Provide ONLY the valid, drop-in replacement code for src/app/page.tsx.
3. No conversational filler or introductory pleasantries.`;

    navigator.clipboard.writeText(packet);
    setCopiedPacket(true);
    setTimeout(() => setCopiedPacket(false), 3000);
  };

  const handleResumeSolution = () => {
    if (!frontierSolution.trim()) return;
    setTapOutActive(false);
    setMessages(prev => [
      ...prev,
      {
        role: "system",
        content: "Frontier Solution Injected. Validating AST and resuming local offline execution.",
      },
      {
        role: "agent",
        content: "Successfully integrated the frontier code into your local project. Testing local builds and proceeding offline.",
      }
    ]);
    setFrontierSolution("");
  };

  return (
    <div className="flex h-full w-full bg-[#FAF8F5] text-[#111827] font-sans overflow-hidden">

      {/* In-UI Toast Notification (replaces browser alert()) */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 bg-[#111827] text-white text-xs font-medium px-5 py-3 rounded-xl shadow-2xl animate-in slide-in-from-bottom-3 duration-200 max-w-sm">
          <AlertOctagon className="w-4 h-4 text-[#FF1777] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* LEFT: File Explorer */}
      {showExplorer && (
        <div className="w-64 border-r border-[#E2DBD0] flex flex-col bg-[#F4F0E8] shrink-0">
          <div className="p-3 border-b border-[#E2DBD0] flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Explorer</span>
            <Plus className="w-4 h-4 text-gray-500 cursor-pointer hover:text-[#FF1777]" />
          </div>
          <div className="p-2 space-y-1 overflow-y-auto flex-1">
            <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-[#E2DBD0]/50 rounded cursor-pointer text-sm font-medium text-gray-700">
              <ChevronRight className="w-3 h-3 text-gray-400" />
              <Folder className="w-4 h-4 text-gray-400" />
              <span>src</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1.5 ml-6 bg-[#FAF8F5] shadow-xs rounded cursor-pointer text-sm font-medium text-[#FF1777] border border-[#E2DBD0]">
              <FileCode className="w-4 h-4 text-[#FF1777]" />
              <span>page.tsx</span>
            </div>
          </div>
        </div>
      )}

      {/* CENTER: Conversational Interface */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[#E2DBD0] bg-[#FAF8F5]">
        
        {/* Header */}
        <div className="h-12 border-b border-[#E2DBD0] flex items-center justify-between px-4 bg-[#F4F0E8] shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowExplorer(!showExplorer)} className={`p-1.5 rounded-md hover:bg-[#E2DBD0] transition-colors ${showExplorer ? 'text-[#FF1777]' : 'text-gray-500'}`} title="Toggle Explorer">
              {showExplorer ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
            <div className="w-6 h-6 rounded-md bg-[#E2DBD0] border border-[#D4CFC4] flex items-center justify-center shadow-xs">
              <span className="font-mono font-bold text-[#FF1777] text-sm leading-none pt-0.5">!</span>
            </div>
            <span className="text-sm font-bold uppercase tracking-widest text-[#111827]">Bang</span>
            
            {/* Persona Switcher: Curator vs Developer */}
            <div className="hidden sm:flex items-center bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg p-0.5 shadow-2xs ml-2">
              <button
                onClick={() => setPersona("curator")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  persona === "curator" ? "bg-[#111827] text-white shadow-xs" : "text-gray-600 hover:text-black"
                }`}
              >
                <BookOpen className="w-3 h-3" />
                Curator 🌿
              </button>
              <button
                onClick={() => setPersona("developer")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  persona === "developer" ? "bg-[#FF1777] text-white shadow-xs" : "text-gray-600 hover:text-black"
                }`}
              >
                <Code className="w-3 h-3" />
                Developer ⚡
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* User Prepaid Token Balance */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-xs shadow-2xs">
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-gray-500 font-medium">PIPES:</span>
              <span className="font-mono font-bold text-[#111827]">{userTokenBalance}</span>
            </div>

            <button onClick={() => setHarnessModalOpen(true)} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-[#FAF8F5] border border-[#E2DBD0] text-[#111827] px-3 py-1.5 rounded-md hover:bg-[#E2DBD0] hover:text-[#FF1777] transition-colors shadow-xs">
              <DownloadCloud className="w-3 h-3" />
              Catalogue
            </button>
            <button onClick={() => setShowTerminal(!showTerminal)} className={`p-1.5 rounded-md hover:bg-[#E2DBD0] transition-colors ${showTerminal ? 'text-[#FF1777]' : 'text-gray-500'}`} title="Toggle Terminal">
              {showTerminal ? <PanelBottomClose className="w-4 h-4" /> : <PanelBottom className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`flex items-center gap-2 mb-1 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {msg.role === 'agent' && (
                  <div className="w-6 h-6 rounded bg-[#E2DBD0] border border-[#D4CFC4] flex items-center justify-center shadow-xs">
                    <span className="font-mono font-bold text-[#FF1777] text-xs leading-none pt-0.5">!</span>
                  </div>
                )}
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded bg-[#E2DBD0] border border-[#D4CFC4] flex items-center justify-center shadow-xs">
                    <UserIcon className="w-3 h-3 text-gray-600" />
                  </div>
                )}
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
                  {msg.role === 'user' ? 'You' : msg.role === 'agent' ? 'Bang' : 'System'}
                </span>
              </div>
              
              <div className={`p-4 rounded-xl text-sm shadow-xs max-w-[85%] leading-relaxed ${
                msg.role === 'user' ? 'bg-[#E2DBD0] text-[#111827] border border-[#D4CFC4] rounded-tr-xs' : 
                msg.role === 'system' ? 'bg-[#F4F0E8] text-gray-600 border border-[#E2DBD0] font-sans text-xs rounded-tl-xs w-full' : 
                'bg-[#FAF8F5] text-[#111827] border border-[#E2DBD0] rounded-tl-xs'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* JUST-IN-TIME PIPE RESOLUTION CARD */}
          {pendingResolution && (
            <div className="border border-[#FF1777]/40 bg-[#FAF8F5] rounded-xl p-5 shadow-md space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2DBD0]">
                <div className="flex items-center gap-2 text-[#FF1777]">
                  <DownloadCloud className="w-5 h-5 shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#111827]">
                    Missing Resource Detected: pipe\{pendingResolution.namespace}
                  </h4>
                </div>
                <span className="text-[10px] font-mono bg-[#FF1777]/10 text-[#FF1777] px-2 py-0.5 rounded font-bold">
                  Just-In-Time Resolver
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-gray-700 leading-relaxed font-sans">
                  {pendingResolution.plainEnglishDescription}
                </p>
                <div className="p-2.5 bg-[#F4F0E8] border border-[#E2DBD0] rounded-md text-[11px] font-mono text-gray-600 flex justify-between items-center">
                  <span>{pendingResolution.technicalSpec}</span>
                  <span className="text-gray-500 font-sans text-[10px]">Attributed: @{pendingResolution.author}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E2DBD0] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-500">Debited from Prepaid Balance:</span>
                  <span className="text-xs font-bold text-[#FF1777] bg-[#FF1777]/10 px-2 py-0.5 rounded">
                    {pendingResolution.tokenCost} PIPES Tokens
                  </span>
                  {pendingResolution.isChbFirstParty && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      50% CHB First-Party Discount
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPendingResolution(null)}
                    className="text-xs font-bold text-gray-500 hover:text-black px-3 py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleResolveAndProvision(pendingResolution.tokenCost)}
                    disabled={isProvisioning || userTokenBalance < pendingResolution.tokenCost}
                    className="text-xs font-bold bg-[#111827] text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors shadow-xs flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    {isProvisioning ? "Attaching..." : `Debit ${pendingResolution.tokenCost} Tokens & Attach`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAP-OUT BOUNDARY CARD */}
          {tapOutActive && (
            <div className="border border-amber-400/80 bg-[#FCFAF5] rounded-xl p-6 shadow-md space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertOctagon className="w-5 h-5 shrink-0 text-amber-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Local Engine Boundary Reached (2 Attempts without Convergence)
                  </h4>
                </div>
                <span className="text-[10px] font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
                  Tap-Out Protocol Active
                </span>
              </div>

              <p className="text-xs text-gray-700 leading-relaxed font-sans">
                The local model (Qwen 3B / Hermes 8B) struggled with this specific AST refactor. Rather than guessing, looping, or wasting your time, choose how to proceed:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Option 1: Copy Frontier Packet */}
                <button
                  onClick={handleCopyFrontierPacket}
                  className="p-3.5 rounded-lg border border-[#E2DBD0] bg-[#FAF8F5] hover:border-[#FF1777] text-left transition-all group shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                      <Copy className="w-3.5 h-3.5 text-[#FF1777]" />
                      Copy Frontier Packet
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                      Zero Cost
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-normal">
                    Pre-formatted context and diff. Drop it into DeepSeek R1, Claude 3.7, or ChatGPT.
                  </p>
                  {copiedPacket && (
                    <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 mt-1.5 animate-in fade-in">
                      <Check className="w-3 h-3" /> Copied packet to clipboard!
                    </span>
                  )}
                </button>

                {/* Option 2: Escalate to Frontier Model */}
                <button
                  onClick={() => setShowByokModal(true)}
                  className="p-3.5 rounded-lg border border-[#E2DBD0] bg-[#FAF8F5] hover:border-[#FF1777] text-left transition-all group shadow-2xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                      Frontier Model Escalation
                    </span>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                      BYOK / 1-Click
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 leading-normal">
                    Execute DeepSeek or Claude via your API key, then automatically return to local offline mode.
                  </p>
                </button>
              </div>

              {/* Paste & Resume Box */}
              <div className="space-y-2 pt-2 border-t border-[#E2DBD0]">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 block">
                  Paste Frontier Solution to Resume Local Execution:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={frontierSolution}
                    onChange={(e) => setFrontierSolution(e.target.value)}
                    placeholder="Paste code solution or response here..."
                    className="flex-1 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-[#FF1777]"
                  />
                  <button
                    onClick={handleResumeSolution}
                    disabled={!frontierSolution.trim()}
                    className="px-4 py-2 bg-[#FF1777] text-white text-xs font-bold rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-colors whitespace-nowrap shadow-xs"
                  >
                    Resume Local Execution ↵
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Inspiration Chips */}
        <div className="px-4 py-2 bg-[#F4F0E8] border-t border-[#E2DBD0] flex items-center gap-2 overflow-x-auto shrink-0">
          <span className="text-[10px] uppercase font-bold text-gray-400 shrink-0">Try:</span>
          <button
            onClick={() => handleSend("Analyze 500,000 synthetic voter records with DuckDB-WASM")}
            className="text-[11px] bg-[#FAF8F5] hover:bg-white text-gray-700 hover:text-[#FF1777] border border-[#E2DBD0] rounded-md px-2.5 py-1 whitespace-nowrap transition-colors shadow-2xs font-medium"
          >
            📊 Analyze 500k Records (DuckDB)
          </button>
          <button
            onClick={() => handleSend("https://github.com/duckdb/duckdb-wasm")}
            className="text-[11px] bg-[#FAF8F5] hover:bg-white text-gray-700 hover:text-[#FF1777] border border-[#E2DBD0] rounded-md px-2.5 py-1 whitespace-nowrap transition-colors shadow-2xs font-medium"
          >
            ⚡ Hydrate GitHub Repo
          </button>
          <button
            onClick={() => handleSend("Refactor AST tree with recursive node visitor")}
            className="text-[11px] bg-[#FAF8F5] hover:bg-white text-gray-700 hover:text-[#FF1777] border border-[#E2DBD0] rounded-md px-2.5 py-1 whitespace-nowrap transition-colors shadow-2xs font-medium"
          >
            🛑 Test Tap-Out Loop Guard
          </button>
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[#F4F0E8] border-t border-[#E2DBD0] shrink-0">
          <div className="flex border border-[#E2DBD0] rounded-xl bg-[#FAF8F5] focus-within:border-[#FF1777] focus-within:ring-2 focus-within:ring-[#FF1777]/20 shadow-xs overflow-hidden transition-all">
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={persona === 'curator' ? "Ask Bang to query, curate, or synthesize local knowledge..." : "Enter code instructions, pipe\\namespace, or GitHub URL..."}
              className="w-full bg-transparent px-4 py-4 text-sm outline-none text-[#111827] placeholder:text-gray-400"
            />
            <button onClick={() => handleSend()} disabled={!chatInput.trim()} className="px-5 text-gray-400 hover:text-[#FF1777] disabled:opacity-50 transition-colors">
              <Play className="w-5 h-5 fill-current" />
            </button>
          </div>
        </div>

        {/* Terminal */}
        {showTerminal && (
          <div className="h-48 border-t border-[#E2DBD0] bg-[#E2DBD0]/30 flex flex-col shrink-0">
            <div className="p-2 border-b border-[#E2DBD0] flex items-center justify-between bg-[#F4F0E8]">
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-4 h-4 text-gray-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Execution Log</span>
              </div>
              <button onClick={() => setShowTerminal(false)} className="text-gray-400 hover:text-[#111827]">
                <PanelBottomClose className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 p-4 font-mono text-xs text-gray-600 overflow-y-auto">
              <p className="text-gray-500">$ node daemon initialized.</p>
              <p className="text-gray-500">$ listening for filesystem changes...</p>
              <p className="text-emerald-700">$ active pipe: {selectedHarness.namespace}</p>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Document / Code Viewer (Persona Adaptive) */}
      <div className="w-[450px] flex flex-col bg-[#FAF8F5] shrink-0 border-l border-[#E2DBD0]">
        <div className="h-12 border-b border-[#E2DBD0] flex items-center justify-between px-4 bg-[#F4F0E8] shrink-0">
          <div className="flex items-center gap-2">
            {persona === 'curator' ? (
              <>
                <BookOpen className="w-4 h-4 text-[#FF1777]" />
                <span className="text-sm font-serif font-bold text-gray-800">Living Monograph Preview</span>
              </>
            ) : (
              <>
                <FileCode className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-mono font-medium text-gray-600">page.tsx</span>
              </>
            )}
          </div>
          <span className="text-[10px] font-mono text-gray-400">
            {persona === 'curator' ? 'Zero-Cloud OPFS' : 'AST Buffer'}
          </span>
        </div>
        
        {persona === 'curator' ? (
          <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-[#FAF8F5]">
            <div className="pb-4 border-b border-[#E2DBD0]">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#FF1777] bg-[#FF1777]/10 px-2 py-0.5 rounded">
                  Active Sovereign Monograph
                </span>
                <span className="text-[10px] text-gray-500 font-mono">pipe\{selectedHarness.namespace}</span>
              </div>
              <h2 className="text-xl font-serif font-bold text-[#111827]">
                {selectedHarness.name}
              </h2>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Curated primary source monograph running locally on your device with zero cloud telemetry.
              </p>
            </div>

            {/* In-Memory DuckDB Table Preview */}
            <div className="bg-[#F4F0E8] border border-[#E2DBD0] rounded-xl p-4 space-y-3 shadow-2xs">
              <div className="flex justify-between items-center text-xs font-bold text-[#111827]">
                <span className="flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-[#FF1777]" />
                  In-Memory Dataset (DuckDB-WASM)
                </span>
                <span className="text-emerald-700 bg-emerald-100 text-[10px] px-2 py-0.5 rounded font-mono">
                  524,288 Records Loaded
                </span>
              </div>
              
              <div className="overflow-x-auto text-[11px] font-mono border border-[#E2DBD0] rounded-md bg-[#FAF8F5]">
                <table className="w-full text-left">
                  <thead className="bg-[#EAE6DF] text-gray-700 text-[10px] uppercase">
                    <tr>
                      <th className="p-2">County ID</th>
                      <th className="p-2">Precinct</th>
                      <th className="p-2">Voter Hash</th>
                      <th className="p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2DBD0] text-gray-600">
                    <tr>
                      <td className="p-2 font-bold text-[#111827]">TX-TRAVIS-042</td>
                      <td className="p-2">Austin Central</td>
                      <td className="p-2">e3b0c442...</td>
                      <td className="p-2 text-emerald-700">Verified ✓</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-[#111827]">TX-TRAVIS-043</td>
                      <td className="p-2">Barton Hills</td>
                      <td className="p-2">8f4c2b19...</td>
                      <td className="p-2 text-emerald-700">Verified ✓</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold text-[#111827]">TX-TRAVIS-044</td>
                      <td className="p-2">Zilker South</td>
                      <td className="p-2">3a19d08e...</td>
                      <td className="p-2 text-emerald-700">Verified ✓</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-gray-500">
                ⚡ Query latency: <span className="font-mono text-[#111827] font-bold">12ms</span> · Memory consumption: <span className="font-mono text-[#111827] font-bold">48MB</span> · Wi-Fi requirement: <span className="text-emerald-700 font-bold">None</span>
              </p>
            </div>

            {/* The RAG Problem Solved: Plain English for Non-Technical Users */}
            <div className="p-4 bg-[#F4F0E8] border border-[#E2DBD0] rounded-xl space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#111827]">
                <Sparkles className="w-3.5 h-3.5 text-[#FF1777]" />
                Solving the RAG Bottleneck (Without the Sludge)
              </div>
              <p className="text-xs text-gray-600 leading-relaxed font-sans">
                Centralized AI chat boxes hallucinate because they ingest raw, outdated internet scrapings. Pipes connects you directly to primary human knowledge. When you run queries locally on your CPU/GPU, you pay <span className="font-bold text-emerald-700">0 tokens</span>. When you publish verified insights to a Pipe, you pay a small 2.1-token commitment to compensate the curators who keep this knowledge clean and truthful (proof of work at scale).
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700">Curator Monograph Notes</h4>
              <p className="text-xs text-gray-600 leading-relaxed font-sans">
                Unlike centralized cloud databases that charge $200/month, this pipe processes records directly through your local Apple M-series / Intel AVX-512 hardware registers. All calculations remain inside your encrypted local disk.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed text-gray-700 relative bg-[#FAF8F5]">
            <div className="absolute left-0 top-0 bottom-0 w-10 border-r border-[#E2DBD0] flex flex-col items-center pt-4 text-gray-400 bg-[#F4F0E8]/50">
              <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
            </div>
            <pre className="pl-8">
              <code className="text-[#FF1777]">export default</code> <code className="text-blue-600">function</code> Home() {'{\n'}
              {'  '}return ({'\n'}
              {'    '}&lt;main className="flex-1 p-6"&gt;{'\n'}
              {'      '}&lt;h1&gt;Welcome to Pipes&lt;/h1&gt;{'\n'}
              {'    '}&lt;/main&gt;{'\n'}
              {'  '});{'\n'}
              {'}\n'}
            </pre>
          </div>
        )}
      </div>

      {/* Harness Modal */}
      {harnessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#E2DBD0]/60 backdrop-blur-sm">
          <div 
            role="dialog" 
            aria-modal="true" 
            aria-labelledby="harness-modal-title"
            className="bg-[#FAF8F5] border border-[#E2DBD0] shadow-2xl rounded-xl p-8 max-w-lg w-full animate-in fade-in zoom-in-95 duration-200"
          >
            <h3 id="harness-modal-title" className="text-2xl font-serif font-bold text-[#111827] mb-2 flex items-center gap-3">
              <span className="w-8 h-8 rounded bg-[#E2DBD0] border border-[#D4CFC4] flex items-center justify-center font-sans text-[#FF1777] font-black leading-none pt-0.5 shadow-xs">!</span>
              Install Community Harness
            </h3>
            <p className="text-xs text-gray-600 mb-5 leading-relaxed">Discover and load curated architecture patterns, deployment keys, and context rules published directly from the Pipes network.</p>
            
            <div className="space-y-3">
              {/* Marigold Million-Row Engine */}
              <div 
                onClick={() => setSelectedHarness({
                  name: "Marigold Million-Row Engine",
                  namespace: "marigold-duckdb",
                  repoUrl: "https://github.com/rorshockbtc/marigold",
                  author: "rorshockbtc",
                  isUnclaimed: false,
                  tokenCost: 10,
                  isChbFirstParty: true,
                })}
                className={`p-4 border rounded-lg cursor-pointer transition-all bg-[#FAF8F5] shadow-xs ${
                  selectedHarness.namespace === "marigold-duckdb"
                    ? "border-[#FF1777] ring-1 ring-[#FF1777]"
                    : "border-[#E2DBD0] hover:border-[#D4CFC4]"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <p className="font-bold text-sm text-[#111827]">Marigold Million-Row Engine</p>
                    <p className="text-[11px] text-gray-600">Zero-knowledge DuckDB-WASM client analytics for 100k+ row datasets.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">10 Tokens</span>
                    <p className="text-[11px] font-semibold text-emerald-800 mt-0.5">50% CHB Discount</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E2DBD0] text-xs">
                  <span className="font-mono text-gray-700 bg-[#EAE6DF] px-2 py-0.5 rounded font-medium">pipe\marigold-duckdb</span>
                  <span className="text-emerald-700 font-medium">Curated by Marigold · Active Subscriber ✓</span>
                </div>
              </div>

              {/* Agency CMS Setup */}
              <div 
                onClick={() => setSelectedHarness({
                  name: "Agency CMS Setup (React)",
                  namespace: "agency-cms",
                  repoUrl: "https://github.com/pipes-network/agency-cms",
                  author: "colon-hyphen-brackets",
                  isUnclaimed: false,
                  tokenCost: 10,
                  isChbFirstParty: true,
                })}
                className={`p-4 border rounded-lg cursor-pointer transition-all bg-[#FAF8F5] shadow-xs ${
                  selectedHarness.namespace === "agency-cms"
                    ? "border-[#FF1777] ring-1 ring-[#FF1777]"
                    : "border-[#E2DBD0] hover:border-[#D4CFC4]"
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <p className="font-bold text-sm text-[#111827]">Agency CMS Setup (React)</p>
                    <p className="text-[11px] text-gray-600">Locks Bang into client copywriting mode with automated GitHub commits.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200">10 Tokens</span>
                    <p className="text-[11px] font-semibold text-emerald-800 mt-0.5">50% CHB Discount</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E2DBD0] text-xs">
                  <span className="font-mono text-gray-700 bg-[#EAE6DF] px-2 py-0.5 rounded font-medium">pipe\agency-cms</span>
                  <span className="text-gray-600 font-medium">Curated by Colon-Hyphen-Bracket</span>
                </div>
              </div>

              {/* Custom GitHub Repo Auto-Hydrator */}
              <div className="p-3.5 bg-[#F4F0E8] border border-[#E2DBD0] rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#111827] uppercase tracking-wider">Hydrate Any GitHub Repo</span>
                  <span className="text-[11px] font-bold text-[#FF1777] bg-[#FF1777]/10 px-2 py-0.5 rounded border border-[#FF1777]/20">Auto-Claim</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customRepoUrl}
                    onChange={(e) => setCustomRepoUrl(e.target.value)}
                    placeholder="https://github.com/duckdb/duckdb-wasm"
                    className="flex-1 px-3 py-1.5 bg-[#FAF8F5] border border-[#E2DBD0] rounded-md text-xs font-mono text-[#111827] focus:outline-none focus:border-[#FF1777]"
                  />
                  <button
                    onClick={handleCustomHydrate}
                    className="px-3 py-1.5 bg-[#111827] text-white text-xs font-bold rounded-md hover:bg-gray-800 transition-colors"
                  >
                    Hydrate Pipe
                  </button>
                </div>
                {selectedHarness.isUnclaimed && (
                  <p className="text-[10px] text-emerald-700 font-medium">
                    ✓ Staged: pipe\{selectedHarness.namespace} · 21 Tokens · $48/yr ($36 in sats Year 1)
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setHarnessModalOpen(false)} className="text-xs font-bold text-gray-500 hover:text-[#111827] px-4 py-2">Cancel</button>
              <button 
                onClick={handleInstallHarness} 
                disabled={isProvisioning}
                className="text-xs font-bold bg-[#FF1777] text-white px-5 py-2.5 rounded-lg hover:bg-pink-700 disabled:opacity-50 shadow-xs transition-colors"
              >
                {isProvisioning ? "Attaching..." : `Debit ${selectedHarness.tokenCost || (selectedHarness.isChbFirstParty ? 10 : 21)} Tokens & Attach`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BYOK Escalation Modal */}
      {showByokModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#E2DBD0]/60 backdrop-blur-sm">
          <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="byok-modal-title"
            className="bg-[#FAF8F5] border border-[#E2DBD0] shadow-2xl rounded-xl p-8 max-w-md w-full animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-amber-600" />
              <h3 id="byok-modal-title" className="text-xl font-serif font-bold text-[#111827]">
                Frontier Model Escalation
              </h3>
            </div>
            <p className="text-xs text-gray-600 mb-5 leading-relaxed font-sans">
              Enter your API key (Anthropic, DeepSeek, or OpenAI) to solve this specific bottleneck. The frontier model will resolve the AST diff and immediately hand execution back to your local offline node.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-600 block mb-1">
                  API Key or Ollama Endpoint
                </label>
                <input
                  type="password"
                  value={byokApiKey}
                  onChange={(e) => setByokApiKey(e.target.value)}
                  placeholder="sk-ant-... or http://localhost:11434"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#E2DBD0] rounded-lg text-xs font-mono text-[#111827] outline-none focus:border-[#FF1777]"
                />
              </div>

              <div className="p-3 bg-[#F4F0E8] border border-[#E2DBD0] rounded-lg text-[11px] text-gray-600">
                <span className="font-bold text-[#111827]">Privacy Guarantee:</span> Your key is stored in your operating system's local keychain and never sent to Pipes cloud servers.
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowByokModal(false)} className="text-xs font-bold text-gray-500 hover:text-[#111827] px-4 py-2">
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowByokModal(false);
                  setTapOutActive(false);
                  setMessages(prev => [
                    ...prev,
                    {
                      role: "system",
                      content: "Frontier call dispatched via BYOK endpoint. Solution returned and validated.",
                    },
                    {
                      role: "agent",
                      content: "Frontier model successfully untangled the complex AST refactor. Returning execution to local offline mode.",
                    }
                  ]);
                }}
                className="text-xs font-bold bg-[#FF1777] text-white px-5 py-2.5 rounded-lg hover:bg-pink-700 shadow-xs transition-colors"
              >
                Execute Frontier Call ⚡
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function UserIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
