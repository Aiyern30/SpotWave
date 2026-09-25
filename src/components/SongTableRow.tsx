"use client";

import { TableRow } from "@/components/ui/Table";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof TableRow>, "onClick"> & {
  onActivate?: () => void;
};

/** Retain table semantics while allowing the row to be played with a keyboard. */
export function SongTableRow({ onActivate, children, ...props }: Props) {
  return (
    <TableRow
      {...props}
      tabIndex={onActivate ? 0 : undefined}
      onClick={(event) => {
        if (!onActivate) return;
        const target = event.target as HTMLElement;
        if (target.closest("button, a, input, select, textarea, [role='menuitem']")) return;
        onActivate();
      }}
      onKeyDown={(event) => {
        if (!onActivate) return;
        if (event.target !== event.currentTarget || event.repeat) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onActivate();
        }
      }}
    >
      {children}
    </TableRow>
  );
}
