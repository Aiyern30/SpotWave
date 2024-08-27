"use client";

import { useRef, useState } from 'react';
import { GiHamburgerMenu } from 'react-icons/gi';
import { AnimatePresence, motion } from 'framer-motion';
import { AiOutlineRollback } from 'react-icons/ai';
import { BiHomeSmile, BiSolidMusic, BiUserCircle, BiSolidAlbum, BiSolidCompass } from 'react-icons/bi';

const Sidebar = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const ref = useRef<HTMLDivElement | null>(null);

    return (
        <>
            <button
                onClick={onClose}
                className="p-3 border-2 border-zinc-800 rounded-xl"
                aria-label="toggle sidebar"
            >
                <GiHamburgerMenu />
            </button>
            <AnimatePresence mode="wait" initial={false}>
                {isOpen && (
                    <>
                        
                        <motion.div
                            {...framerSidebarPanel}
                            className="fixed top-0 bottom-0 left-0 z-50 w-64 border-r-2 border-zinc-800 bg-black"
                            ref={ref}
                            aria-label="Sidebar"
                        >
                            <div className="flex items-center justify-between p-5 border-b-2 border-zinc-800">
                                <div className='flex flex-col text-white'>
                                    <span className='text-xl'>SpotWave</span>
                                    <span className='text-sm'>All Music</span>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-3 border-2 border-white rounded-xl"
                                    aria-label="close sidebar"
                                >
                                    <AiOutlineRollback color='white'/>
                                </button>
                            </div>
                            <ul>
                                {items.map((item, idx) => {
                                    const { title, href, Icon } = item;
                                    return (
                                        <li key={title}>
                                            <a
                                                href={href}
                                                className="flex items-center gap-5 p-5 transition-all border-b-2 hover:bg-slate-300 border-zinc-800 text-white"
                                            >
                                                <motion.div {...framerIcon}>
                                                    <Icon className="text-2xl" />
                                                </motion.div>
                                                <motion.span {...framerText(idx)}>{title}</motion.span>
                                            </a>
                                        </li>
                                    );
                                })}
                            </ul>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

export default Sidebar;

const items = [
    { title: 'Home', Icon: BiHomeSmile, href: '/Home' },
    { title: 'Explore', Icon: BiSolidCompass, href: '/Explore' },
    { title: 'Albums', Icon: BiSolidAlbum, href: '/Albums' },
    { title: 'Songs', Icon: BiSolidMusic, href: '#' },
    { title: 'Made For You', Icon: BiUserCircle, href: '#' },
];

const framerSidebarBackground = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0, transition: { delay: 0.2 } },
    transition: { duration: 0.3 },
};

const framerSidebarPanel = {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
    transition: { duration: 0.3 },
};

const framerText = (delay: number) => {
    return {
        initial: { opacity: 0, x: -50 },
        animate: { opacity: 1, x: 0 },
        transition: {
            delay: 0.5 + delay / 10,
        },
    };
};

const framerIcon = {
    initial: { scale: 0 },
    animate: { scale: 1 },
    transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20,
        delay: 1.5,
    },
};
