"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser, SignIn } from "@clerk/nextjs";
import { TopNav } from "@/components/nav/TopNav";
import { DesktopSidebar } from "./DesktopSidebar";
import { NostrSignInButton } from "@/components/auth/NostrSignInButton";
import Link from "next/link";
import { ShieldCheck, ArrowRight, Compass } from "lucide-react";

export function DesktopEnvironmentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();

  const [isDesktop, setIsDesktop] = useState(false);
  const [hasNostrExtension, setHasNostrExtension] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const hasTauriWindow = "__TAURI_INTERNALS__" in window || "__TAURI__" in window;
      const urlParams = new URLSearchParams(window.location.search);
      const workspaceParam = urlParams.get("workspace");
      if (workspaceParam === "marigold" || workspaceParam === "bang" || workspaceParam === "curate") {
        localStorage.setItem("pipes_desktop_default_view", workspaceParam);
      }

      if (urlParams.get("view") === "desktop") {
        setIsDesktop(true);
      } else if (urlParams.get("view") === "web") {
        setIsDesktop(false);
      } else if (hasTauriWindow) {
        setIsDesktop(true);
      } else {
        setIsDesktop(false);
      }

      // Check for Nostr browser extension
      if ("nostr" in window) {
        setHasNostrExtension(true);
      }
    }
  }, []);

  // When signed in on Desktop, automatically forward from / (or /curate if user explicitly picked another workspace default)
  useEffect(() => {
    if (isDesktop && isLoaded && isSignedIn && pathname === "/") {
      const savedDefault = typeof window !== "undefined" ? localStorage.getItem("pipes_desktop_default_view") : null;
      const target =
        savedDefault === "bang"
          ? "/desktop/bang"
          : savedDefault === "marigold"
          ? "/desktop/marigold"
          : "/curate";
      router.replace(target);
    }
  }, [isDesktop, isLoaded, isSignedIn, pathname, router]);

  // Web Browser fallback: Renders the standard TopNav and web children
  if (!isDesktop) {
    return (
      <>
        <TopNav />
        {children}
      </>
    );
  }

  // Desktop App Layout: Simplified 4-item Sidebar is ALWAYS present.
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#E8E2D5] dark:bg-[#0B0F17]">
      <DesktopSidebar />
      <div className="flex-1 flex flex-col relative h-full min-w-0">
        <main className="flex-1 overflow-y-auto relative min-h-0 w-full bg-[#E8E2D5] dark:bg-[#0B0F17]">
          {/* If unauthenticated on Desktop root '/', show the clean Welcome Gateway */}
          {pathname === "/" && !isSignedIn ? (
            <div className="min-h-full flex flex-col items-center justify-center p-8 bg-[#E8E2D5] dark:bg-[#0B0F17] text-[#111827] dark:text-stone-100">
              <div className="max-w-md w-full mx-auto space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 mb-2">
                    <span className="text-[#D44983] font-sans tracking-tight font-black text-2xl">|||</span>
                    <span className="font-mono font-bold text-2xl tracking-widest text-[#111827] dark:text-stone-100">PIPES</span>
                  </div>
                  <h1 className="text-2xl font-serif font-bold text-[#111827] dark:text-stone-100">
                    Welcome to Pipes
                  </h1>
                  <p className="text-xs text-gray-600 dark:text-stone-400 font-sans max-w-sm mx-auto leading-relaxed">
                    Sign in to access your curated reading, library collections, and personal workspace.
                  </p>
                </div>

                {/* Primary: Familiar Clerk Sign In First (UX audit recommendation) */}
                <div className="flex justify-center">
                  <SignIn
                    fallbackRedirectUrl="/curate"
                    appearance={{
                      elements: {
                        rootBox: "w-full",
                        card: "rounded-xl shadow-xs border border-[#E2DBD0] dark:border-stone-800 bg-[#F4F0E8] dark:bg-stone-900 p-5 w-full",
                        headerTitle: "hidden",
                        headerSubtitle: "hidden",
                      },
                    }}
                  />
                </div>

                {/* Secondary: Show Nostr Only When Extension Detected or as Advanced Option */}
                {hasNostrExtension ? (
                  <div className="bg-[#F4F0E8] dark:bg-stone-900 border border-[#E2DBD0] dark:border-stone-800 p-4 space-y-2.5 rounded-xl shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#D44983] flex items-center gap-1.5">
                        <ShieldCheck className="size-4" />
                        Nostr Extension Detected
                      </span>
                      <span className="font-sans text-[10px] text-gray-500 dark:text-stone-400 font-bold uppercase">
                        Zero Password
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 dark:text-stone-400 font-sans leading-relaxed">
                      Sign in with your browser extension key to link your sovereign profile.
                    </p>
                    <NostrSignInButton redirectUrl="/curate" />
                  </div>
                ) : (
                  <div className="text-center">
                    <Link
                      href="/explore"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-stone-400 hover:text-[#D44983] dark:hover:text-[#D44983] transition-colors"
                    >
                      <Compass className="size-3.5" />
                      Browse Public Library without signing in <ArrowRight className="size-3" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
