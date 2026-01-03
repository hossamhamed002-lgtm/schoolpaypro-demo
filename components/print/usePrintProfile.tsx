import { useEffect, useState } from 'react';
import { DEFAULT_PRINT_PROFILE, PrintProfile } from './printProfile';

const STORAGE_KEY = 'PRINT_PROFILE__FINANCE';

export const usePrintProfile = () => {
  const [profile, setProfile] = useState<PrintProfile>(() => {
    if (typeof window === 'undefined') return DEFAULT_PRINT_PROFILE;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_PRINT_PROFILE, ...JSON.parse(raw) } : DEFAULT_PRINT_PROFILE;
    } catch {
      return DEFAULT_PRINT_PROFILE;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }, [profile]);

  const resetProfile = () => setProfile(DEFAULT_PRINT_PROFILE);

  return { profile, setProfile, resetProfile };
};

