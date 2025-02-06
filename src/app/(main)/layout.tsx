"use client";

import React from "react";
import { usePathname } from "next/navigation";
import InQueueWindow from "@/components/InQueueWindow";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <>
      {children}
      {pathname !== "/Events" && <InQueueWindow />}
    </>
  );
}
