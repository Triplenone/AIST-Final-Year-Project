// 浮動於畫面右上的模擬器控制面板，供管理員調整示範數據。
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { sendSimulatorMessage } from '../services/simulator-controls';
import type { SimulatorCommand } from '../services/simulator-controls';

type PanelState = 'idle' | 'pending' | 'success' | 'error';

type DevPanelProps = {
  onHide: () => void;
};

export const DevPanel = ({ onHide }: DevPanelProps) => {
  const { t } = useTranslation();
  const [state, setState] = useState<PanelState>('idle');
  const [activeAction, setActiveAction] = useState<SimulatorCommand['action'] | null>(null);

  const isPending = state === 'pending';
  const statusLabel = useMemo(() => {
    if (state === 'success') return t('devPanel.sent');
    if (state === 'error') return t('devPanel.error');
    return null;
  }, [state, t]);

  // 將按鈕操作轉交給 Service Worker，並提供簡單的狀態回饋。
  const send = async (command: SimulatorCommand) => {
    setState('pending');
    setActiveAction(command.action);
    const ok = await sendSimulatorMessage(command);
    setState(ok ? 'success' : 'error');
    window.setTimeout(() => {
      setState('idle');
      setActiveAction(null);
    }, 2400);
  };

  return (
    <aside className="dev-panel" aria-label={t('devPanel.aria')}>
      <div className="dev-panel__header">
        <span className="dev-panel__title">{t('devPanel.title')}</span>
        <button type="button" className="dev-panel__toggle" onClick={onHide}>
          {t('devPanel.hide')}
        </button>
      </div>
      <div className="dev-panel__body">
        <button
          type="button"
          className="dev-panel__button"
          disabled={isPending}
          onClick={() => void send({ action: 'mutate' })}
        >
          {isPending && activeAction === 'mutate' ? t('devPanel.pending') : t('devPanel.refresh')}
        </button>
        <button
          type="button"
          className="dev-panel__button"
          disabled={isPending}
          onClick={() => void send({ action: 'burst' })}
        >
          {isPending && activeAction === 'burst' ? t('devPanel.pending') : t('devPanel.burst')}
        </button>
        <button
          type="button"
          className="dev-panel__button"
          disabled={isPending}
          onClick={() => void send({ action: 'spawn' })}
        >
          {isPending && activeAction === 'spawn' ? t('devPanel.pending') : t('devPanel.spawn')}
        </button>
        <button
          type="button"
          className="dev-panel__button"
          disabled={isPending}
          onClick={() => void send({ action: 'clear' })}
        >
          {isPending && activeAction === 'clear' ? t('devPanel.pending') : t('devPanel.clear')}
        </button>
      </div>
      {statusLabel ? <div className={`dev-panel__status dev-panel__status--${state}`}>{statusLabel}</div> : null}
    </aside>
  );
};
