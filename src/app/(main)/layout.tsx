"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import InQueueWindow from "@/components/InQueueWindow";
import Sidebar from "@/components/Sidebar";
import { usePlayer } from "@/contexts/PlayerContext";

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

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen((prev) => !prev)}
      />
      <div
        className={`flex-1 transition-all duration-300 pt-20 lg:pt-0 ${
          sidebarOpen ? "lg:ml-64 ml-0" : "lg:ml-16 ml-0"
        } ${isPlayerVisible ? "pb-[90px]" : ""}`}
      >
        {children}
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
