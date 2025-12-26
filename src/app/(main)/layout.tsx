"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import InQueueWindow from "@/components/InQueueWindow";
import Sidebar from "@/components/Sidebar";
import { usePlayer } from "@/contexts/PlayerContext";
import { Breadcrumbs, SearchSection } from "@/components/Header";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentTrack, isConnecting } = usePlayer();
  const isPlayerVisible = !!currentTrack || isConnecting;

  // Add state for InQueueWindow
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  const isGamePage = pathname.startsWith("/Games/") && pathname !== "/Games";

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen((prev) => !prev)}
      />
      <div
        className={`flex-1 transition-all duration-300 ${
          sidebarOpen ? "lg:ml-64 ml-0" : "lg:ml-16 ml-0"
        } ${isPlayerVisible ? "pb-[90px]" : ""}`}
      >
        <Breadcrumbs />

        <div className="px-3 sm:px-6 lg:px-8 pt-20 lg:pt-6 space-y-6 flex flex-col">
          {!isGamePage && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-700">
              <SearchSection />
            </div>
          )}
          <main className="flex-1">{children}</main>
        </div>

        {pathname !== "/Events" && (
          <InQueueWindow
            isOpen={isQueueOpen}
            onClose={() => setIsQueueOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
