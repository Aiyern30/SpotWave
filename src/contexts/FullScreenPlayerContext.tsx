"use client";

import { createContext, useContext } from "react";

export type FullScreenPlayerContextValue = {
  isFullScreenOpen: boolean;
  setIsFullScreenOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

const FullScreenPlayerContext =
  createContext<FullScreenPlayerContextValue | null>(null);

export const FullScreenPlayerProvider = FullScreenPlayerContext.Provider;

export const useFullScreenPlayer = () => {
  const context = useContext(FullScreenPlayerContext);

  if (!context) {
    throw new Error(
      "useFullScreenPlayer must be used within FullScreenPlayerProvider"
    );
  }

  return context;
};