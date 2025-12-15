"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // Extract the search params and pass them to home
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (code || error) {
      // Redirect to home with query params
      router.push(`/?${params.toString()}`);
    } else {
      // No params, just go home
      router.push("/");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-green-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
        <p>Completing authentication...</p>
      </div>
    </div>
  );
}
