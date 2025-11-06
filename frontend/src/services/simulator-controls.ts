// 開發模式下與 SSE 模擬器 Service Worker 溝通的工具。
export type SimulatorCommand =
  | { action: 'spawn' | 'burst' | 'mutate' | 'clear' }
  | { action: 'delete'; id: string };

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
