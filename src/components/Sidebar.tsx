"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AiOutlineRollback } from "react-icons/ai";
import {
  BiSolidMusic,
  BiSolidAlbum,
  BiSolidCompass,
  BiLogOut,
} from "react-icons/bi";
import { RiUserVoiceFill } from "react-icons/ri";

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

  useEffect(() => {
    const storedState = localStorage.getItem("sidebar-compact");
    setIsCompact(storedState === "true");
  }, []);

  useEffect(() => {
    setActiveItem(window.location.pathname);
  }, []);

  useEffect(() => {
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
    router.push(href);
  };

  const handleClose = () => {
    onClose();
    setIsCompact(true);
  };

  const handleOpen = () => {
    setIsCompact(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("Token");

    router.push("/");
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="p-3 border-2 border-zinc-800 rounded-xl lg:hidden block absolute top-5 left-5 z-60"
        aria-label="toggle sidebar"
      >
        <GiHamburgerMenu />
      </button>

      <AnimatePresence mode="wait" initial={false}>
        {(isOpen || isCompact) && (
          <motion.div
            {...framerSidebarPanel}
            className={`fixed top-0 bottom-0 left-0 z-50 ${
              isCompact ? "w-16" : "w-64"
            } border-r-2 border-zinc-800 bg-black transition-all duration-300 flex flex-col`}
            aria-label="Sidebar"
          >
            <div
              className={`flex items-center justify-between p-5 border-b-2 border-zinc-800 ${
                isCompact ? "flex-col items-center" : ""
              }`}
            >
              {!isCompact && (
                <div className="flex flex-col text-white">
                  <span className="text-xl">SpotWave</span>
                  <span className="text-sm">All Music</span>
                </div>
              )}
              <button
                onClick={handleClose}
                className="p-3 border-2 border-white rounded-xl"
                aria-label="close sidebar"
              >
                <AiOutlineRollback color="white" />
              </button>
            </div>
            <div className="flex-grow overflow-auto">
              <ul>
                {items.map((item, idx) => {
                  const { title, href, Icon } = item;
                  const isActive = activeItem === href;
                  return (
                    <li key={title}>
                      <a
                        href={href}
                        onClick={() => handleItemClick(href)}
                        className={`flex items-center gap-5 p-5 transition-all border-b-2 border-zinc-800 text-white ${
                          isActive
                            ? "bg-primary-background"
                            : "hover:bg-primary-background"
                        } ${isCompact ? "justify-center" : ""}`}
                      >
                        <motion.div {...framerIcon}>
                          <Icon className="text-2xl" />
                        </motion.div>
                        {!isCompact && (
                          <motion.span {...framerText(idx)}>
                            {title}
                          </motion.span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="flex items-center  border-t-2 border-zinc-800">
              <AlertDialog
                open={showLogoutDialog}
                onOpenChange={setShowLogoutDialog}
              >
                <AlertDialogTrigger asChild>
                  <a
                    onClick={() => setShowLogoutDialog(true)}
                    className={`flex items-center gap-5 p-5 transition-all border-b-2 border-zinc-800 text-white hover:bg-primary-background ${
                      isCompact ? "justify-center" : ""
                    }`}
                  >
                    <motion.div {...framerIcon}>
                      <BiLogOut className="text-2xl" />
                    </motion.div>
                    {!isCompact && (
                      <motion.span {...framerText(0)}>Logout</motion.span>
                    )}
                  </a>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will log you out and
                      remove your token from local storage.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      onClick={() => setShowLogoutDialog(false)}
                    >
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        handleLogout();
                        setShowLogoutDialog(false);
                      }}
                    >
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        {isCompact && (
          <motion.div
            {...framerSidebarPanel}
            className={`fixed top-0 bottom-0 left-0 z-50 w-16 border-r-2 border-zinc-800 bg-black lg:hidden  flex flex-col`}
            aria-label="Sidebar"
          >
            <div className="flex flex-col items-center py-5 text-white">
              <span className="text-xl">SW</span>
            </div>
            <div className="flex-grow overflow-auto">
              <ul>
                {items.map((item, idx) => {
                  const { href, Icon } = item;
                  const isActive = activeItem === href;
                  return (
                    <li key={href} className="flex flex-col items-center p-3">
                      <a
                        href={href}
                        onClick={() => handleItemClick(href)}
                        className={`text-white ${
                          isActive
                            ? "bg-primary-background"
                            : "hover:bg-primary-background"
                        } p-3 rounded-lg`}
                      >
                        <Icon className="text-2xl" />
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="flex flex-col items-center py-5 text-white">
              <AlertDialog
                open={showLogoutDialog}
                onOpenChange={setShowLogoutDialog}
              >
                <AlertDialogTrigger asChild>
                  <a
                    onClick={() => setShowLogoutDialog(true)}
                    className="flex items-center gap-5 p-3 rounded-lg text-white hover:bg-primary-background"
                  >
                    <BiLogOut className="text-2xl" />
                  </a>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will log you out and
                      remove your token from local storage.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      onClick={() => setShowLogoutDialog(false)}
                    >
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        handleLogout();
                        setShowLogoutDialog(false);
                      }}
                    >
                      Continue
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
  // { title: 'Albums', Icon: BiSolidAlbum, href: '/Albums' },
  { title: "Artists", Icon: RiUserVoiceFill, href: "/Artists" },
  { title: "Songs", Icon: BiSolidMusic, href: "/Songs" },
  { title: "Profile", Icon: FaUserCircle, href: "/Profile" },
];

const framerSidebarPanel = {
  initial: { x: -300 },
  animate: { x: 0 },
  exit: { x: -300 },
  transition: { duration: 0.5, ease: "easeInOut" },
};

const framerIcon = {
  initial: { opacity: 0, scale: 0.5 },
  animate: { opacity: 1, scale: 1 },
  transition: { delay: 0.2, duration: 0.5, ease: "easeInOut" },
};

const framerText = (idx: number) => ({
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0 },
  transition: { delay: 0.1 * idx, duration: 0.5, ease: "easeInOut" },
});
