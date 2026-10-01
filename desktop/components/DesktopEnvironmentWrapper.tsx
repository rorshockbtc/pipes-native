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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isTauri =
        "__TAURI_INTERNALS__" in window ||
        "__TAURI__" in window ||
        localStorage.getItem("pipes_is_tauri") === "true";
      if (isTauri) {
        setIsDesktop(true);
        localStorage.setItem("pipes_is_tauri", "true");
      }
    }
  }, []);

  // When signed in on Desktop, automatically forward from the root / to /curate
  useEffect(() => {
    if (isDesktop && isLoaded && isSignedIn && pathname === "/") {
      router.replace("/curate");
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

  // Desktop App Layout: Sovereign Sidebar is ALWAYS present. Zero competing TopNav.
  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#FAF8F5]">
      <DesktopSidebar />
      <div className="flex-1 flex flex-col relative h-full min-w-0">
        <main className="flex-1 overflow-y-auto relative min-h-0 w-full bg-[#FAF8F5]">
          {/* If unauthenticated on Desktop root '/', show the dedicated Desktop Gateway without the Satoshi quote */}
          {pathname === "/" && !isSignedIn ? (
            <div className="min-h-full flex flex-col items-center justify-center p-8 bg-[#FAF8F5] text-[#111827]">
              <div className="max-w-md w-full mx-auto space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 mb-2">
                    <span className="text-[#FF1777] font-sans tracking-tight font-black text-2xl">|||</span>
                    <span className="font-sans font-black text-2xl tracking-widest text-[#111827]">PIPES</span>
                  </div>
                  <h1 className="text-2xl font-serif font-bold text-[#111827]">
                    Sovereign Node Gateway
                  </h1>
                  <p className="text-xs text-gray-600 font-sans max-w-sm mx-auto leading-relaxed">
                    Sign in to access your local namespaces, Bang IDE harnesses, and desktop workflows.
                  </p>
                </div>

                {/* Nostr 1-Click Card */}
                <div className="bg-[#F4F0E8] border border-[#E2DBD0] p-5 space-y-3 rounded-xl shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-xs font-bold uppercase tracking-wider text-[#FF1777] flex items-center gap-1.5">
                      <ShieldCheck className="size-4" />
                      Sovereign Nostr Login
                    </span>
                    <span className="font-sans text-[10px] text-gray-500 font-bold uppercase">
                      Zero Passwords
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 font-sans leading-relaxed">
                    Your private keys never leave your device. Sign in with your cryptographic extension to link your public persona.
                  </p>
                  <NostrSignInButton redirectUrl="/curate" />
                </div>

                {/* Divider */}
                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-[#E2DBD0]" />
                  <span className="flex-shrink mx-3 text-[10px] font-sans uppercase font-bold tracking-widest text-gray-400">
                    or standard credentials
                  </span>
                  <div className="flex-grow border-t border-[#E2DBD0]" />
                </div>

                {/* Clerk Sign In */}
                <div className="flex justify-center">
                  <SignIn
                    fallbackRedirectUrl="/curate"
                    appearance={{
                      elements: {
                        rootBox: "w-full",
                        card: "rounded-xl shadow-xs border border-[#E2DBD0] bg-[#F4F0E8] p-5 w-full",
                        headerTitle: "hidden",
                        headerSubtitle: "hidden",
                      },
                    }}
                  />
                </div>

                {/* Direct Explore Link */}
                <div className="text-center pt-2">
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-[#FF1777] transition-colors"
                  >
                    <Compass className="size-3.5" />
                    Explore Public Canons without signing in <ArrowRight className="size-3" />
                  </Link>
                </div>
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
