import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from "react";

export interface NowPlayingSource {
  tab: string;
  screen?: string;
  params?: any;
}

interface NavigationContextType {
  isNowPlayingVisible: boolean;
  setNowPlayingVisible: (visible: boolean) => void;
  nowPlayingSource: NowPlayingSource | null;
  setNowPlayingSource: (source: NowPlayingSource | null) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isNowPlayingVisible, setIsNowPlayingVisible] = useState(false);
  const [nowPlayingSource, setNowPlayingSourceState] = useState<NowPlayingSource | null>(null);

  const setNowPlayingVisible = useCallback((visible: boolean) => {
    setIsNowPlayingVisible(visible);
  }, []);

  const setNowPlayingSource = useCallback((source: NowPlayingSource | null) => {
    setNowPlayingSourceState(source);
  }, []);

  return (
    <NavigationContext.Provider value={{ isNowPlayingVisible, setNowPlayingVisible, nowPlayingSource, setNowPlayingSource }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationContext() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigationContext must be used within a NavigationProvider");
  }
  return context;
}
