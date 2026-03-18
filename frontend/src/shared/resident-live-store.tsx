import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { mapBackendResidents } from '../adapters/residents';
import { residentApi } from '../services/api';
import type { Resident } from '../types/resident';

type ResidentLiveState = {
  residents: Record<string, Resident>;
  connected: boolean;
  loading: boolean;
  error: string | null;
  lastUpdatedAt: string | null;
};

type ResidentLiveContextValue = ResidentLiveState & {
  refreshResidents: () => Promise<Resident[]>;
};

const ResidentLiveContext = createContext<ResidentLiveContextValue | undefined>(undefined);

type ProviderProps = {
  children: ReactNode;
};

export const ResidentLiveProvider = ({ children }: ProviderProps) => {
  const [state, setState] = useState<ResidentLiveState>({
    residents: {},
    connected: false,
    loading: false,
    error: null,
    lastUpdatedAt: null,
  });

  const refreshResidents = useCallback(async () => {
    setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const backendResidents = await residentApi.list({ limit: 500 });
      const residents = mapBackendResidents(backendResidents);
      const residentsById = residents.reduce<Record<string, Resident>>((acc, resident) => {
        acc[resident.id] = resident;
        return acc;
      }, {});

      setState({
        residents: residentsById,
        connected: true,
        loading: false,
        error: null,
        lastUpdatedAt: new Date().toISOString(),
      });

      return residents;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch residents';
      setState((previous) => ({
        ...previous,
        connected: false,
        loading: false,
        error: message,
      }));
      throw error;
    }
  }, []);

  useEffect(() => {
    void refreshResidents().catch(() => {});
    const poller = window.setInterval(() => {
      void refreshResidents().catch(() => {});
    }, 10000);

    return () => {
      window.clearInterval(poller);
    };
  }, [refreshResidents]);

  const value = useMemo<ResidentLiveContextValue>(
    () => ({
      ...state,
      refreshResidents,
    }),
    [state, refreshResidents]
  );

  return <ResidentLiveContext.Provider value={value}>{children}</ResidentLiveContext.Provider>;
};

export const useResidentLiveStore = () => {
  const context = useContext(ResidentLiveContext);
  if (!context) {
    throw new Error('useResidentLiveStore must be used within ResidentLiveProvider');
  }
  return context;
};
