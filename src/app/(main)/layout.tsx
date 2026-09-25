"use client";

import React, { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import InQueueWindow from "@/components/InQueueWindow";
import BackgroundVisualizer from "@/components/BackgroundVisualizer";
import Sidebar from "@/components/Sidebar";
import { usePlayer } from "@/contexts/PlayerContext";
import { useFullScreenPlayer } from "@/contexts/FullScreenPlayerContext";
import { Breadcrumbs, SearchSection } from "@/components/Header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileTriggerContainer, setMobileTriggerContainer] = useState<HTMLDivElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCompact, setSidebarCompact] = useState(true);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  useEffect(() => {
    try { setSidebarCompact(localStorage.getItem("sidebar-compact") !== "false"); } catch {}
  }, []);
  const toggleSidebarCompact = () => {
    const next = !sidebarCompact;
    setSidebarCompact(next);
    try { localStorage.setItem("sidebar-compact", String(next)); } catch {}
  };
  const { currentTrack, isConnecting } = usePlayer();
  const { isFullScreenOpen } = useFullScreenPlayer();
  const isPlayerVisible = !!currentTrack || isConnecting;

  // Add state for InQueueWindow
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  const isGamePage = pathname.startsWith("/Games/") && pathname !== "/Games";

  return (
    <div className="relative isolate flex min-h-[100dvh] bg-black">
      {!isFullScreenOpen && (
        <Sidebar
          mobileTriggerContainer={mobileTriggerContainer}
          isOpen={sidebarOpen}
          onClose={closeSidebar}
          onOpen={() => setSidebarOpen(true)}
          compact={sidebarCompact}
          onToggleCompact={toggleSidebarCompact}
        />
      )}
      <div
        className={`min-w-0 flex-1 ${
          isFullScreenOpen
            ? "md:ml-0 ml-0"
            : !sidebarCompact
              ? "md:ml-64 ml-0"
              : "md:ml-[72px] ml-0"
        } ${isPlayerVisible && !isFullScreenOpen ? "pb-[90px]" : ""}`}
      >
        <div className="px-3 sm:px-6 lg:px-8 pt-20 md:pt-6 space-y-6 flex flex-col">
          {!isFullScreenOpen && <BackgroundVisualizer renderControls={controls => (
            <Breadcrumbs
              leading={<div ref={setMobileTriggerContainer} className="h-11 w-11 shrink-0 md:hidden" />}
              actions={controls}
            />
          )} />}

          {!isGamePage && (
            <div className="relative z-[1] animate-in fade-in slide-in-from-top-4 duration-700">
              <SearchSection />
            </div>
          )}
          <main className="relative z-[1] min-w-0 flex-1 pb-8">{children}</main>
        </div>

        {pathname !== "/Events" && !isFullScreenOpen && (
          <InQueueWindow
            isOpen={isQueueOpen}
            onClose={() => setIsQueueOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
