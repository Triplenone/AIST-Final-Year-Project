import { useId, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import type { Resident } from '../sse/client';
import { statusOptions, toLocalDateTimeInputValue } from '../utils/resident-derived';

export type CustomResidentFormValues = {
  name: string;
  room: string;
  status: Resident['status'];
  lastSeenAt: string;
  lastSeenLocation: string;
};

type ManualRefreshState = 'idle' | 'pending' | 'success' | 'error';
type SimulatorActionKey = 'singleUpdate' | 'burstUpdate' | 'spawn' | 'clearDynamic' | 'clearAll';

type SimulatorActionHandlers = Record<SimulatorActionKey, () => Promise<boolean>>;

type SimulatorControlsProps = {
  streamingEnabled: boolean;
  connected: boolean;
  onStartStream: () => void;
  onStopStream: () => void;
  manualRefreshState: ManualRefreshState;
  refreshError: string | null;
  lastManualRefresh: Date | null;
  onManualRefresh: () => Promise<void>;
  refreshIntervalSec: number;
  minRefreshInterval: number;
  onRefreshIntervalChange: (value: number) => void;
  autoRefreshEnabled: boolean;
  onToggleAutoRefresh: (enabled: boolean) => void;
  actions: SimulatorActionHandlers;
  onAddCustomResident: (input: CustomResidentFormValues) => Promise<void>;
};

const defaultCustomFormValues = (): CustomResidentFormValues => ({
  name: '',
  room: '',
  status: 'stable',
  lastSeenAt: toLocalDateTimeInputValue(new Date().toISOString()),
  lastSeenLocation: ''
});

export const SimulatorControls = ({
  streamingEnabled,
  connected,
  onStartStream,
  onStopStream,
  manualRefreshState,
  refreshError,
  lastManualRefresh,
  onManualRefresh,
  refreshIntervalSec,
  minRefreshInterval,
  onRefreshIntervalChange,
  autoRefreshEnabled,
  onToggleAutoRefresh,
  actions,
  onAddCustomResident
}: SimulatorControlsProps) => {
  const { t, i18n } = useTranslation();
  const intervalInputId = useId();
  const selectableStatuses = useMemo(
    () => statusOptions.filter((option) => option !== 'checked_out'),
    []
  );
  const liveStatusLabel = streamingEnabled
    ? connected
      ? t('residents.live.streaming')
      : t('residents.live.paused')
    : autoRefreshEnabled
      ? t('residents.live.manual')
      : t('residents.live.stopped');

  const [pendingAction, setPendingAction] = useState<SimulatorActionKey | null>(null);
  const [customFormOpen, setCustomFormOpen] = useState(false);
  const [customFormValues, setCustomFormValues] = useState<CustomResidentFormValues>(() => defaultCustomFormValues());
  const [customFormError, setCustomFormError] = useState<string | null>(null);
  const [customFormStatus, setCustomFormStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [customFormPending, setCustomFormPending] = useState(false);

  const lastRefreshLabel = useMemo(() => {
    if (!lastManualRefresh) {
      return t('simulator.refresh.never');
    }
    const formatter = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language ?? 'en', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    return formatter.format(lastManualRefresh);
  }, [i18n.language, i18n.resolvedLanguage, lastManualRefresh, t]);

  const manualRefreshMessage = useMemo(() => {
    if (manualRefreshState === 'pending') {
      return t('simulator.refresh.pending');
    }
    if (manualRefreshState === 'success') {
      return t('simulator.refresh.success', { time: lastRefreshLabel });
    }
    if (manualRefreshState === 'error') {
      return refreshError ?? t('simulator.refresh.error');
    }
    return lastManualRefresh ? t('simulator.refresh.lastRun', { time: lastRefreshLabel }) : null;
  }, [manualRefreshState, lastManualRefresh, lastRefreshLabel, refreshError, t]);

  const handleAction = async (action: SimulatorActionKey) => {
    if (pendingAction) {
      return;
    }
    setPendingAction(action);
    try {
      await actions[action]();
    } finally {
      setPendingAction(null);
    }
  };

  const toggleCustomForm = () => {
    setCustomFormOpen((previous) => !previous);
    setCustomFormError(null);
    setCustomFormStatus('idle');
  };

  const resetCustomForm = () => {
    setCustomFormValues(defaultCustomFormValues());
    setCustomFormError(null);
    setCustomFormStatus('idle');
  };

  const handleCustomInput = (field: keyof CustomResidentFormValues, value: string) => {
    setCustomFormValues((previous) => ({
      ...previous,
      [field]: value
    }));
    setCustomFormError(null);
    setCustomFormStatus('idle');
  };

  const handleCustomSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (customFormPending) {
      return;
    }
    const name = customFormValues.name.trim();
    const room = customFormValues.room.trim();
    if (!name) {
      setCustomFormError(t('simulator.dataset.errors.name'));
      return;
    }
    if (!room) {
      setCustomFormError(t('simulator.dataset.errors.room'));
      return;
    }
    setCustomFormPending(true);
    try {
      await onAddCustomResident({
        ...customFormValues,
        name,
        room
      });
      setCustomFormValues(defaultCustomFormValues());
      setCustomFormError(null);
      setCustomFormStatus('success');
    } catch (error) {
      console.warn('[Simulator] Failed to add custom resident', error);
      setCustomFormStatus('error');
      setCustomFormError(t('simulator.dataset.errors.generic'));
    } finally {
      setCustomFormPending(false);
    }
  };

  const manualRefreshDisabled = manualRefreshState === 'pending';
  const autoRefreshLabel = autoRefreshEnabled ? t('simulator.refresh.disable') : t('simulator.refresh.enable');

  return (
    <section className="simulator-panel" aria-label={t('devPanel.aria')}>
      <div className="simulator-panel__row">
        <div className="simulator-panel__group">
          <div className="simulator-panel__title">{t('simulator.live.title')}</div>
          <p className="simulator-panel__status">{liveStatusLabel}</p>
          <div className="simulator-panel__buttons">
            <button
              type="button"
              className="simulator-panel__button"
              onClick={onStartStream}
              disabled={streamingEnabled}
            >
              {t('simulator.live.start')}
            </button>
            <button
              type="button"
              className="simulator-panel__button"
              onClick={onStopStream}
              disabled={!streamingEnabled}
            >
              {t('simulator.live.stop')}
            </button>
          </div>
        </div>
        <div className="simulator-panel__group">
          <div className="simulator-panel__title">{t('simulator.refresh.title')}</div>
          <div className="simulator-panel__buttons">
            <button
              type="button"
              className="simulator-panel__button"
              disabled={manualRefreshDisabled}
              onClick={() => void onManualRefresh()}
            >
              {manualRefreshDisabled ? t('simulator.refresh.pending') : t('simulator.refresh.now')}
            </button>
            <button
              type="button"
              className={`simulator-panel__button ${autoRefreshEnabled ? 'simulator-panel__button--active' : ''}`}
              onClick={() => onToggleAutoRefresh(!autoRefreshEnabled)}
            >
              {autoRefreshLabel}
            </button>
          </div>
          <label htmlFor={intervalInputId} className="simulator-panel__label">
            {t('simulator.refresh.intervalLabel')}
            <input
              id={intervalInputId}
              type="number"
              min={minRefreshInterval}
              value={refreshIntervalSec}
              onChange={(event) => onRefreshIntervalChange(Number(event.target.value) || minRefreshInterval)}
            />
          </label>
          {manualRefreshMessage ? (
            <p
              className={`simulator-panel__feedback simulator-panel__feedback--${manualRefreshState}`}
              aria-live="polite"
            >
              {manualRefreshMessage}
            </p>
          ) : null}
        </div>
        <div className="simulator-panel__group">
          <div className="simulator-panel__title">{t('simulator.dataset.title')}</div>
          <div className="simulator-panel__buttons">
            <button
              type="button"
              className="simulator-panel__button"
              onClick={() => void handleAction('singleUpdate')}
              disabled={pendingAction !== null}
            >
              {t('devPanel.refresh')}
            </button>
            <button
              type="button"
              className="simulator-panel__button"
              onClick={() => void handleAction('burstUpdate')}
              disabled={pendingAction !== null}
            >
              {t('devPanel.burst')}
            </button>
            <button
              type="button"
              className="simulator-panel__button"
              onClick={() => void handleAction('spawn')}
              disabled={pendingAction !== null}
            >
              {t('devPanel.spawn')}
            </button>
          </div>
          <div className="simulator-panel__buttons">
            <button
              type="button"
              className="simulator-panel__button"
              onClick={() => void handleAction('clearDynamic')}
              disabled={pendingAction !== null}
            >
              {t('devPanel.clear')}
            </button>
            <button
              type="button"
              className="simulator-panel__button simulator-panel__button--danger"
              onClick={() => void handleAction('clearAll')}
              disabled={pendingAction !== null}
            >
              {t('simulator.actions.clearAll')}
            </button>
          </div>
        </div>
      </div>

      <div className="simulator-panel__custom">
        <button type="button" className="simulator-panel__toggle" onClick={toggleCustomForm}>
          {customFormOpen ? t('simulator.dataset.hideForm') : t('simulator.dataset.addCustom')}
        </button>
        {customFormOpen ? (
          <form className="simulator-panel__form" onSubmit={handleCustomSubmit}>
            <div className="simulator-panel__inputs">
              <label>
                <span>{t('residents.edit.name')}</span>
                <input
                  type="text"
                  value={customFormValues.name}
                  onChange={(event) => handleCustomInput('name', event.target.value)}
                />
              </label>
              <label>
                <span>{t('residents.edit.room')}</span>
                <input
                  type="text"
                  value={customFormValues.room}
                  onChange={(event) => handleCustomInput('room', event.target.value)}
                />
              </label>
              <label>
                <span>{t('residents.edit.status')}</span>
                <select
                  value={customFormValues.status}
                  onChange={(event) => handleCustomInput('status', event.target.value as Resident['status'])}
                >
                  {selectableStatuses.map((option) => (
                    <option key={option} value={option}>
                      {t(`residents.status.${option}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t('residents.edit.lastSeenAt')}</span>
                <input
                  type="datetime-local"
                  value={customFormValues.lastSeenAt}
                  onChange={(event) => handleCustomInput('lastSeenAt', event.target.value)}
                />
              </label>
              <label className="simulator-panel__full">
                <span>{t('residents.edit.lastSeenLocation')}</span>
                <input
                  type="text"
                  value={customFormValues.lastSeenLocation}
                  onChange={(event) => handleCustomInput('lastSeenLocation', event.target.value)}
                />
              </label>
            </div>
            {customFormError ? <p className="simulator-panel__feedback simulator-panel__feedback--error">{customFormError}</p> : null}
            {customFormStatus === 'success' ? (
              <p className="simulator-panel__feedback simulator-panel__feedback--success">
                {t('simulator.dataset.success')}
              </p>
            ) : null}
            <div className="simulator-panel__formActions">
              <button type="button" className="simulator-panel__button simulator-panel__button--ghost" onClick={resetCustomForm}>
                {t('simulator.dataset.reset')}
              </button>
              <button type="submit" className="simulator-panel__button simulator-panel__button--accent" disabled={customFormPending}>
                {customFormPending ? t('simulator.dataset.pending') : t('simulator.dataset.submit')}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </section>
  );
};
