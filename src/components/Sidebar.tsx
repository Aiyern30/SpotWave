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

  useEffect(() => {
    const storedState = localStorage.getItem("sidebar-compact");
    // Default to compact only on larger screens if no state found
    setIsCompact(storedState === "true");
  }, []);

  useEffect(() => {
    setActiveItem(pathname);
  }, [pathname]);

  useEffect(() => {
    // If we're on mobile and the sidebar is "closed", make it compact
    // but the CSS will handle hiding it.
    if (!isOpen) {
      setIsCompact(true);
    } else {
      setIsCompact(false);
    }
  }, [isOpen]);

  useEffect(() => {
    localStorage.setItem("sidebar-compact", isCompact.toString());
  }, [isCompact]);

  const handleItemClick = (href: string) => {
    setActiveItem(href);
    // On mobile, automatically close after click
    if (window.innerWidth < 1024) {
      onClose();
    }
    router.push(href);
  };

  const handleToggle = () => {
    onClose();
  };

  const handleLogout = () => {
    localStorage.removeItem("Token");
    router.push("/");
  };

  return (
    <>
      {/* Mobile Toggle Button - Floating Logo */}
      <button
        onClick={handleToggle}
        className="fixed top-5 left-5 z-[60] lg:hidden group transition-transform active:scale-95"
        aria-label="toggle sidebar"
      >
        <div className="relative">
          <div
            className={`p-1 rounded-full bg-black/40 backdrop-blur-md border-2 transition-all duration-300 ${
              isOpen
                ? "border-green-500 scale-110 shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                : "border-zinc-800 hover:border-zinc-600 shadow-xl"
            }`}
          >
            <img
              src="/Logo.png"
              alt="SpotWave Logo"
              className="w-10 h-10 rounded-full"
            />
          </div>
          <div
            className={`absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border border-black shadow-lg transition-transform duration-300 ${
              isOpen ? "rotate-180 bg-red-500" : "rotate-0"
            }`}
          >
            {isOpen ? (
              <AiOutlineRollback className="text-[10px] text-white" />
            ) : (
              <GiHamburgerMenu className="text-[10px] text-white" />
            )}
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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[45] lg:hidden"
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {(isOpen || isCompact) && (
          <motion.div
            key="sidebar"
            initial={isOpen ? { x: -300 } : { x: 0 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed top-0 bottom-0 left-0 z-50 transition-all duration-300 
              ${isCompact ? "w-16 hidden lg:flex" : "w-64 flex"} 
              border-r border-zinc-800 bg-black/95 backdrop-blur-xl flex-col overflow-hidden`}
            aria-label="Sidebar"
          >
            {/* Sidebar Header */}
            <div
              className={`flex items-center justify-between p-5 border-b border-zinc-800 min-h-[90px] ${
                isCompact ? "flex-col items-center justify-center pt-8" : ""
              }`}
            >
              {!isCompact ? (
                <div className="flex items-center gap-3 text-white animate-in fade-in slide-in-from-left-4 duration-500">
                  <div className="relative">
                    <img
                      src="/Logo.png"
                      alt="SpotWave Logo"
                      className="w-10 h-10 rounded-full ring-2 ring-green-500/20"
                    />
                    <div className="absolute inset-0 rounded-full bg-green-500/10 animate-pulse" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-bold tracking-tight">
                      SpotWave
                    </span>
                    <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest -mt-1">
                      All Music
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  <img
                    src="/Logo.png"
                    alt="SpotWave Logo"
                    className="w-8 h-8 rounded-full border border-zinc-800"
                  />
                </div>
              )}

              {!isCompact && (
                <button
                  onClick={onClose}
                  className="p-2.5 hover:bg-zinc-800 rounded-xl transition-colors border border-zinc-800/50 group"
                  aria-label="close sidebar"
                >
                  <AiOutlineRollback className="text-lg text-zinc-400 group-hover:text-white transition-colors" />
                </button>
              )}
            </div>

            {/* Navigation Items */}
            <div className="flex-grow overflow-y-auto custom-scrollbar pt-4">
              <nav>
                <ul className="px-3 space-y-1">
                  {items.map((item, idx) => {
                    const { title, href, Icon } = item;
                    const isActive = pathname === href;
                    return (
                      <li key={title}>
                        <Link
                          href={href}
                          onClick={() => handleItemClick(href)}
                          className={`flex items-center gap-4 p-3.5 rounded-xl transition-all relative group
                            ${
                              isActive
                                ? "bg-green-500/10 text-green-500 border border-green-500/20 shadow-[0_0_20px_rgba(34,197,94,0.05)]"
                                : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                            } 
                            ${isCompact ? "justify-center px-0" : ""}`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="active-indicator"
                              className="absolute left-0 w-1 h-6 bg-green-500 rounded-r-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"
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
                    className={`w-full flex items-center gap-4 p-3.5 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all group
                      ${isCompact ? "justify-center" : ""}`}
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
                      You're about to leave SpotWave. You can always sign back
                      in to access your library.
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
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;

const items = [
  { title: "Home", Icon: IoIosHome, href: "/Home" },
  { title: "Explore", Icon: BiSolidCompass, href: "/Explore" },
  { title: "Artists", Icon: RiUserVoiceFill, href: "/Artists" },
  { title: "Songs", Icon: BiSolidMusic, href: "/Songs" },
  { title: "Events", Icon: IoTicket, href: "/Events" },
  { title: "Games", Icon: BiJoystick, href: "/Games" },
  { title: "Profile", Icon: FaUserCircle, href: "/Profile" },
];
