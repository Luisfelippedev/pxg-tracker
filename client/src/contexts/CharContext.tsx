import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Char } from "@/types";

const STORAGE_KEY = "pxg-selected-char-id";

interface CharContextValue {
  selectedChar: Char | null;
  setSelectedChar: (char: Char | null) => void;
}

const CharContext = createContext<CharContextValue | null>(null);

export function CharProvider({ children }: { children: ReactNode }) {
  const [selectedChar, setSelectedCharState] = useState<Char | null>(null);

  const setSelectedChar = useCallback((char: Char | null) => {
    setSelectedCharState(char);
    try {
      if (char) {
        localStorage.setItem(STORAGE_KEY, char.id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <CharContext.Provider value={{ selectedChar, setSelectedChar }}>
      {children}
    </CharContext.Provider>
  );
}

export function useChar() {
  const ctx = useContext(CharContext);
  if (!ctx) throw new Error("useChar must be used within CharProvider");
  return ctx;
}

export const getStoredCharId = () => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};
