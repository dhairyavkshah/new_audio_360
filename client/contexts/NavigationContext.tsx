import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface NavigationContextType {
  isNowPlayingVisible: boolean;
  setNowPlayingVisible: (visible: boolean) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [isNowPlayingVisible, setIsNowPlayingVisible] = useState(false);

  const setNowPlayingVisible = useCallback((visible: boolean) => {
    setIsNowPlayingVisible(visible);
  }, []);

  return (
    <NavigationContext.Provider value={{ isNowPlayingVisible, setNowPlayingVisible }}>
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
