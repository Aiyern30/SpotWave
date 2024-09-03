"use client";

import {
  useState,
  useEffect,
  createContext,
  useContext,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

export const AuthContext = createContext<{ token: string | null }>({
  token: null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const validateToken = async (token: string) => {
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
    };

    const checkToken = async () => {
      let storedToken = window.localStorage.getItem("Token");
      if (storedToken) {
        const isValid = await validateToken(storedToken);
        if (isValid) {
          setToken(storedToken);
        } else {
          window.localStorage.removeItem("Token");
          setToken(null);
          router.push("/");
        }
      } else {
        router.push("/");
      }
    };

    checkToken();
  }, [router]);

  return (
    <AuthContext.Provider value={{ token }}>{children}</AuthContext.Provider>
  );
}
