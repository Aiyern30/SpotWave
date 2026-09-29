"use client";

import { useEffect } from "react";

export default function ScrollbarManager() {
  useEffect(() => {
    let pageTimer: NodeJS.Timeout | null = null;
    const elementTimers = new WeakMap<HTMLElement, NodeJS.Timeout>();

    const handleScroll = (e: Event) => {
      const target = e.target;
      if (
        target === document ||
        target === document.documentElement ||
        target === document.body ||
        target === window
      ) {
        document.documentElement.classList.add("is-scrolling");
        document.body.classList.add("is-scrolling");

        if (pageTimer) clearTimeout(pageTimer);
        pageTimer = setTimeout(() => {
          document.documentElement.classList.remove("is-scrolling");
          document.body.classList.remove("is-scrolling");
        }, 1000);
      } else if (target instanceof HTMLElement) {
        target.classList.add("is-scrolling");
        const existingTimer = elementTimers.get(target);
        if (existingTimer) clearTimeout(existingTimer);
        const timer = setTimeout(() => {
          target.classList.remove("is-scrolling");
          elementTimers.delete(target);
        }, 1000);
        elementTimers.set(target, timer);
      }
    };

    window.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll, { capture: true });
      if (pageTimer) clearTimeout(pageTimer);
    };
  }, []);

  return null;
}
