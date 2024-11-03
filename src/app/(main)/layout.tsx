import React from "react";
import InQueueWindow from "@/components/InQueueWindow";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <InQueueWindow />
    </>
  );
}
