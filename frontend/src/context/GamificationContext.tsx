import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { GamificationState } from '../types';
import { useAuth } from './AuthContext';
import { gamificationApi } from '../api/gamification';

interface GamificationContextType {
  state: GamificationState | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [state, setState] = useState<GamificationState | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) {
      setState(null);
      setLoading(false);
      return;
    }

    try {
      const res = await gamificationApi.getState();
      if (res.data.success) {
        setState(res.data.data);
      }
    } catch {
      // If API fails, keep current state (or null on first load)
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await loadData();
  }, [loadData]);

  return (
    <GamificationContext.Provider value={{ state, loading, refresh }}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error('useGamification must be used within GamificationProvider');
  }
  return context;
}
