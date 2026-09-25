"use client";

import { useState, useEffect, createContext, useContext, ReactNode, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getSpotifyToken, installSpotifyFetchGuard, SESSION_CHANGED, SESSION_EXPIRED } from "@/lib/spotify-session";

export const AuthContext = createContext<{ token: string | null }>({ token: null });
export function useAuth() { return useContext(AuthContext); }

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const path = useRef(pathname);
  path.current = pathname;
  useEffect(() => {
    let disposed = false;
    let checking = false;
    const publicPage = () => ["/", "/callback", "/401"].includes(path.current);
    const redirect = () => { if (!publicPage()) router.replace("/401"); };
    const sync = () => setToken(localStorage.getItem("Token"));
    const restoreFetch = installSpotifyFetchGuard();
    const check = async (validate = true) => {
      if (checking) return;
      checking = true;
      try {
        if (!localStorage.getItem("Token") && !localStorage.getItem("RefreshToken")) { redirect(); return; }
        await getSpotifyToken();
        // Also validates legacy sessions and revoked authorization, while idle.
        if (validate) await fetch("https://api.spotify.com/v1/me", { signal: AbortSignal.timeout(15_000) });
      } catch {
        // Network errors and rate limits are not evidence of a revoked login.
      } finally {
        checking = false;
        if (!disposed) { sync(); setLoading(false); }
      }
    };
    const resume = () => { if (!document.hidden) void check(); };
    const storage = (event: StorageEvent) => {
      if (event.key === null || ["Token", "RefreshToken", "TokenExpiresAt"].includes(event.key)) { sync(); void check(); }
    };
    window.addEventListener(SESSION_EXPIRED, redirect);
    window.addEventListener(SESSION_CHANGED, sync);
    window.addEventListener("storage", storage);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    const timer = window.setInterval(() => { if (!document.hidden) void check(false); }, 30_000);
    void check();
    return () => {
      disposed = true;
      restoreFetch();
      window.clearInterval(timer);
      window.removeEventListener(SESSION_EXPIRED, redirect);
      window.removeEventListener(SESSION_CHANGED, sync);
      window.removeEventListener("storage", storage);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [router]);
  useEffect(() => {
    if (!loading && !["/", "/callback", "/401"].includes(pathname) && !localStorage.getItem("Token") && !localStorage.getItem("RefreshToken")) router.replace("/401");
  }, [pathname, loading, router]);
  if (loading) return null;
  return <AuthContext.Provider value={{ token }}>{children}</AuthContext.Provider>;
}
