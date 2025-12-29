"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AnimatePresence, easeInOut, motion } from "framer-motion";
import { AiOutlineRollback } from "react-icons/ai";
import {
  BiSolidMusic,
  BiSolidAlbum,
  BiSolidCompass,
  BiLogOut,
  BiJoystick,
} from "react-icons/bi";
import { usePlayer } from "@/contexts/PlayerContext";
import { RiUserVoiceFill } from "react-icons/ri";
import { IoTicket } from "react-icons/io5";
import { GiHamburgerMenu } from "react-icons/gi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/Alert-dialog";
import { IoIosHome } from "react-icons/io";
import { FaUserCircle } from "react-icons/fa";
import Link from "next/link";

const Sidebar = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const [activeItem, setActiveItem] = useState<string>("");
  const [isCompact, setIsCompact] = useState<boolean>(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();
  const { currentTrack, isConnecting } = usePlayer();
  const isPlayerVisible = !!currentTrack || isConnecting;

  useEffect(() => {
    const storedState = localStorage.getItem("sidebar-compact");
    setIsCompact(storedState === "true");
  }, []);

  useEffect(() => {
    setActiveItem(pathname);
  }, [pathname]);

  useEffect(() => {
    // Sync isCompact with the isOpen state from layout
    // isOpen true = expanded, false = compact (on desktop)
    setIsCompact(!isOpen);
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem("sidebar-compact", isCompact.toString());
  }, [isCompact]);

  const handleItemClick = (href: string) => {
    setActiveItem(href);
    // On mobile, automatically close after click
    if (window.innerWidth < 768) {
      onClose();
    }
    router.push(href);
  };

  const handleLogout = () => {
    localStorage.removeItem("Token");
    router.push("/");
  };

  return (
    <>
      <style jsx global>{`
        .custom-hide-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 0px;
        }
        .custom-hide-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-hide-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
        .custom-hide-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
        .custom-hide-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #27272a transparent;
          -ms-overflow-style: none;
        }
      `}</style>

      {/* Mobile Toggle Button - Floating Logo */}
      <button
        onClick={onClose}
        className={`fixed top-5 left-5 z-[60] md:hidden group transition-all duration-300 active:scale-95 ${
          isOpen
            ? "opacity-0 pointer-events-none translate-x-[-20px]"
            : "opacity-100 translate-x-0"
        }`}
        aria-label="toggle sidebar"
      >
        <div className="relative">
          <div className="p-1 rounded-full bg-black/40 backdrop-blur-md border border-zinc-800 shadow-xl">
            <img
              src="/Logo.png"
              alt="SpotWave Logo"
              className="w-10 h-10 rounded-full"
            />
          </div>
          <div className="absolute -bottom-1 -right-1 bg-brand rounded-full p-1 border border-black shadow-lg">
            <GiHamburgerMenu className="text-[10px] text-white" />
          </div>
        </div>
      </button>

      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] md:hidden"
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key="sidebar"
          initial={false}
          animate={{ x: 0 }}
          className={`fixed top-0 bottom-0 left-0 z-50 transition-all duration-300 
            ${isCompact ? "w-16" : "w-64"} 
            ${isOpen ? "flex" : "hidden md:flex"}
            ${isPlayerVisible ? "pb-[72px] md:pb-[90px]" : ""}
            border-r border-zinc-800 bg-black/95 backdrop-blur-xl flex-col overflow-hidden`}
          aria-label="Sidebar"
        >
          {/* Sidebar Header */}
          <div
            className={`flex items-center justify-between transition-all duration-500 ${
              isCompact
                ? "flex-col items-center justify-center py-10 px-0 min-h-[120px] cursor-pointer hover:bg-white/[0.03] group/header"
                : "p-5 min-h-[90px] border-b border-zinc-800"
            }`}
            onClick={isCompact ? onClose : undefined}
          >
            {!isCompact ? (
              <div
                className="flex items-center gap-5 text-white cursor-pointer group/logo"
                onClick={onClose}
              >
                <div className="relative w-11 h-11 flex-shrink-0">
                  <div className="absolute inset-0 rounded-full bg-brand/10 animate-pulse group-hover/logo:bg-brand/20" />
                  <img
                    src="/Logo.png"
                    alt="SpotWave Logo"
                    className="w-full h-full rounded-full ring-2 ring-brand/20 z-10 relative transition-transform group-hover/logo:scale-105"
                  />
                  {/* Show a small back icon on mobile header logo hover */}
                  <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1 border border-black z-20 opacity-0 group-hover/logo:opacity-100 transition-opacity md:hidden">
                    <AiOutlineRollback className="text-[8px] text-white" />
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold tracking-tight whitespace-nowrap">
                    SpotWave
                  </span>
                  <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest -mt-1">
                    All Music
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center group-hover/header:scale-110 transition-transform duration-500">
                <div className="relative">
                  <img
                    src="/Logo.png"
                    alt="SpotWave Logo"
                    className="w-11 h-11 rounded-full ring-2 ring-white/10 group-hover/header:ring-brand/40 transition-all duration-500 shadow-2xl"
                  />
                  <div className="absolute inset-0 rounded-full bg-brand/0 group-hover/header:bg-brand/5 transition-colors duration-500" />
                </div>
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <div
            className={`flex-grow overflow-y-auto overflow-x-hidden custom-hide-scrollbar ${
              isCompact ? "pt-8" : "pt-4"
            }`}
          >
            <nav>
              <ul className="px-3 space-y-1">
                {items.map((item, idx) => {
                  const { title, href, Icon } = item;
                  const isActive =
                    pathname === href ||
                    (href !== "/Home" && pathname.startsWith(href));
                  return (
                    <li key={title}>
                      <Link
                        href={href}
                        onClick={() => handleItemClick(href)}
                        className={`flex items-center gap-4 p-3.5 rounded-xl transition-all relative group
                          ${
                            isActive
                              ? "bg-brand/10 text-brand border border-brand/20 shadow-[0_0_20px_hsl(var(--brand-primary)/0.05)]"
                              : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                          } 
                          ${isCompact ? "justify-center px-0" : ""}`}
                      >
                        {isActive && !isCompact && (
                          <motion.div
                            layoutId="active-indicator"
                            className="absolute left-0 w-1 h-6 bg-brand rounded-r-full shadow-[0_0_10px_hsl(var(--brand-primary)/0.5)]"
                          />
                        )}
                        <div
                          className={`transition-transform duration-300 ${
                            isActive ? "scale-110" : "group-hover:scale-110"
                          }`}
                        >
                          <Icon className="text-2xl" />
                        </div>
                        {!isCompact && (
                          <span
                            className={`text-[15px] font-medium transition-colors ${
                              isActive ? "text-white" : ""
                            }`}
                          >
                            {title}
                          </span>
                        )}

                        {/* Tooltip for compact state */}
                        {isCompact && (
                          <div className="absolute left-full ml-4 px-2 py-1 bg-zinc-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[70] whitespace-nowrap border border-zinc-700">
                            {title}
                          </div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* Bottom Section - Logout */}
          <div
            className={`p-3 border-t border-zinc-800 ${
              isCompact ? "flex flex-col items-center py-6" : ""
            }`}
          >
            <AlertDialog
              open={showLogoutDialog}
              onOpenChange={setShowLogoutDialog}
            >
              <AlertDialogTrigger asChild>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setShowLogoutDialog(true);
                  }}
                  className={`w-full flex items-center gap-4 p-3.5 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all group relative
                    ${isCompact ? "justify-center px-0" : ""}`}
                >
                  <div className="group-hover:rotate-12 transition-transform duration-300">
                    <BiLogOut className="text-2xl" />
                  </div>
                  {!isCompact && (
                    <span className="text-[15px] font-medium">Logout</span>
                  )}
                  {isCompact && (
                    <div className="absolute left-full ml-4 px-2 py-1 bg-red-900/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[70] whitespace-nowrap border border-red-800">
                      Logout
                    </div>
                  )}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-zinc-950 border-zinc-800 text-white backdrop-blur-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-bold">
                    Sign Out
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-zinc-400">
                    You're about to leave SpotWave. You can always sign back in
                    to access your library.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6 gap-3">
                  <AlertDialogCancel
                    className="bg-transparent border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl px-6"
                    onClick={() => setShowLogoutDialog(false)}
                  >
                    Wait, Keep Me In
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-500 hover:bg-red-600 text-white border-0 rounded-xl px-8 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                    onClick={() => {
                      handleLogout();
                      setShowLogoutDialog(false);
                    }}
                  >
                    Sign Out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default Sidebar;

const items = [
  { title: "Home", Icon: IoIosHome, href: "/Home" },
  { title: "Explore", Icon: BiSolidCompass, href: "/Explore" },
  { title: "Playlists", Icon: BiSolidAlbum, href: "/Playlists" },
  { title: "Artists", Icon: RiUserVoiceFill, href: "/Artists" },
  { title: "Songs", Icon: BiSolidMusic, href: "/Songs" },
  { title: "Events", Icon: IoTicket, href: "/Events" },
  { title: "Games", Icon: BiJoystick, href: "/Games" },
  { title: "Profile", Icon: FaUserCircle, href: "/Profile" },
];
