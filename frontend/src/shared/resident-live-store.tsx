// 將 SSE 模擬器送出的住民資料同步到 React 全域 Context。
import { createContext, useContext, useEffect, useMemo, useReducer, useCallback } from 'react';
import type { ReactNode } from 'react';

import type { Resident, ResidentEvent } from '../sse/client';
import { openResidentSSE } from '../sse/client';

type State = {
  residents: Record<string, Resident>;
  lastEventAt: number | null;
  connected: boolean;
};

type Action =
  | { type: 'connected' }
  | { type: 'disconnected' }
  | { type: 'event'; payload: ResidentEvent }
  | { type: 'localUpdate'; payload: { id: string; updates: Partial<Resident> } }
  | { type: 'localRemove'; payload: { id: string } };

const initialState: State = {
  residents: {},
  lastEventAt: null,
  connected: false
};

// 透過 Reducer 封裝狀態轉移，讓元件維持宣告式使用。
const residentReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'connected':
      return {
        ...state,
        connected: true
      };
    case 'disconnected':
      return {
        ...state,
        connected: false
      };
    case 'event': {
      const { resident, type, timestamp } = action.payload;
      const eventTime = Date.parse(timestamp);
      const lastEventAt = Number.isNaN(eventTime) ? Date.now() : eventTime;

      if (type === 'resident.checkout') {
        const nextResidents = { ...state.residents };
        delete nextResidents[resident.id];
        return {
          residents: nextResidents,
          lastEventAt,
          connected: true
        };
      }

      const existing = state.residents[resident.id];
      const merged: Resident = existing
        ? {
            ...existing,
            ...resident,
            vitals: {
              ...existing.vitals,
              ...resident.vitals
            }
          }
        : resident;

      const nextResidents: Record<string, Resident> = {
        ...state.residents,
        [resident.id]: merged
      };

      return {
        residents: nextResidents,
        lastEventAt,
        connected: true
      };
    }
    case 'localUpdate': {
      const { id, updates } = action.payload;
      const existing = state.residents[id];
      if (!existing) {
        return state;
      }

      const nextResident: Resident = {
        ...existing,
        ...updates,
        updatedAt: updates.updatedAt ?? new Date().toISOString(),
        status: (updates.status as Resident['status']) ?? existing.status,
        checkedOut: updates.checkedOut ?? existing.checkedOut
      };

      const nextResidents: Record<string, Resident> = {
        ...state.residents,
        [id]: nextResident
      };

      return {
        residents: nextResidents,
        lastEventAt: Date.now(),
        connected: state.connected
      };
    }
    case 'localRemove': {
      const { id } = action.payload;
      if (!state.residents[id]) {
        return state;
      }
      const nextResidents = { ...state.residents };
      delete nextResidents[id];
      return {
        residents: nextResidents,
        lastEventAt: Date.now(),
        connected: state.connected
      };
    }
    default:
      return state;
  }
};

type ResidentLiveContextValue = State & {
  updateResident: (id: string, updates: Partial<Resident>) => void;
  removeResident: (id: string) => void;
};

const ResidentLiveContext = createContext<ResidentLiveContextValue | undefined>(undefined);

type ProviderProps = {
  children: ReactNode;
};

// 啟動 SSE 連線並把住民狀態提供給整個應用。
export const ResidentLiveProvider = ({ children }: ProviderProps) => {
  const [state, dispatch] = useReducer(residentReducer, initialState);

  useEffect(() => {
    const connection = openResidentSSE();

    const forwardEvent = (payload: ResidentEvent) => {
      dispatch({ type: 'event', payload });
    };

    const unsubNew = connection.on('resident.new', forwardEvent);
    const unsubUpdate = connection.on('resident.update', forwardEvent);
    const unsubCheckout = connection.on('resident.checkout', forwardEvent);

    const handleOpen = () => {
      dispatch({ type: 'connected' });
    };

    const handleError = () => {
      dispatch({ type: 'disconnected' });
    };

    connection.source.addEventListener('open', handleOpen);
    connection.source.addEventListener('error', handleError);

    return () => {
      unsubNew();
      unsubUpdate();
      unsubCheckout();
      connection.source.removeEventListener('open', handleOpen);
      connection.source.removeEventListener('error', handleError);
      connection.close();
    };
  }, []);

  const updateResident = useCallback((id: string, updates: Partial<Resident>) => {
    dispatch({ type: 'localUpdate', payload: { id, updates } });
  }, []);

  const removeResident = useCallback((id: string) => {
    dispatch({ type: 'localRemove', payload: { id } });
  }, []);

  const value = useMemo<ResidentLiveContextValue>(
    () => ({
      ...state,
      updateResident,
      removeResident
    }),
    [state, updateResident, removeResident]
  );

  return <ResidentLiveContext.Provider value={value}>{children}</ResidentLiveContext.Provider>;
};

// 供元件取得即時住民狀態的 Hook。
export const useResidentLiveStore = () => {
  const context = useContext(ResidentLiveContext);
  if (!context) {
    throw new Error('useResidentLiveStore must be used within ResidentLiveProvider');
  }
  return context;
};
