"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { type CvProfile, clearCvProfile, loadCvProfile, saveCvProfile } from "@/lib/cv-profile";

type CvContextValue = {
  profile: CvProfile | null;
  hydrated: boolean;
  setProfile: (profile: CvProfile | null) => void;
  refreshProfile: () => void;
  clearProfile: () => void;
};

const CvContext = createContext<CvContextValue | null>(null);

export default function CvProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<CvProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProfileState(loadCvProfile());
    setHydrated(true);

    const handleUpdate = () => {
      setProfileState(loadCvProfile());
    };

    window.addEventListener("embeddify:cv-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("embeddify:cv-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const setProfile = (nextProfile: CvProfile | null) => {
    setProfileState(nextProfile);

    if (nextProfile) {
      saveCvProfile(nextProfile);
      return;
    }

    clearCvProfile();
  };

  const refreshProfile = () => {
    setProfileState(loadCvProfile());
  };

  const value: CvContextValue = {
    profile,
    hydrated,
    setProfile,
    refreshProfile,
    clearProfile: () => setProfile(null),
  };

  return <CvContext.Provider value={value}>{children}</CvContext.Provider>;
}

export function useCvProfile() {
  const context = useContext(CvContext);

  if (!context) {
    throw new Error("useCvProfile must be used within CvProvider");
  }

  return context;
}