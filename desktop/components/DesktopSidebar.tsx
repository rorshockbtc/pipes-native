"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, useUser } from "@clerk/nextjs";
import { Compass, Hash, Terminal, BookOpen, Code2, Radio, Coins, ChevronLeft, PlusCircle, Workflow, FolderSync, FileText, CheckCircle2, LayoutDashboard, ChevronDown } from "lucide-react";

export function DesktopSidebar() {
  const pathname = usePathname();
  const { user } = useUser();
    const [collapsed, setCollapsed] = useState(false);
  const [sections, setSections] = useState({
    workflows: false,
    workspace: false,
    resources: false
  });

  const toggleSection = (section: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

    const mainNav = [
    { name: "Curator Dashboard", href: "/curate", icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: "Explore", href: "/explore", icon: <Compass className="w-4 h-4" /> },
    { name: "Hash", href: "/hash", icon: <Hash className="w-4 h-4" />, isProduct: true },
    { name: "Bang IDE", href: "/desktop/bang", icon: <span className="font-mono font-bold text-lg leading-none pt-0.5">!</span>, isProduct: true },
  ];

  const workflows = [
    { name: "Folder Watcher (Sync)", href: "/desktop/workflows", icon: <FolderSync className="w-4 h-4" /> },
    { name: "Agency CMS Deploy", href: "/desktop/workflows", icon: <FileText className="w-4 h-4" /> },
    { name: "Curation Audit", href: "/desktop/workflows", icon: <CheckCircle2 className="w-4 h-4" /> },
  ];

  const resourceNav = [
    { name: "Learn & Protocol", href: "/learn", icon: <BookOpen className="w-4 h-4" /> },
    { name: "Developer SDKs", href: "/developers", icon: <Code2 className="w-4 h-4" /> },
    { name: "Podcast", href: "/podcast", icon: <Radio className="w-4 h-4" /> },
    { name: "Pricing", href: "/pricing", icon: <Coins className="w-4 h-4" /> },
  ];

  return (
    <div className={`h-full bg-[#EAE6DF] flex flex-col border-r border-[#E2DBD0] shrink-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      
      {/* Header */}
      <div className={`p-4 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed ? (
          <Link href="/" className="font-sans font-black text-xl tracking-widest text-[#111827] flex items-center gap-2 hover:opacity-80 transition-opacity">
            <span className="text-[#FF1777] font-sans tracking-tight">|||</span> PIPES
          </Link>
        ) : (
          <button onClick={() => setCollapsed(false)} className="text-[#FF1777] font-sans tracking-tight font-black text-xl hover:opacity-80 transition-opacity">
            |||
          </button>
        )}
        {!collapsed && (
          <button 
            onClick={() => setCollapsed(true)} 
            className="text-gray-400 hover:text-[#111827] p-1 rounded-md hover:bg-[#E2DBD0]/50 transition-colors"
            title="Collapse Sidebar"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="px-4 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-sans font-bold text-gray-500 uppercase tracking-widest">Sovereign Node</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 space-y-6">
        
        {/* Create Button */}
        <div className="px-2 mb-6">
          <button className={`w-full flex items-center gap-2 bg-[#F4F0E8] border border-[#E2DBD0] hover:border-[#D4CFC4] hover:bg-[#EAE6DF] text-[#111827] py-2 rounded-md transition-colors shadow-sm ${collapsed ? 'justify-center px-0' : 'px-4 justify-start'}`}>
            <PlusCircle className="w-4 h-4 text-[#FF1777]" />
            {!collapsed && <span className="text-sm font-bold">Create</span>}
          </button>
        </div>

                {/* Workflows */}
        <div>
          {!collapsed && (
            <button onClick={() => toggleSection('workflows')} className="w-full flex items-center justify-between px-3 mb-2 group">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 group-hover:text-[#111827] transition-colors"><Workflow className="w-3 h-3"/> Workflows</p>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${sections.workflows ? 'rotate-180' : ''}`} />
            </button>
          )}
          <div className={`space-y-1 overflow-hidden transition-all duration-200 ${!collapsed && !sections.workflows ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'}`}>
            {workflows.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                title={collapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 text-gray-600 hover:bg-[#F4F0E8] hover:text-[#111827] ${collapsed ? 'justify-center' : ''}`}
              >
                <div className="flex items-center justify-center w-5">{item.icon}</div>
                {!collapsed && <span className="text-sm">{item.name}</span>}
              </Link>
            ))}
          </div>
        </div>

                {/* Main Workspaces */}
        <div>
          {!collapsed && (
            <button onClick={() => toggleSection('workspace')} className="w-full flex items-center justify-between px-3 mb-2 group mt-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 group-hover:text-[#111827] transition-colors">Workspace</p>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${sections.workspace ? 'rotate-180' : ''}`} />
            </button>
          )}
          <div className={`space-y-1 overflow-hidden transition-all duration-200 ${!collapsed && !sections.workspace ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'}`}>
            {mainNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={collapsed ? item.name : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 ${
                    isActive 
                      ? "bg-[#F4F0E8] text-[#111827] font-semibold shadow-sm border border-[#E2DBD0]" 
                      : "text-gray-600 hover:bg-[#F4F0E8] hover:text-[#111827]"
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  <div className={`flex items-center justify-center w-5 ${item.isProduct || isActive ? 'text-[#FF1777]' : ''}`}>
                    {item.icon}
                  </div>
                  {!collapsed && <span className="text-sm">{item.name}</span>}
                </Link>
              );
            })}
          </div>
        </div>

                {/* Resources */}
        <div>
          {!collapsed && (
            <button onClick={() => toggleSection('resources')} className="w-full flex items-center justify-between px-3 mb-2 group mt-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2 group-hover:text-[#111827] transition-colors">Resources</p>
              <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${sections.resources ? 'rotate-180' : ''}`} />
            </button>
          )}
          <div className={`space-y-1 overflow-hidden transition-all duration-200 ${!collapsed && !sections.resources ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'}`}>
            {resourceNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={collapsed ? item.name : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 ${
                    isActive 
                      ? "bg-[#F4F0E8] text-[#111827] font-semibold shadow-sm border border-[#E2DBD0]" 
                      : "text-gray-500 hover:bg-[#F4F0E8] hover:text-[#111827]"
                  } ${collapsed ? 'justify-center' : ''}`}
                >
                  <div className={`flex items-center justify-center w-5 ${isActive ? 'text-[#FF1777]' : ''}`}>
                    {item.icon}
                  </div>
                  {!collapsed && <span className="text-sm">{item.name}</span>}
                </Link>
              );
            })}
          </div>
        </div>

      </nav>

      {/* Footer / User Profile */}
      <div className={`p-4 border-t border-[#E2DBD0] bg-[#EAE6DF] flex ${collapsed ? 'justify-center' : 'justify-between items-center'}`}>
        <UserButton appearance={{ elements: { userButtonAvatarBox: "w-8 h-8 rounded-md" } }} />
        {!collapsed && user && (
          <div className="flex flex-col items-end overflow-hidden ml-2">
            <span className="text-xs font-semibold text-[#111827] truncate w-full text-right">{user.username || user.firstName || "User"}</span>
            <span className="text-[10px] text-gray-500 truncate w-full text-right">{user.primaryEmailAddress?.emailAddress}</span>
          </div>
        )}
      </div>

    </div>
  );
}
