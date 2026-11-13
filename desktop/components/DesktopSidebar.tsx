"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { 
  Compass, 
  LayoutDashboard, 
  GitBranch, 
  PenTool, 
  Radio, 
  Bookmark, 
  HelpCircle, 
  CreditCard, 
  Code2, 
  ChevronLeft,
  GraduationCap,
  Users,
  Cpu,
  Database,
  Settings,
  Check,
  X
} from "lucide-react";

export function DesktopSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const [collapsed, setCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [desktopView, setDesktopView] = useState<'curate' | 'marigold' | 'bang'>('curate');

  // Load saved default view preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pipes_desktop_default_view');
      if (saved === 'bang' || saved === 'curate' || saved === 'marigold') {
        setDesktopView(saved);
      }
    }
  }, []);

  const handleSetDesktopView = (view: 'curate' | 'marigold' | 'bang') => {
    setDesktopView(view);
    if (typeof window !== 'undefined') {
      localStorage.setItem('pipes_desktop_default_view', view);
    }
  };

  // Primary navigation for desktop
  const primaryNav = [
    { name: "Explore", href: "/explore", icon: <Compass className="w-[18px] h-[18px]" /> },
    { name: "Dashboard", href: "/curate", icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
    { name: "Civic Data", href: "/desktop/marigold", icon: <Database className="w-[18px] h-[18px]" /> },
    { name: "Workflows", href: "/desktop/workflows", icon: <GitBranch className="w-[18px] h-[18px]" /> },
    { name: "Co-Op", href: "/co-op", icon: <Users className="w-[18px] h-[18px]" /> },
    { name: "SEMI", href: "/semi", icon: <Cpu className="w-[18px] h-[18px]" /> },
  ];

  // Create section includes ! Bang, Write, Podcast, Clip
  const createActions = [
    { 
      name: "Bang", 
      href: "/desktop/bang", 
      icon: <span className="font-mono font-black text-sm leading-none text-[#D44983] min-w-[18px] text-center">!</span> 
    },
    { 
      name: "Write (Hash Studio)", 
      href: "/write", 
      icon: <PenTool className="w-[18px] h-[18px] text-[#D44983]" /> 
    },
    { 
      name: "Produce Podcast", 
      href: "/podcast", 
      icon: <Radio className="w-[18px] h-[18px] text-[#D44983]" /> 
    },
    { 
      name: "Clip Webpage", 
      href: "/clip", 
      icon: <Bookmark className="w-[18px] h-[18px] text-[#D44983]" /> 
    },
  ];

  const secondaryNav = [
    { name: "My Pipes", href: "/my-pipes", icon: <Bookmark className="w-[18px] h-[18px]" /> },
    { name: "pipe\\optimization", href: "/optimize", icon: <Cpu className="w-[18px] h-[18px]" /> },
    { name: "Learn", href: "/learn", icon: <GraduationCap className="w-[18px] h-[18px]" /> },
    { name: "Pricing", href: "/pricing", icon: <CreditCard className="w-[18px] h-[18px]" /> },
    { name: "FAQ", href: "/faq", icon: <HelpCircle className="w-[18px] h-[18px]" /> },
    { name: "Developers", href: "/developers", icon: <Code2 className="w-[18px] h-[18px]" /> },
  ];

  return (
    <div className={`h-full bg-[#F3EFE9] flex flex-col border-r border-[#111827]/15 shrink-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      
      {/* Header */}
      <div className={`p-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between'} border-b border-[#E2DBD0]/60`}>
        {!collapsed ? (
          <Link href="/curate" className="min-h-[44px] flex items-center font-mono font-bold text-lg tracking-widest text-[#111827] gap-2 hover:opacity-80 transition-opacity">
            <span className="text-[#D44983] font-sans tracking-tight font-black text-xl">|||</span>
            <span>PIPES</span>
          </Link>
        ) : (
          <button onClick={() => setCollapsed(false)} className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#D44983] font-sans tracking-tight font-black text-xl hover:opacity-80 transition-opacity">
            |||
          </button>
        )}
        {!collapsed && (
          <button 
            onClick={() => setCollapsed(true)} 
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-400 hover:text-[#111827] p-1 rounded-md hover:bg-[#EAE6DF] transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {/* Primary Nav */}
        <div className="space-y-1">
          {primaryNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/curate' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                title={collapsed ? item.name : undefined}
                className={`min-h-[44px] min-w-[44px] flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-sm font-semibold uppercase tracking-wider ${
                  isActive 
                    ? "bg-[#111827] text-white shadow-xs font-bold" 
                    : "text-[#111827]/70 hover:bg-[#EAE6DF]/70 hover:text-[#111827]"
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <div className={`flex items-center justify-center w-[18px] ${isActive ? 'text-[#D44983]' : 'text-current'}`}>
                  {item.icon}
                </div>
                {!collapsed && (
                  <span className="truncate">{item.name}</span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Create Section */}
        <div>
          {!collapsed && (
            <p className="px-3 pb-1.5 text-xs font-sans uppercase tracking-widest text-[#111827]/50 font-bold">
              Create
            </p>
          )}
          <div className="space-y-0.5">
            {createActions.map((action) => {
              const isActive = pathname.startsWith(action.href);
              return (
                <Link
                  key={action.name}
                  href={action.href}
                  title={collapsed ? action.name : undefined}
                  className={`min-h-[44px] min-w-[44px] flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#D44983]/15 text-[#D44983] font-bold"
                      : "text-[#111827]/80 hover:bg-[#EAE6DF]/60 hover:text-[#111827]"
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  <div className="flex items-center justify-center w-[18px] shrink-0">
                    {action.icon}
                  </div>
                  {!collapsed && <span className="truncate">{action.name}</span>}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Secondary / Reference Section */}
        <div>
          {!collapsed && (
            <p className="px-3 pb-1.5 text-xs font-sans uppercase tracking-widest text-[#111827]/50 font-bold">
              Protocol &amp; Docs
            </p>
          )}
          <div className="space-y-0.5">
            {secondaryNav.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={collapsed ? item.name : undefined}
                  className={`min-h-[44px] min-w-[44px] flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-[#111827]/10 text-[#111827] font-bold"
                      : "text-[#111827]/65 hover:bg-[#EAE6DF]/60 hover:text-[#111827]"
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  <div className="flex items-center justify-center w-[18px] text-current">
                    {item.icon}
                  </div>
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer / User Profile & Settings */}
      <div className={`p-3 border-t border-[#E2DBD0] bg-[#FAF8F5] flex min-h-[44px] ${collapsed ? 'justify-center flex-col gap-2 items-center' : 'items-center justify-between gap-2.5'}`}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8 rounded-md" } }} />
          {!collapsed && user && (
            <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
              <span className="text-sm font-semibold text-[#111827] truncate">
                {user.firstName || user.username || "Account"}
              </span>
              <span className="text-xs text-gray-500 truncate">
                {user.primaryEmailAddress?.emailAddress}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="min-h-[36px] min-w-[36px] flex items-center justify-center text-gray-500 hover:text-[#111827] p-1.5 rounded-md hover:bg-[#EAE6DF] transition-colors"
          title="Desktop Preferences"
        >
          <Settings className="w-[18px] h-[18px]" />
        </button>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-[#FAF8F5] border border-[#E2DBD0] rounded-xl shadow-xl max-w-md w-full p-6 space-y-5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2DBD0]">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#D44983]" />
                <h3 className="font-serif font-bold text-lg text-[#111827]">Desktop Preferences</h3>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="p-1 rounded-md text-gray-400 hover:text-[#111827] hover:bg-[#EAE6DF] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-sans uppercase tracking-wider font-bold text-gray-600 block">
                Default Launch Environment
              </label>
              <p className="text-xs text-gray-600 leading-relaxed font-sans">
                Choose which sovereign workspace opens automatically when launching the Pipes desktop application:
              </p>

              <div className="space-y-2 pt-1">
                {/* Curator Dashboard Option (Default) */}
                <button
                  type="button"
                  onClick={() => handleSetDesktopView('curate')}
                  className={`w-full text-left p-3.5 rounded-lg border text-xs font-sans transition-all flex items-start justify-between ${
                    desktopView === 'curate'
                      ? 'border-[#D44983] bg-[#D44983]/5 shadow-xs'
                      : 'border-[#E2DBD0] bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="space-y-1 pr-3">
                    <div className="font-bold text-[#111827] flex items-center gap-1.5">
                      <span>Curator Dashboard (/curate)</span>
                      <span className="text-xs font-sans px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 font-bold">
                        Default
                      </span>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      Opens your personal reading desk, canonical library, and topic exploration feeds.
                    </p>
                  </div>
                  {desktopView === 'curate' && (
                    <Check className="w-4 h-4 text-[#D44983] shrink-0 mt-0.5" />
                  )}
                </button>

                {/* Marigold Civic Data Studio Option */}
                <button
                  type="button"
                  onClick={() => handleSetDesktopView('marigold')}
                  className={`w-full text-left p-3.5 rounded-lg border text-xs font-sans transition-all flex items-start justify-between ${
                    desktopView === 'marigold'
                      ? 'border-[#D44983] bg-[#D44983]/5 shadow-xs'
                      : 'border-[#E2DBD0] bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="space-y-1 pr-3">
                    <div className="font-bold text-[#111827] flex items-center gap-1.5">
                      <span>Marigold Civic Studio (/desktop/marigold)</span>
                    </div>
                    <p className="text-gray-600 leading-relaxed">
                      Opens directly into out-of-core 4GB+ voter &amp; fiscal archive sharding and Civic Data Stories.
                    </p>
                  </div>
                  {desktopView === 'marigold' && (
                    <Check className="w-4 h-4 text-[#D44983] shrink-0 mt-0.5" />
                  )}
                </button>

                {/* Bang Studio Option */}
                <button
                  type="button"
                  onClick={() => handleSetDesktopView('bang')}
                  className={`w-full text-left p-3.5 rounded-lg border text-xs font-sans transition-all flex items-start justify-between ${
                    desktopView === 'bang'
                      ? 'border-[#D44983] bg-[#D44983]/5 shadow-xs'
                      : 'border-[#E2DBD0] bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="space-y-1 pr-3">
                    <div className="font-bold text-[#111827] flex items-center gap-1.5">
                      <span>Bang Studio (/desktop/bang)</span>
                    </div>
                    <p className="text-gray-500 leading-relaxed">
                      Opens directly into the local AI IDE, zero-cloud code runner, and project scaffolding studio.
                    </p>
                  </div>
                  {desktopView === 'bang' && (
                    <Check className="w-4 h-4 text-[#D44983] shrink-0 mt-0.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 rounded-md bg-[#111827] hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
