"use client";

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

export const AuthContext = createContext<{ token: string | null }>({
  token: null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true); // Add loading state
  const router = useRouter();
  const pathname = usePathname();

  const validateToken = useCallback(async (token: string) => {
    try {
      const response = await fetch("https://api.spotify.com/v1/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.status !== 401;
    } catch (error) {
      console.error("Error validating token:", error);
      return false;
    }
  }, []);

  const handleTokenInvalid = useCallback(() => {
    window.localStorage.removeItem("Token");
    setToken(null);
    if (pathname !== "/401" && pathname !== "/") {
      router.push("/401");
    }
  }, [pathname, router]);

  const checkToken = useCallback(async () => {
    const storedToken = window.localStorage.getItem("Token");
    if (storedToken) {
      const isValid = await validateToken(storedToken);
      if (isValid) {
        setToken(storedToken);
      } else {
        handleTokenInvalid();
      }
    } else {
      handleTokenInvalid();
    }
    setLoading(false); // Set loading to false after checking
  }, [validateToken, handleTokenInvalid]);

  useEffect(() => {
    checkToken();
  }, [checkToken]);

  // Prevent rendering children until loading is complete
  if (loading) {
    return null; // Optionally, return a loading spinner or some placeholder UI
  }

  return (
    <AuthContext.Provider value={{ token }}>{children}</AuthContext.Provider>
  );
}
