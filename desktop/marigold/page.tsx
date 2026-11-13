'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Database,
  ShieldCheck,
  HardDrive,
  ExternalLink,
  ArrowRight,
  Cpu,
  Layers,
  CheckCircle2,
  FolderSearch,
  Sparkles,
  FileArchive,
} from 'lucide-react';

interface MarigoldNativeCapabilities {
  available: boolean;
  engine: string;
  outOfCoreZipStreaming: boolean;
  wasm32CeilingBypassed: boolean;
  defaultVaultDir: string;
  supportedExtensions: string[];
}

interface MarigoldLocalDatasetItem {
  name: string;
  path: string;
  sizeBytes: number;
  location: string;
  extension: string;
}

interface MarigoldGroupCount {
  value: string;
  count: number;
}

interface MarigoldStreamProfile {
  sourcePath: string;
  entryName: string;
  fileBytes: number;
  sha256: string;
  delimiter: string;
  headers: string[];
  totalRows: number;
  elapsedMs: number;
  groupByColumn: string | null;
  topGroups: MarigoldGroupCount[];
}

interface MarigoldShardItem {
  fileName: string;
  path: string;
  rowCount: number;
  byteSize: number;
  sha256: string;
}

interface MarigoldShardManifest {
  sourcePath: string;
  entryName: string;
  outputDir: string;
  totalRows: number;
  rowsPerShard: number;
  shardCount: number;
  merkleRoot: string;
  elapsedMs: number;
  shards: MarigoldShardItem[];
}

const CIVIC_PIPES = [
  {
    slug: 'marigoldinsights',
    title: 'Marigold Insights Core',
    summary: 'Zero-PII local civic analytics & cryptographic audit framework.',
  },
  {
    slug: 'election-integrity',
    title: 'Election Integrity',
    summary: 'EAC EAVS benchmarks, chain-of-custody verification, and voter roll audits.',
  },
  {
    slug: 'civic-data-benchmarks',
    title: 'Civic Data Benchmarks',
    summary: 'Statewide cross-county baselines built for rapid DuckDB inspection.',
  },
  {
    slug: 'disaster-continuity',
    title: 'Disaster Continuity',
    summary: 'FEMA declarations, county infrastructure resilience, and response continuity.',
  },
  {
    slug: 'public-health-benchmarks',
    title: 'Public Health Benchmarks',
    summary: 'CDC PLACES 2024 county health profiles & HHS hospital desert telemetry.',
  },
  {
    slug: 'fiscal-migration',
    title: 'Fiscal & Migration',
    summary: 'IRS SOI county AGI flows & FDIC branch density across U.S. counties.',
  },
];

function getTauriInvoker(): ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    __TAURI_INTERNALS__?: { invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> };
    __TAURI__?: { core?: { invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> } };
  };
  if (w.__TAURI_INTERNALS__ && typeof w.__TAURI_INTERNALS__.invoke === 'function') {
    return w.__TAURI_INTERNALS__.invoke.bind(w.__TAURI_INTERNALS__);
  }
  if (w.__TAURI__?.core && typeof w.__TAURI__.core.invoke === 'function') {
    return w.__TAURI__.core.invoke.bind(w.__TAURI__.core);
  }
  return null;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export default function MarigoldDesktopStudioPage() {
  const [nativeCaps, setNativeCaps] = useState<MarigoldNativeCapabilities | null>(null);
  const [localDatasets, setLocalDatasets] = useState<MarigoldLocalDatasetItem[]>([]);
  const [datasetPath, setDatasetPath] = useState('~/Downloads/ncvoter_Statewide.zip');
  const [groupByCol, setGroupByCol] = useState('county_desc');
  const [rowsPerShard, setRowsPerShard] = useState(250000);
  const [isBusy, setIsBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [profileResult, setProfileResult] = useState<MarigoldStreamProfile | null>(null);
  const [shardManifest, setShardManifest] = useState<MarigoldShardManifest | null>(null);

  const scanLocalDatasets = async () => {
    const invoke = getTauriInvoker();
    if (!invoke) return;
    try {
      const items = (await invoke('marigold_list_local_datasets')) as MarigoldLocalDatasetItem[];
      if (Array.isArray(items)) {
        setLocalDatasets(items);
        if (items.length > 0 && datasetPath === '~/Downloads/ncvoter_Statewide.zip') {
          setDatasetPath(items[0].path);
        }
      }
    } catch (err) {
      setStatusMessage(String(err));
    }
  };

  useEffect(() => {
    const invoke = getTauriInvoker();
    if (!invoke) return;
    invoke('marigold_native_capabilities')
      .then((caps) => {
        setNativeCaps(caps as MarigoldNativeCapabilities);
        return scanLocalDatasets();
      })
      .catch(() => {
        setNativeCaps(null);
      });
  }, []);

  const handleStreamProfile = async () => {
    const invoke = getTauriInvoker();
    if (!invoke) {
      setStatusMessage('Launch inside Pipes.app Desktop to stream multi-GB files via native Rust IPC.');
      return;
    }
    setIsBusy(true);
    setStatusMessage('Streaming archive in O(1) memory & verifying SHA-256...');
    try {
      const res = (await invoke('marigold_stream_profile_dataset', {
        path: datasetPath,
        delimiter: null,
        groupByCol: groupByCol.trim() || null,
      })) as MarigoldStreamProfile;
      setProfileResult(res);
      setStatusMessage(
        `Streamed ${res.totalRows.toLocaleString()} rows from ${res.entryName} in ${res.elapsedMs}ms.`
      );
    } catch (err) {
      setStatusMessage(`Profile failed: ${String(err)}`);
    } finally {
      setIsBusy(false);
    }
  };

  const handleShardArchive = async () => {
    const invoke = getTauriInvoker();
    if (!invoke) {
      setStatusMessage('Launch inside Pipes.app Desktop to shard 4GB+ archives into ~/Documents/Marigold_Local.');
      return;
    }
    setIsBusy(true);
    setStatusMessage(`Sharding into ${rowsPerShard.toLocaleString()}-row Merkle chunks...`);
    try {
      const manifest = (await invoke('marigold_shard_massive_archive', {
        path: datasetPath,
        rowsPerShard,
        outputSubdir: null,
      })) as MarigoldShardManifest;
      setShardManifest(manifest);
      setStatusMessage(
        `Sharded ${manifest.totalRows.toLocaleString()} rows into ${manifest.shardCount} files (${manifest.elapsedMs}ms).`
      );
      await scanLocalDatasets();
    } catch (err) {
      setStatusMessage(`Sharding failed: ${String(err)}`);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-[#E8E2D5] dark:bg-[#222222] text-[#111827] dark:text-[#F3EFE9] p-6 sm:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="bg-[#FAF8F5] dark:bg-[#192E01] border border-[#111827]/15 dark:border-[#DBECC8]/20 rounded-xl p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F0D4B5] text-[#111827] text-xs font-mono font-bold uppercase tracking-wider">
              <Database className="w-3.5 h-3.5" />
              <span>Marigold Data &amp; Civic Studio</span>
            </div>
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                nativeCaps?.available
                  ? 'bg-[#DBECC8] text-[#192E01] border-[#192E01]/20'
                  : 'bg-[#FFF5C9] text-[#3F3300] border-[#3F3300]/20'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>
                {nativeCaps?.available
                  ? `${nativeCaps.engine} · O(1) Rust Streaming Active`
                  : 'Web Preview · Install Pipes.app for 4GB+ Rust Streaming'}
              </span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-semibold tracking-tight text-[#111827] dark:text-white">
            Sovereign Civic Data &amp; Out-of-Core Audit Module
          </h1>
          <p className="text-sm sm:text-base text-[#111827]/80 dark:text-[#F3EFE9]/85 max-w-3xl leading-relaxed">
            Built directly inside Pipes Desktop so county auditors, journalists, and researchers can inspect multi-gigabyte{' '}
            <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-[#E8E2D5] dark:bg-[#222222]">.zip</code>,{' '}
            <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-[#E8E2D5] dark:bg-[#222222]">.txt</code>, and{' '}
            <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-[#E8E2D5] dark:bg-[#222222]">.csv</code>{' '}
            archives in constant memory—bypassing browser WebAssembly&apos;s 4GB limit with zero cloud uploads.
          </p>

          {!nativeCaps?.available && (
            <div className="bg-[#FFF5C9] text-[#111827] border border-[#3F3300]/25 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#B85C38]" />
                  <span>Unlock Native 4GB+ Archive Sharding in Pipes Desktop</span>
                </div>
                <p className="text-xs text-[#111827]/80 leading-relaxed">
                  You are viewing the web preview of the Marigold module. Open this view inside Pipes.app to stream statewide voter &amp; fiscal archives directly from disk.
                </p>
              </div>
              <Link
                href="/download?module=marigold"
                className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#111827] hover:bg-[#D44983] text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors"
              >
                <span>Download Pipes Desktop</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </header>

        {/* Native Out-of-Core Streaming Workbench */}
        <section className="bg-[#FAF8F5] dark:bg-[#182028] border border-[#111827]/15 dark:border-stone-700 rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#111827]/10 pb-4">
            <div>
              <h2 className="text-xl font-serif font-semibold text-[#111827] dark:text-white flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-[#B85C38]" />
                <span>Out-of-Core Archive Profiler &amp; Merkle Sharder</span>
              </h2>
              <p className="text-xs text-[#111827]/70 dark:text-[#F3EFE9]/75 mt-1">
                Authorized read roots: Downloads, Desktop, Documents, and ~/Documents/Marigold_Local. Writes strictly to ~/Documents/Marigold_Local.
              </p>
            </div>
            {nativeCaps?.available && (
              <button
                type="button"
                onClick={scanLocalDatasets}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#111827]/20 bg-[#F3EFE9] hover:bg-[#E8E2D5] text-[#111827] text-xs font-semibold cursor-pointer"
              >
                <FolderSearch className="w-4 h-4" />
                <span>Rescan Local Files</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <label htmlFor="marigold-dataset-path" className="block text-xs font-mono font-bold uppercase tracking-wider text-[#111827]/80 dark:text-[#F3EFE9]/80 mb-1.5">
                  Archive or Delimited Dataset Path
                </label>
                <input
                  id="marigold-dataset-path"
                  type="text"
                  value={datasetPath}
                  onChange={(e) => setDatasetPath(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#111827]/20 bg-white dark:bg-[#111827] text-sm font-mono text-[#111827] dark:text-white"
                  placeholder="~/Downloads/ncvoter_Statewide.zip"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="marigold-group-col" className="block text-xs font-mono font-bold uppercase tracking-wider text-[#111827]/80 dark:text-[#F3EFE9]/80 mb-1.5">
                    Zero-PII Group-By Column
                  </label>
                  <input
                    id="marigold-group-col"
                    type="text"
                    value={groupByCol}
                    onChange={(e) => setGroupByCol(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#111827]/20 bg-white dark:bg-[#111827] text-sm font-mono text-[#111827] dark:text-white"
                    placeholder="county_desc"
                  />
                </div>
                <div>
                  <label htmlFor="marigold-shard-rows" className="block text-xs font-mono font-bold uppercase tracking-wider text-[#111827]/80 dark:text-[#F3EFE9]/80 mb-1.5">
                    Rows Per Output Shard
                  </label>
                  <select
                    id="marigold-shard-rows"
                    value={rowsPerShard}
                    onChange={(e) => setRowsPerShard(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#111827]/20 bg-white dark:bg-[#111827] text-sm font-mono text-[#111827] dark:text-white"
                  >
                    <option value={100000}>100,000 rows (Fast Browser Mount)</option>
                    <option value={250000}>250,000 rows (Standard Vault)</option>
                    <option value={500000}>500,000 rows (High-Density)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleStreamProfile}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#111827] hover:bg-[#D44983] text-white text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isBusy ? 'Processing Stream...' : 'Stream Zero-PII Profile'}</span>
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleShardArchive}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F0D4B5] hover:bg-[#E5DEC9] text-[#111827] border border-[#111827]/20 text-xs font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Layers className="w-4 h-4" />
                  <span>Shard into ~/Documents/Marigold_Local</span>
                </button>
              </div>

              {statusMessage && (
                <div className="p-3.5 rounded-lg bg-[#FFF5C9] text-[#111827] border border-[#3F3300]/20 text-xs font-mono">
                  {statusMessage}
                </div>
              )}
            </div>

            {/* Detected Local Files */}
            <div className="bg-[#F3EFE9] dark:bg-[#111827] border border-[#111827]/15 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#111827] dark:text-white">
                  Detected Local Archives
                </h3>
                <span className="text-xs font-mono text-[#111827]/70 dark:text-[#F3EFE9]/70">
                  {localDatasets.length} files
                </span>
              </div>
              {localDatasets.length === 0 ? (
                <p className="text-xs text-[#111827]/70 dark:text-[#F3EFE9]/75 leading-relaxed">
                  {nativeCaps?.available
                    ? 'Place .zip, .csv, .tsv, or .txt files in ~/Downloads or ~/Documents/Marigold_Local to quick-select them here.'
                    : 'Local file listing unlocks automatically when running inside Pipes.app Desktop.'}
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {localDatasets.map((item) => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => setDatasetPath(item.path)}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                        datasetPath === item.path
                          ? 'bg-[#FFF5C9] border-[#111827] text-[#111827] font-semibold'
                          : 'bg-white dark:bg-[#182028] border-[#111827]/10 hover:border-[#111827]/40 text-[#111827] dark:text-[#F3EFE9]'
                      }`}
                    >
                      <div className="font-mono truncate flex items-center gap-1.5">
                        <FileArchive className="w-3.5 h-3.5 shrink-0 text-[#B85C38]" />
                        <span className="truncate">{item.name}</span>
                      </div>
                      <div className="text-xs text-[#111827]/65 dark:text-[#F3EFE9]/65 mt-0.5 flex justify-between">
                        <span>{item.location}</span>
                        <span>{formatBytes(item.sizeBytes)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stream Profile Result */}
          {profileResult && (
            <div className="border-t border-[#111827]/10 pt-5 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-[#DBECC8] text-[#192E01]">
                  <div className="text-xs font-mono uppercase">Total Rows</div>
                  <div className="text-lg font-mono font-bold">{profileResult.totalRows.toLocaleString()}</div>
                </div>
                <div className="p-3 rounded-lg bg-[#F3EFE9] text-[#111827]">
                  <div className="text-xs font-mono uppercase">Archive Size</div>
                  <div className="text-lg font-mono font-bold">{formatBytes(profileResult.fileBytes)}</div>
                </div>
                <div className="p-3 rounded-lg bg-[#F3EFE9] text-[#111827]">
                  <div className="text-xs font-mono uppercase">Delimiter</div>
                  <div className="text-lg font-mono font-bold">{profileResult.delimiter}</div>
                </div>
                <div className="p-3 rounded-lg bg-[#F3EFE9] text-[#111827]">
                  <div className="text-xs font-mono uppercase">Elapsed</div>
                  <div className="text-lg font-mono font-bold">{profileResult.elapsedMs}ms</div>
                </div>
              </div>
              <div className="text-xs font-mono bg-[#F3EFE9] text-[#111827] p-3 rounded-lg break-all border border-[#111827]/10">
                <strong>SHA-256 ({profileResult.entryName}):</strong> {profileResult.sha256}
              </div>
              {profileResult.topGroups.length > 0 && (
                <div className="overflow-x-auto border border-[#111827]/15 rounded-lg">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-[#F3EFE9] text-[#111827]">
                      <tr>
                        <th className="px-3 py-2">{profileResult.groupByColumn || 'Group'}</th>
                        <th className="px-3 py-2 text-right">Row Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#111827]/10 bg-white text-[#111827]">
                      {profileResult.topGroups.map((g) => (
                        <tr key={g.value}>
                          <td className="px-3 py-1.5">{g.value}</td>
                          <td className="px-3 py-1.5 text-right font-bold">{g.count.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Shard Manifest Result */}
          {shardManifest && (
            <div className="border-t border-[#111827]/10 pt-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-bold flex items-center gap-2 text-[#192E01]">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Created {shardManifest.shardCount} Verified Shards in {shardManifest.outputDir}
                  </span>
                </div>
                <span className="text-xs font-mono text-[#111827]">
                  Merkle Root: {shardManifest.merkleRoot.slice(0, 18)}…
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Connected Marigold Workbenches & Civic Pipes */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#FAF8F5] dark:bg-[#182028] border border-[#111827]/15 dark:border-stone-700 rounded-xl p-6 space-y-4 shadow-xs">
            <h2 className="text-xl font-serif font-semibold text-[#111827] dark:text-white">
              Launch Marigold Workbenches
            </h2>
            <p className="text-xs text-[#111827]/75 dark:text-[#F3EFE9]/75 leading-relaxed">
              Open Marigold Insights directly inside the allowlisted Pipes.app shell or browser to explore Zstd Parquet data stories and run zero-PII county playbooks.
            </p>
            <div className="space-y-2.5">
              {[
                {
                  title: 'Data Prep & Sovereign Sharding Workbench',
                  href: 'https://marigoldinsights.org/data-prep?desktop=pipes',
                  tag: '/data-prep',
                },
                {
                  title: 'National Civic Data Stories & Benchmarks',
                  href: 'https://marigoldinsights.org/data-stories?desktop=pipes',
                  tag: '/data-stories',
                },
                {
                  title: 'Marigold Explorer & DuckDB-Wasm SQL Console',
                  href: 'https://marigoldinsights.org/explore?desktop=pipes',
                  tag: '/explore',
                },
              ].map((item) => (
                <a
                  key={item.tag}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-3.5 rounded-lg bg-[#F3EFE9] dark:bg-[#111827] hover:bg-[#FFF5C9] border border-[#111827]/10 transition-colors"
                >
                  <div>
                    <div className="text-sm font-semibold text-[#111827] dark:text-white">{item.title}</div>
                    <div className="text-xs font-mono text-[#111827]/65 dark:text-[#F3EFE9]/65">{item.tag}</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#B85C38] shrink-0" />
                </a>
              ))}
            </div>
          </div>

          <div className="bg-[#FAF8F5] dark:bg-[#182028] border border-[#111827]/15 dark:border-stone-700 rounded-xl p-6 space-y-4 shadow-xs">
            <h2 className="text-xl font-serif font-semibold text-[#111827] dark:text-white">
              Canonical Civic Knowledge Pipes
            </h2>
            <p className="text-xs text-[#111827]/75 dark:text-[#F3EFE9]/75 leading-relaxed">
              Primary-source curated Pipes feeding verified public health, IRS migration, FDIC banking, and election integrity benchmarks into Marigold.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {CIVIC_PIPES.map((pipe) => (
                <Link
                  key={pipe.slug}
                  href={`/explore/${pipe.slug}`}
                  className="p-3 rounded-lg bg-[#F3EFE9] dark:bg-[#111827] hover:bg-[#DBECC8] border border-[#111827]/10 transition-colors block"
                >
                  <div className="text-sm font-semibold text-[#111827] dark:text-white">{pipe.title}</div>
                  <div className="text-xs text-[#111827]/70 dark:text-[#F3EFE9]/70 mt-1 leading-snug">
                    {pipe.summary}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
