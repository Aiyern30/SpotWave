import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, style, onFocus, onBlur, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md",
          "border bg-[#535353] px-3 py-1 text-white",
          "text-sm shadow-sm transition-all duration-200",
          "file:border-0 file:bg-transparent file:text-sm",
          "file:font-medium placeholder:text-zinc-400 outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        style={{
          borderColor: "hsl(var(--brand-primary) / 0.3)",
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "hsl(var(--brand-primary) / 0.8)";
          e.currentTarget.style.boxShadow = "0 0 0 2px hsl(var(--brand-primary) / 0.2)";
          onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "hsl(var(--brand-primary) / 0.3)";
          e.currentTarget.style.boxShadow = "";
          onBlur?.(e);
        }}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
