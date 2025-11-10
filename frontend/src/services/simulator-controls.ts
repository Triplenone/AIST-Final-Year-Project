// 開發模式下與 SSE 模擬器 Service Worker 溝通的工具。
import type { Resident, ResidentStatus } from '../sse/client';

export type CustomResidentPayload = {
  id: string;
  name: string;
  room: string;
  status: ResidentStatus;
  lastSeenAt?: string;
  lastSeenLocation?: string;
};

export type SimulatorCommand =
  | { action: 'spawn' | 'burst' | 'mutate' | 'clear' | 'clearAll' }
  | { action: 'delete'; id: string }
  | { action: 'addCustom'; resident: CustomResidentPayload };

// 將指令送給 Service Worker，讓開發者能觸發連發或新增住民。
export const sendSimulatorMessage = async (payload: SimulatorCommand): Promise<boolean> => {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const target = registration.active ?? navigator.serviceWorker.controller;
    if (!target) {
      return false;
    }
    target.postMessage({
      type: 'simulator:broadcast',
      payload
    });
    return true;
  } catch (error) {
    console.warn('[Simulator] Unable to contact service worker', error);
    return false;
  }
};

export const simulatorActions = {
  singleUpdate: () => sendSimulatorMessage({ action: 'mutate' }),
  burstUpdate: () => sendSimulatorMessage({ action: 'burst' }),
  spawnResident: () => sendSimulatorMessage({ action: 'spawn' }),
  clearDynamicResidents: () => sendSimulatorMessage({ action: 'clear' }),
  clearAllResidents: () => sendSimulatorMessage({ action: 'clearAll' }),
  deleteResident: (id: string) => sendSimulatorMessage({ action: 'delete', id }),
  addCustomResident: (resident: CustomResidentPayload) => sendSimulatorMessage({ action: 'addCustom', resident })
};

export const fetchResidentSnapshot = async (): Promise<Resident[]> => {
  try {
    const response = await fetch('/sim/snapshot', {
      headers: {
        'Cache-Control': 'no-store',
        Accept: 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`Snapshot request failed: ${response.status}`);
    }
    const data = (await response.json()) as Resident[];
    return data;
  } catch (error) {
    console.warn('[Simulator] Snapshot fetch failed', error);
    throw error;
  }
};
