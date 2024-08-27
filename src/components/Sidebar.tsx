"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { AiOutlineRollback } from 'react-icons/ai';
import { BiHomeSmile, BiSolidMusic, BiUserCircle, BiSolidAlbum, BiSolidCompass, BiLogOut } from 'react-icons/bi';

import { GiHamburgerMenu } from 'react-icons/gi';
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

const Sidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [activeItem, setActiveItem] = useState<string>('');
    const [isCompact, setIsCompact] = useState<boolean>(false);
    const [showLogoutDialog, setShowLogoutDialog] = useState<boolean>(false);
    const router = useRouter();

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
        // Clear the token here
        localStorage.removeItem('token');
        router.push('/'); // Redirect to login page or home
    };

    return (
        <>
            {/* Toggle button for mobile */}
            <button
                onClick={handleOpen}
                className="p-3 border-2 border-zinc-800 rounded-xl lg:hidden block absolute top-5 left-5 z-60"
                aria-label="toggle sidebar"
            >
                <GiHamburgerMenu />
            </button>

            {/* Full Sidebar for larger screens */}
            <AnimatePresence mode="wait" initial={false}>
                {(isOpen || isCompact) && (
                    <motion.div
                        {...framerSidebarPanel}
                        className={`fixed top-0 bottom-0 left-0 z-50 ${isCompact ? 'w-16' : 'w-64'} border-r-2 border-zinc-800 bg-black transition-all duration-300 flex flex-col`}
                        aria-label="Sidebar"
                    >
                        <div className={`flex items-center justify-between p-5 border-b-2 border-zinc-800 ${isCompact ? 'flex-col items-center' : ''}`}>
                            {!isCompact && (
                                <div className='flex flex-col text-white'>
                                    <span className='text-xl'>SpotWave</span>
                                    <span className='text-sm'>All Music</span>
                                </div>
                            )}
                            <button
                                onClick={handleClose}
                                className="p-3 border-2 border-white rounded-xl"
                                aria-label="close sidebar"
                            >
                                <AiOutlineRollback color='white' />
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
                                                    isActive ? 'bg-primary-background' : 'hover:bg-primary-background'
                                                } ${isCompact ? 'justify-center' : ''}`}
                                            >
                                                <motion.div {...framerIcon}>
                                                    <Icon className="text-2xl" />
                                                </motion.div>
                                                {!isCompact && <motion.span {...framerText(idx)}>{title}</motion.span>}
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                        {/* Logout button */}
                        <div className="flex items-center  border-t-2 border-zinc-800">
                            <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
                                <AlertDialogTrigger asChild>
                                    <a
                                        onClick={() => setShowLogoutDialog(true)}
                                        className={`flex items-center gap-5 p-5 transition-all border-b-2 border-zinc-800 text-white hover:bg-primary-background ${
                                            isCompact ? 'justify-center' : ''
                                        }`}
                                    >
                                        <motion.div {...framerIcon}>
                                            <BiLogOut className="text-2xl" />
                                        </motion.div>
                                        {!isCompact && <motion.span {...framerText(0)}>Logout</motion.span>}
                                    </a>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will log you out and remove your token from local storage.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setShowLogoutDialog(false)}>Cancel</AlertDialogCancel>
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

            {/* Compact Sidebar for mobile screens */}
            <AnimatePresence mode="wait" initial={false}>
                {isCompact && (
                    <motion.div
                        {...framerSidebarPanel}
                        className={`fixed top-0 bottom-0 left-0 z-50 w-16 border-r-2 border-zinc-800 bg-black lg:hidden block flex flex-col`}
                        aria-label="Sidebar"
                    >
                        <div className="flex flex-col items-center py-5 text-white">
                            <span className='text-xl'>SW</span>
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
                                                className={`text-white ${isActive ? 'bg-primary-background' : 'hover:bg-primary-background'} p-3 rounded-lg`}
                                            >
                                                <Icon className="text-2xl" />
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                        {/* Logout button for compact mode */}
                        <div className="flex flex-col items-center py-5 text-white">
                            <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
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
                                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will log you out and remove your token from local storage.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel onClick={() => setShowLogoutDialog(false)}>Cancel</AlertDialogCancel>
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
    { title: 'Home', Icon: BiHomeSmile, href: '/Home' },
    { title: 'Explore', Icon: BiSolidCompass, href: '/Explore' },
    { title: 'Albums', Icon: BiSolidAlbum, href: '/Albums' },
    { title: 'Songs', Icon: BiSolidMusic, href: '#' },
    { title: 'Made For You', Icon: BiUserCircle, href: '#' },
];

const framerSidebarPanel = {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
    transition: { duration: 0.5 },
};

const framerIcon = {
    initial: { scale: 0.8 },
    animate: { scale: 1 },
    transition: { duration: 0.3 },
};

const framerText = (idx: number) => ({
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 },
    transition: { delay: idx * 0.05, duration: 0.2 },
});
