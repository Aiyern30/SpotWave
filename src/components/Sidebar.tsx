"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { Home, Compass, LayoutGrid, Disc3, Mic2, Mic, Music2, Gamepad2, CircleUserRound, LogOut, Menu, X, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePlayer } from "@/contexts/PlayerContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/Alert-dialog";

const groups = [
  { label: "Discover", items: [
    { title: "Home", Icon: Home, href: "/Home" },
    { title: "Explore", Icon: Compass, href: "/Explore" },
    { title: "Categories", Icon: LayoutGrid, href: "/Categories" },
  ] },
  { label: "Music", items: [
    { title: "Playlists", Icon: Disc3, href: "/Playlists" },
    { title: "Artists", Icon: Mic2, href: "/Artists" },
    { title: "Episodes", Icon: Mic, href: "/Episodes" },
    { title: "Songs", Icon: Music2, href: "/Songs" },
  ] },
  { label: "More", items: [
    { title: "Games", Icon: Gamepad2, href: "/Games" },
    { title: "Profile", Icon: CircleUserRound, href: "/Profile" },
  ] },
];
const iconButton = "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-zinc-400 hover:bg-brand/10 hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand";

export default function Sidebar({ isOpen, onClose, onOpen, compact, onToggleCompact }: {
  isOpen: boolean;
  onClose: () => void;
  onOpen: () => void;
  compact: boolean;
  onToggleCompact: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentTrack, isConnecting } = usePlayer();
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => { onClose(); }, [pathname, onClose]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => { if (media.matches) onClose(); };
    media.addEventListener("change", closeOnDesktop);
    return () => media.removeEventListener("change", closeOnDesktop);
  }, [onClose]);

  const navigation = (collapsed: boolean, mobile = false) => (
    <>
      <div className={`flex min-h-[76px] shrink-0 items-center border-b border-brand/20 ${collapsed ? "justify-center px-2" : "justify-between px-4"}`}>
        <Link href="/Home" onClick={mobile ? onClose : undefined} aria-label="SpotWave home" className="flex min-h-11 items-center gap-3 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
          <img src="/Logo.png" alt="" width={36} height={36} className="shrink-0 rounded-full" />
          {!collapsed && <span className="text-lg font-semibold tracking-tight text-zinc-100">SpotWave</span>}
        </Link>
        {mobile ? <Dialog.Close className={iconButton} aria-label="Close navigation"><X size={20} /></Dialog.Close> : !collapsed && <button className={iconButton} onClick={onToggleCompact} aria-label="Collapse sidebar"><PanelLeftClose size={18} /></button>}
      </div>
      {collapsed && <button className={`${iconButton} mx-auto mt-2`} onClick={onToggleCompact} aria-label="Expand sidebar" title="Expand sidebar"><PanelLeftOpen size={18} /></button>}
      <nav aria-label="Main navigation" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 [scrollbar-width:thin]">
        {groups.map((group, index) => (
          <div key={group.label} className={index ? "mt-5" : ""}>
            {!collapsed && <p className="mb-2 px-3 text-xs font-medium text-zinc-500">{group.label}</p>}
            {collapsed && index > 0 && <div className="mx-3 mb-3 border-t border-brand/20" />}
            <ul className="space-y-1">
              {group.items.map(({ title, Icon, href }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`);
                const link = <Link href={href} onClick={mobile ? onClose : undefined} aria-label={title} aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${collapsed ? "justify-center px-0" : ""} ${active ? "border-brand/20 bg-brand/10 text-zinc-100" : "border-transparent text-zinc-400 hover:border-brand/30 hover:bg-brand/10 hover:text-brand"}`}>
                  <Icon size={19} strokeWidth={1.75} aria-hidden="true" className={`shrink-0 ${active ? "text-brand" : ""}`} />
                  {!collapsed && <span className="truncate">{title}</span>}
                </Link>;
                return <li key={href}>{collapsed ? <Tooltip><TooltipTrigger asChild>{link}</TooltipTrigger><TooltipContent side="right" sideOffset={12} className="border border-brand/30 bg-zinc-900 text-zinc-100">{title}</TooltipContent></Tooltip> : link}</li>;
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="shrink-0 border-t border-brand/20 p-3">
        <button onClick={() => setLogoutOpen(true)} aria-label="Logout" title={collapsed ? "Logout" : undefined} className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-zinc-400 hover:bg-brand/10 hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${collapsed ? "justify-center" : ""}`}>
          <LogOut size={19} strokeWidth={1.75} />{!collapsed && "Logout"}
        </button>
      </div>
    </>
  );

  return <TooltipProvider delayDuration={150}>
    <aside aria-label="Sidebar" className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-brand/20 bg-zinc-950 md:flex ${compact ? "w-[72px]" : "w-64"} ${currentTrack || isConnecting ? "pb-[90px]" : ""}`}>
      {navigation(compact)}
    </aside>
    <Dialog.Root open={isOpen} onOpenChange={(open) => open ? onOpen() : onClose()}>
      <Dialog.Trigger asChild><button aria-label="Open navigation" className={`${iconButton} fixed left-3 top-3 z-40 border border-brand/30 bg-zinc-950 md:hidden`}><Menu size={21} /></button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/65" />
        <Dialog.Content aria-describedby={undefined} className="fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[min(320px,calc(100vw-32px))] flex-col border-r border-brand/20 bg-zinc-950 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] shadow-xl focus:outline-none">
          <Dialog.Title className="sr-only">SpotWave navigation</Dialog.Title>
          {navigation(false, true)}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
      <AlertDialogContent className="border-brand/20 bg-zinc-950 text-zinc-100">
        <AlertDialogHeader><AlertDialogTitle>Sign Out</AlertDialogTitle><AlertDialogDescription className="text-zinc-400">Sign out of SpotWave? You can sign back in to access your library.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel className="border-brand/30 bg-zinc-900 text-zinc-100">Cancel</AlertDialogCancel><AlertDialogAction className="bg-brand text-brand-foreground hover:bg-brand/90" onClick={() => { localStorage.removeItem("Token"); router.push("/"); }}>Sign Out</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </TooltipProvider>;
}
