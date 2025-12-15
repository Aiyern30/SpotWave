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

  return (
    <div className="flex min-h-screen bg-black">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen((prev) => !prev)}
      />
      <div
        className={`flex-1 transition-all ml-16 duration-300 ${
          sidebarOpen ? "lg:ml-64 ml-16" : "lg:ml-16"
        } ${isPlayerVisible ? "pb-20 sm:pb-24" : ""}`}
      >
        {children}
        {pathname !== "/Events" && <InQueueWindow />}
      </div>
    </div>
  );
}
