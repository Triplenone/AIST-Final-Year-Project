// 住民即時資料的全域狀態 (Resident live data global store)
// 說明：移除前端 SSE 模擬器，改為輪詢後端 /api/v1/residents 取得住民快照。
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useCallback,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import type { Resident } from '../sse/client';
import { useBackendResidentSnapshot } from '../hooks/useBackendResidentSnapshot';

type State = {
  residents: Record<string, Resident>;
  lastEventAt: number | null;
  connected: boolean;
};

type ResidentUpdate = Partial<Resident> & { roleType?: Resident['roleType'] };

type Action =
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'localUpdate'; payload: { id: string; updates: ResidentUpdate } }
  | { type: 'localRemove'; payload: { id: string } }
  | { type: 'localAdd'; payload: { resident: Resident } }
  | { type: 'hydrate'; payload: { residents: Resident[] } };

const initialState: State = {
  residents: {},
  lastEventAt: null,
  connected: false,
};

// 將狀態轉移封裝在 reducer (Reducer encapsulates state transitions)
const residentReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'connected':
      return { ...state, connected: true };
    case 'disconnected':
      return { ...state, connected: false };
    case 'localUpdate': {
      const { id, updates } = action.payload;
      const existing = state.residents[id];
      if (!existing) return state;
      const nextResident: Resident = {
        ...existing,
        ...updates,
        updatedAt: updates.updatedAt ?? new Date().toISOString(),
        status: (updates.status as Resident['status']) ?? existing.status,
        checkedOut: updates.checkedOut ?? existing.checkedOut,
      };
      return {
        ...state,
        residents: { ...state.residents, [id]: nextResident },
        lastEventAt: Date.now(),
      };
    }
    case 'localRemove': {
      const { id } = action.payload;
      if (!state.residents[id]) return state;
      const nextResidents = { ...state.residents };
      delete nextResidents[id];
      return {
        ...state,
        residents: nextResidents,
        lastEventAt: Date.now(),
      };
    }
    case 'localAdd': {
      const { resident } = action.payload;
      return {
        ...state,
        residents: { ...state.residents, [resident.id]: resident },
        lastEventAt: Date.now(),
      };
    }
    case 'hydrate': {
      const nextResidents: Record<string, Resident> = {};
      action.payload.residents.forEach((resident) => {
        nextResidents[resident.id] = resident;
      });
      return {
        ...state,
        residents: nextResidents,
        lastEventAt: Date.now(),
      };
    }
    default:
      return state;
  }
};

type ResidentLiveContextValue = State & {
  updateResident: (id: string, updates: ResidentUpdate) => void;
  removeResident: (id: string) => void;
  addResident: (resident: Resident) => void;
  refreshResidents: () => Promise<Resident[]>;
  startStream: () => void;
  stopStream: () => void;
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
};

const ResidentLiveContext = createContext<ResidentLiveContextValue | undefined>(undefined);

type ProviderProps = {
  children: ReactNode;
};

export const ResidentLiveProvider = ({ children }: ProviderProps) => {
  const [state, dispatch] = useReducer(residentReducer, initialState);
  const pollerRef = useRef<number | null>(null);
  const { residents: backendResidents, refresh } = useBackendResidentSnapshot();
  const [demoMode, setDemoModeState] = useState(false);

  // 停止輪詢 (Stop polling)
  const stopStream = useCallback(() => {
    if (pollerRef.current) {
      window.clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
    dispatch({ type: 'disconnected' });
  }, []);

  // 開始輪詢後端住民快照 (Start polling backend residents)
  const startStream = useCallback(() => {
    if (demoMode) return;
    if (pollerRef.current) return;
    dispatch({ type: 'connected' });
    pollerRef.current = window.setInterval(() => {
      void refresh().then((residents) => {
        dispatch({ type: 'hydrate', payload: { residents } });
      });
    }, 10000); // 每 10 秒輪詢一次 (poll every 10s)
  }, [demoMode, refresh]);

  const setDemoMode = useCallback(
    (enabled: boolean) => {
      setDemoModeState(enabled);
      if (enabled) {
        stopStream();
        return;
      }
      void refresh().then((residents) => {
        dispatch({ type: 'hydrate', payload: { residents } });
      });
    },
    [refresh, stopStream]
  );

  // 初次載入抓一次資料 (Fetch once on mount)
  useEffect(() => {
    void refresh().then((residents) => {
      dispatch({ type: 'hydrate', payload: { residents } });
    });
    return () => {
      stopStream();
    };
  }, [refresh, stopStream]);

  // 如果 hook 自動更新有新資料，也同步進 state (Sync hook updates)
  useEffect(() => {
    if (demoMode) return;
    if (backendResidents.length > 0) {
      dispatch({ type: 'hydrate', payload: { residents: backendResidents } });
    }
  }, [backendResidents, demoMode]);

  const refreshResidents = useCallback(async () => {
    if (demoMode) {
      return Object.values(state.residents);
    }
    const snapshot = await refresh();
    dispatch({ type: 'hydrate', payload: { residents: snapshot } });
    return snapshot;
  }, [demoMode, refresh, state.residents]);

  const updateResident = useCallback((id: string, updates: ResidentUpdate) => {
    dispatch({ type: 'localUpdate', payload: { id, updates } });
  }, []);

  const removeResident = useCallback((id: string) => {
    dispatch({ type: 'localRemove', payload: { id } });
  }, []);

  const addResident = useCallback((resident: Resident) => {
    dispatch({ type: 'localAdd', payload: { resident } });
  }, []);

  const value = useMemo<ResidentLiveContextValue>(
    () => ({
      ...state,
      updateResident,
      removeResident,
      addResident,
      refreshResidents,
      startStream,
      stopStream,
      demoMode,
      setDemoMode,
    }),
    [state, updateResident, removeResident, addResident, refreshResidents, startStream, stopStream, demoMode, setDemoMode]
  );

  return <ResidentLiveContext.Provider value={value}>{children}</ResidentLiveContext.Provider>;
};

// 供元件取得即時住民狀態的 Hook (Public hook for consuming resident live data)
export const useResidentLiveStore = () => {
  const context = useContext(ResidentLiveContext);
  if (!context) {
    throw new Error('useResidentLiveStore must be used within ResidentLiveProvider');
  }
  return context;
};
