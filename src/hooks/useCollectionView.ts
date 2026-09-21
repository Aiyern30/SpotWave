"use client";

import { useEffect, useState } from "react";
import type { CollectionView } from "@/components/ViewSelector";

export function useCollectionView<T extends CollectionView>(key: string, options: readonly T[], initial: T) {
  const [value, setValue] = useState<T>(initial);
  const allowed = options.join(",");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved && allowed.split(",").includes(saved)) setValue(saved as T);
    } catch { /* Storage may be unavailable in private browsing. */ }
  }, [key, allowed]);
  const change = (next: T) => {
    setValue(next);
    try { localStorage.setItem(key, next); } catch { /* Keep the in-memory choice. */ }
  };
  return [value, change] as const;
}
