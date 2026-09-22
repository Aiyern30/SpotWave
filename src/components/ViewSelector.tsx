"use client";

import { LayoutGrid, List, Table2, type LucideIcon } from "lucide-react";

export type CollectionView = "Grid" | "List" | "Table";
const icons: Record<CollectionView, LucideIcon> = { Grid: LayoutGrid, List, Table: Table2 };

export default function ViewSelector<T extends CollectionView>({ value, onChange, options, label = "Collection view" }: {
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
  label?: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex w-fit shrink-0 gap-1 rounded-xl border border-brand/30 bg-zinc-900/60 p-1">
      {options.map((view) => {
        const Icon: LucideIcon = icons[view];
        return <button key={view} type="button" aria-label={`${view} view`} aria-pressed={value === view} onClick={() => onChange(view)}
          className={`flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${value === view ? "bg-brand/15 text-brand" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"}`}>
          <Icon className="h-4 w-4" aria-hidden="true" /><span>{view}</span>
        </button>;
      })}
    </div>
  );
}
