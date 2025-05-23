"use client";

import { motion, type MotionProps } from "framer-motion";
import * as React from "react";
import { cn } from "@/lib/utils";

// Define component props type
type MotionDivProps = MotionProps & React.HTMLAttributes<HTMLDivElement>;

const Card = React.forwardRef<HTMLDivElement, MotionDivProps>(
  ({ className, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn(
        "rounded-xl bg-zinc-900/50 hover:bg-zinc-800/70",
        className
      )}
      {...props}
      whileHover={{ scale: 1.05 }} // Scale up on hover
      transition={{ ease: "easeInOut", duration: 0.3 }} // Smooth transition
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, MotionDivProps>(
  ({ className, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-3", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, MotionDivProps>(
  ({ className, ...props }, ref) => (
    <motion.h3
      ref={ref}
      className={cn("font-semibold text-sm text-white truncate", className)}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, MotionDivProps>(
  ({ className, ...props }, ref) => (
    <motion.p
      ref={ref}
      className={cn("text-xs text-zinc-400 line-clamp-2", className)}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, MotionDivProps>(
  ({ className, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn("px-3 pb-3 pt-0", className)}
      {...props}
    />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, MotionDivProps>(
  ({ className, ...props }, ref) => (
    <motion.div
      ref={ref}
      className={cn("flex items-center px-3 pb-3", className)}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
