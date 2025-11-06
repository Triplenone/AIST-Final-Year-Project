// 儀表板殼層：結合隨機 KPI 與 SSE 推送的即時住民資料。
import './styles/global.css';

import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DevPanel } from './components/DevPanel';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import {
  initialMetrics,
  metricOrder,
  type MetricKey,
  type Metrics
} from './constants/metrics';
import { useResidentEditor } from './hooks/useResidentEditor';
import type { ResidentEditDraft } from './hooks/useResidentEditor';
import { sendSimulatorMessage } from './services/simulator-controls';
import { useResidentLiveStore } from './shared/resident-live-store';
import type { Resident } from './sse/client';
import {
  deriveAlertsFromResidents,
  deriveInsightsFromResidents,
  deriveResidentMetrics,
  statusOptions,
  type RawMetrics
} from './utils/resident-derived';

type Role = 'guest' | 'caregiver' | 'admin';

type Account = {
  username: string;
  password: string;
  role: Role;
};

type Session = {
  username: string;
  role: Role;
};

const filterOptions = ['all', 'high', 'followUp', 'stable'] as const;
type FilterKey = (typeof filterOptions)[number];

const DEFAULT_ACCOUNTS: Account[] = [
  { username: 'guest_demo', password: 'guest123', role: 'guest' },
  { username: 'care_demo', password: 'care1234', role: 'caregiver' },
  { username: 'admin_master', password: 'admin888', role: 'admin' }
];

const STORAGE_KEYS = {
  accounts: 'smartcare-react-accounts',
  session: 'smartcare-react-session'
} as const;

const hasWindow = () => typeof window !== 'undefined';

function readStorage<T>(key: string, fallback: T): T {
  if (!hasWindow()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota issues
  }
}

function removeStorage(key: string) {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

type Alerts = ReturnType<typeof deriveAlertsFromResidents>;
type Alert = Alerts[number];
type Insights = ReturnType<typeof deriveInsightsFromResidents>;
type Insight = Insights[number];

export default function App() {
  const { t, i18n } = useTranslation();
  const activeLanguage = i18n.resolvedLanguage ?? i18n.language ?? 'en';

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const stored = readStorage<Account[]>(STORAGE_KEYS.accounts, []);
    return stored.length ? stored : DEFAULT_ACCOUNTS;
  });
  const [session, setSession] = useState<Session | null>(() =>
    readStorage<Session | null>(STORAGE_KEYS.session, null)
  );
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const authFirstFieldRef = useRef<HTMLInputElement | null>(null);
  const [showSimulatorControls, setShowSimulatorControls] = useState<boolean>(false);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.accounts, accounts);
  }, [accounts]);

  useEffect(() => {
    if (session) {
      writeStorage(STORAGE_KEYS.session, session);
    } else {
      removeStorage(STORAGE_KEYS.session);
    }
  }, [session]);

  useEffect(() => {
    if (session?.role === 'admin') {
      setShowSimulatorControls(true);
    } else {
      setShowSimulatorControls(false);
    }
  }, [session]);

  const closeAuth = useCallback(() => {
    setAuthMode(null);
    setAuthError(null);
    setAuthInfo(null);
  }, []);

  const openAuth = useCallback((mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setAuthError(null);
    setAuthInfo(null);
  }, []);

  const switchAuthMode = useCallback(
    (mode: 'signin' | 'signup', options?: { preserveInfo?: boolean }) => {
      setAuthMode(mode);
      setAuthError(null);
      if (!options?.preserveInfo) {
        setAuthInfo(null);
      }
    },
    []
  );

  useEffect(() => {
    if (!authMode) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAuth();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [authMode, closeAuth]);

  useEffect(() => {
    if (authMode && authFirstFieldRef.current) {
      authFirstFieldRef.current.focus();
    }
  }, [authMode]);

  const handleSignOut = useCallback(() => {
    setSession(null);
  }, []);

  const handleSignInSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const username = String(formData.get('username') ?? '').trim();
      const password = String(formData.get('password') ?? '');

      setAuthError(null);
      const matchedAccount = accounts.find(
        (account) => account.username === username && account.password === password
      );

      if (!matchedAccount) {
        setAuthError(t('auth.errors.invalidCredentials'));
        return;
      }

      setSession({ username: matchedAccount.username, role: matchedAccount.role });
      event.currentTarget.reset();
      closeAuth();
    },
    [accounts, closeAuth, t]
  );

  const handleSignUpSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      const username = String(formData.get('username') ?? '').trim();
      const password = String(formData.get('password') ?? '');
      const roleValue = String(formData.get('role') ?? 'guest') as Role;
      const nextRole: Role = roleValue === 'caregiver' ? 'caregiver' : 'guest';

      setAuthError(null);
      if (!/^[\w.-]{2,}$/i.test(username)) {
        setAuthError(t('auth.errors.usernameFormat'));
        return;
      }
      if (password.length < 4) {
        setAuthError(t('auth.errors.passwordLength'));
        return;
      }
      const exists = accounts.some((account) => account.username === username);
      if (exists) {
        setAuthError(t('auth.errors.usernameTaken'));
        return;
      }

      const nextAccount: Account = {
        username,
        password,
        role: nextRole
      };

      setAccounts((prev) => [...prev, nextAccount]);
      event.currentTarget.reset();
      setAuthInfo(t('auth.feedback.accountCreated'));
      switchAuthMode('signin', { preserveInfo: true });
      setAuthError(null);
    },
    [accounts, switchAuthMode, t]
  );

  const { residents: residentMap, lastEventAt, connected, updateResident, removeResident } = useResidentLiveStore();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [now, setNow] = useState(() => Date.now());
  const [lastUpdated, setLastUpdated] = useState<Date>(() => new Date());
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics);
  const previousRawMetricsRef = useRef<RawMetrics | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const residentList = useMemo<Resident[]>(() => {
    const values = Object.values(residentMap);
    return values
      .map((resident) => ({
        ...resident,
        updatedAt: resident.updatedAt ?? resident.createdAt
      }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [residentMap]);

  const filteredResidents = useMemo(() => {
    if (filter === 'all') {
      return residentList;
    }
    return residentList.filter((resident) => resident.status === filter);
  }, [filter, residentList]);

  const lastSeenFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(activeLanguage, {
        hour: '2-digit',
        minute: '2-digit'
      }),
    [activeLanguage]
  );

  const alerts = useMemo<Alert[]>(() => {
    return deriveAlertsFromResidents(residentList, now, lastSeenFormatter, t);
  }, [residentList, now, lastSeenFormatter, t]);

  const insights = useMemo<Insight[]>(() => {
    return deriveInsightsFromResidents(residentList, now, t);
  }, [residentList, now, t]);

  useEffect(() => {
    const raw = deriveResidentMetrics(residentList, now);
    const previous = previousRawMetricsRef.current ?? raw;
    const next: Metrics = {
      wellbeing: {
        value: raw.wellbeing,
        delta: raw.wellbeing - previous.wellbeing
      },
      alertsResolved: {
        value: raw.alertsResolved,
        delta: raw.alertsResolved - previous.alertsResolved
      },
      responseTime: {
        value: raw.responseTime,
        delta: raw.responseTime - previous.responseTime
      }
    };
    previousRawMetricsRef.current = raw;
    setMetrics(next);
  }, [residentList, now]);

  useEffect(() => {
    if (!lastEventAt) {
      return;
    }
    const eventDate = new Date(lastEventAt);
    setLastUpdated(Number.isNaN(eventDate.getTime()) ? new Date() : eventDate);
  }, [lastEventAt]);

  const formattedTime = useMemo(() => {
    return new Intl.DateTimeFormat(activeLanguage, {
      hour: '2-digit',
      minute: '2-digit'
    }).format(lastUpdated);
  }, [activeLanguage, lastUpdated]);

  const formatLastSeen = useCallback(
    (resident: Resident) => {
      const baseTimestamp = resident.lastSeenAt ?? resident.updatedAt ?? resident.createdAt;
      if (!baseTimestamp) {
        return t('residents.lastSeen.waiting');
      }
      const formatted = lastSeenFormatter.format(new Date(baseTimestamp));
      const location = resident.lastSeenLocation ?? resident.room;
      return t('residents.lastSeen.label', { time: formatted, location });
    },
    [lastSeenFormatter, t]
  );

  const describeVitals = useCallback(
    (resident: Resident) => {
      const vitals = resident.vitals;
      if (!vitals) {
        return t('residents.vitals.unknown');
      }
      const bp = t('residents.vitals.bp', { systolic: vitals.bpSystolic, diastolic: vitals.bpDiastolic });
      const hr = t('residents.vitals.hr', { value: vitals.hr });
      const spo2 = t('residents.vitals.spo2', { value: vitals.spo2 });
      const temp = t('residents.vitals.temp', { value: vitals.temperature.toFixed(1) });
      return `${bp} • ${hr} • ${spo2} • ${temp}`;
    },
    [t]
  );

  const lastEventBadge = useMemo(() => {
    if (!lastEventAt) {
      return null;
    }
    const elapsedSeconds = Math.max(0, Math.floor((now - lastEventAt) / 1000));
    const minutes = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
    const seconds = String(elapsedSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  }, [lastEventAt, now]);

  const isLoggedIn = Boolean(session);
  const isAdmin = session?.role === 'admin';
  const userDisplayName = session?.username ?? t('auth.guestName');
  const userRoleLabel = t(`auth.roles.${session?.role ?? 'guest'}`);
  const signButtonLabel = t(isLoggedIn ? 'auth.signOut' : 'auth.signIn');

  const liveStatusText = connected ? t('residents.live.streaming') : t('residents.live.paused');

  const handleSimulate = useCallback(() => {
    void sendSimulatorMessage({ action: 'mutate' });
  }, []);

  const handleResidentDelete = useCallback(
    (id: string, resident: Resident) => {
      removeResident(id);
      void sendSimulatorMessage({ action: 'delete', id: resident.id });
    },
    [removeResident]
  );

  const {
    editingResident,
    draft: editDraft,
    error: editError,
    beginEdit,
    cancelEdit,
    updateDraft,
    handleSubmit: submitEdit,
    handleDelete: deleteResident
  } = useResidentEditor({ residents: residentMap, onSave: updateResident, onRemove: handleResidentDelete, t });

  const showEditModal = Boolean(isAdmin && editingResident && editDraft);

  return (
    <div className="app-background">
      {isAdmin && showSimulatorControls ? <DevPanel onHide={() => setShowSimulatorControls(false)} /> : null}
      <main className="app-shell">
        <header className="app-header">
          <div className="brand">
            <span className="brand-mark">SmartCare</span>
            <p className="brand-tagline">{t('layout.subtitle')}</p>
          </div>
          <nav className="header-nav" aria-label={t('layout.nav.aria')}>
            <a href="#overview">{t('layout.nav.overview')}</a>
            <a href="#residents">{t('layout.nav.residents')}</a>
            <a href="#operations">{t('layout.nav.operations')}</a>
            <a href="#family">{t('layout.nav.family')}</a>
          </nav>
          <div className="header-actions">
            {isAdmin && !showSimulatorControls ? (
              <button
                type="button"
                className="header-actions__button"
                onClick={() => setShowSimulatorControls(true)}
              >
                {t('devPanel.show')}
              </button>
            ) : null}
            <LanguageSwitcher />
            <div className="auth-menu" aria-live="polite">
              <div className="auth-menu__details">
                <span className="auth-menu__name">{userDisplayName}</span>
                <span className="auth-menu__role">{userRoleLabel}</span>
              </div>
              <button
                type="button"
                className="auth-menu__button"
                onClick={isLoggedIn ? handleSignOut : () => openAuth('signin')}
              >
                {signButtonLabel}
              </button>
            </div>
          </div>
        </header>

        <section id="overview" className="section hero">
          <div className="hero-copy">
            <p className="eyebrow">{t('hero.eyebrow')}</p>
            <h1>{t('hero.title')}</h1>
            <p>{t('hero.description')}</p>
          </div>
          <div className="hero-actions">
            <button type="button" className="primary" onClick={handleSimulate}>
              {t('actions.simulate')}
            </button>
            <span className="timestamp" aria-live="polite">
              {t('hero.lastUpdated', { time: formattedTime })}
            </span>
          </div>
        </section>

        <section className="section metrics">
          <div className="metrics-grid">
            {metricOrder.map((metricKey) => {
              const metric = metrics[metricKey];
              const isPositive = metric.delta >= 0;
              const deltaLabel =
                metricKey === 'responseTime'
                  ? t('stats.delta.minutes', { count: Math.abs(metric.delta) })
                  : t('stats.delta.points', { count: Math.abs(metric.delta) });
              return (
                <article key={metricKey} className="metric-card">
                  <header>
                    <h2>{t(`stats.${metricKey}.title`)}</h2>
                    <span
                      className={`metric-delta ${isPositive ? 'delta-up' : 'delta-down'}`}
                      aria-label={t('stats.delta.label', {
                        direction: isPositive ? t('stats.delta.up') : t('stats.delta.down'),
                        delta: deltaLabel
                      })}
                    >
                      {isPositive ? '+' : '-'}
                      {deltaLabel}
                    </span>
                  </header>
                  <p className="metric-value">
                    {metricKey === 'responseTime' ? `${metric.value} ${t('stats.responseTime.unit')}` : metric.value}
                  </p>
                  <p className="metric-description">{t(`stats.${metricKey}.description`)}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="residents" className="section residents">
          <header className="section-heading">
            <div>
              <h2>{t('residents.title')}</h2>
              <p>{t('residents.subtitle')}</p>
              <div className="live-monitor" role="status" aria-live="polite">
                <span className="live-monitor__badge">{t('residents.live.badge')}</span>
                <span>{liveStatusText}</span>
                {lastEventBadge ? <span>• {t('residents.live.lastEvent', { time: lastEventBadge })}</span> : null}
              </div>
            </div>
            <div className="filters" role="group" aria-label={t('residents.filters.aria')}>
              {filterOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`chip ${filter === option ? 'chip--active' : ''}`}
                  onClick={() => setFilter(option)}
                >
                  {t(`filters.${option}`)}
                </button>
              ))}
            </div>
          </header>
          <div className="table-wrapper">
            <table>
              <caption className="sr-only">{t('residents.tableCaption')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('residents.columns.name')}</th>
                  <th scope="col">{t('residents.columns.room')}</th>
                  <th scope="col">{t('residents.columns.lastCheck')}</th>
                  <th scope="col">{t('residents.columns.vitals')}</th>
                  <th scope="col">{t('residents.columns.status')}</th>
                  {isAdmin ? <th scope="col">{t('residents.columns.actions')}</th> : null}
                </tr>
              </thead>
              <tbody>
                {filteredResidents.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="empty-placeholder">
                      {t('residents.empty')}
                    </td>
                  </tr>
                ) : (
                  filteredResidents.map((resident) => (
                    <tr key={resident.id}>
                      <td data-title={t('residents.columns.name')}>{resident.name}</td>
                      <td data-title={t('residents.columns.room')}>{resident.room}</td>
                      <td data-title={t('residents.columns.lastCheck')}>{formatLastSeen(resident)}</td>
                      <td data-title={t('residents.columns.vitals')}>{describeVitals(resident)}</td>
                      <td data-title={t('residents.columns.status')}>
                        <span className={`status status-${resident.status}`}>
                          {t(`residents.status.${resident.status}`, { defaultValue: resident.status })}
                        </span>
                      </td>
                      {isAdmin ? (
                        <td data-title={t('residents.columns.actions')}>
                          <button type="button" className="table-action-button" onClick={() => beginEdit(resident)}>
                            {t('residents.actions.edit')}
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section id="operations" className="section split">
          <article className="panel">
            <header className="section-heading">
              <h2>{t('alerts.title')}</h2>
              <span className="chip chip--quiet">{t('alerts.subtitle')}</span>
            </header>
            <ul className="alert-list">
              {alerts.map((alert) => (
                <li key={alert.id} className={`alert alert-${alert.level}`}>
                  <span className="alert-pill">{t(`alertLevels.${alert.level}`)}</span>
                  <span className="alert-text">{alert.message}</span>
                  <time className="alert-time" dateTime={alert.timestamp ?? undefined}>
                    {alert.time}
                  </time>
                </li>
              ))}
            </ul>
          </article>
          <article id="family" className="panel">
            <header className="section-heading">
              <h2>{t('insights.title')}</h2>
              <span className="chip chip--quiet">{t('insights.subtitle')}</span>
            </header>
            <ul className="insight-list">
              {insights.map((insight) => (
                <li key={insight.id}>{insight.text}</li>
              ))}
            </ul>
          </article>
        </section>

        <section id="next" className="section next-steps">
          <header className="section-heading">
            <h2>{t('nextSteps.title')}</h2>
          </header>
          <ul className="next-steps-list">
            <li>{t('nextSteps.mapDataGateway')}</li>
            <li>{t('nextSteps.portTokens')}</li>
            <li>{t('nextSteps.addRouting')}</li>
          </ul>
        </section>
      </main>

      {authMode ? (
        <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
          <div className="auth-modal__backdrop" onClick={closeAuth} role="presentation" />
          <div className="auth-modal__dialog" role="document">
            <button type="button" className="auth-modal__close" onClick={closeAuth} aria-label={t('common.close')}>
              ×
            </button>
            <h2 id="auth-modal-title">{t(authMode === 'signin' ? 'auth.signInTitle' : 'auth.signUpTitle')}</h2>
            {authError ? (
              <div className="auth-modal__alert auth-modal__alert--error" role="alert">
                {authError}
              </div>
            ) : null}
            {authInfo ? (
              <div className="auth-modal__alert auth-modal__alert--info" role="status">
                {authInfo}
              </div>
            ) : null}
            <form
              className="auth-modal__form"
              onSubmit={authMode === 'signin' ? handleSignInSubmit : handleSignUpSubmit}
              noValidate
            >
              <label>
                <span>{t('auth.username')}</span>
                <input ref={authFirstFieldRef} name="username" type="text" autoComplete="username" />
              </label>
              <label>
                <span>{t('auth.password')}</span>
                <input name="password" type="password" autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'} />
              </label>
              {authMode === 'signup' ? (
                <label>
                  <span>{t('auth.role')}</span>
                  <select name="role" defaultValue="guest">
                    <option value="guest">{t('auth.roles.guest')}</option>
                    <option value="caregiver">{t('auth.roles.caregiver')}</option>
                  </select>
                </label>
              ) : null}
              <button type="submit" className="primary auth-modal__submit">
                {t(authMode === 'signin' ? 'auth.continue' : 'auth.create')}
              </button>
            </form>
            <p className="auth-modal__switch">
              {authMode === 'signin' ? (
                <>
                  {t('auth.noAccount')}{' '}
                  <button type="button" className="auth-modal__link" onClick={() => switchAuthMode('signup')}>
                    {t('auth.toSignUp')}
                  </button>
                </>
              ) : (
                <>
                  {t('auth.haveAccount')}{' '}
                  <button type="button" className="auth-modal__link" onClick={() => switchAuthMode('signin')}>
                    {t('auth.toSignIn')}
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      ) : null}

      {showEditModal && editingResident && editDraft ? (
        <div className="resident-edit-backdrop" role="presentation">
          <div
            className="resident-edit-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="resident-edit-title"
          >
            <form className="resident-edit-form" onSubmit={submitEdit}>
              <h2 id="resident-edit-title">{t('residents.edit.title')}</h2>
              <div className="resident-edit-grid">
                <label className="resident-edit-field">
                  <span>{t('residents.edit.name')}</span>
                  <input
                    type="text"
                    value={editDraft.name}
                    onChange={(event) => updateDraft('name', event.target.value)}
                  />
                </label>
                <label className="resident-edit-field">
                  <span>{t('residents.edit.room')}</span>
                  <input
                    type="text"
                    value={editDraft.room}
                    onChange={(event) => updateDraft('room', event.target.value)}
                  />
                </label>
                <label className="resident-edit-field">
                  <span>{t('residents.edit.status')}</span>
                  <select
                    value={editDraft.status}
                    onChange={(event) => updateDraft('status', event.target.value as ResidentEditDraft['status'])}
                  >
                    {statusOptions.map((option) => (
                      <option key={option} value={option}>
                        {t(`residents.status.${option}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="resident-edit-field">
                  <span>{t('residents.edit.lastSeenAt')}</span>
                  <input
                    type="datetime-local"
                    value={editDraft.lastSeenAt}
                    onChange={(event) => updateDraft('lastSeenAt', event.target.value)}
                  />
                </label>
                <label className="resident-edit-field resident-edit-field--wide">
                  <span>{t('residents.edit.lastSeenLocation')}</span>
                  <input
                    type="text"
                    value={editDraft.lastSeenLocation}
                    onChange={(event) => updateDraft('lastSeenLocation', event.target.value)}
                  />
                </label>
              </div>
              {editError ? <div className="resident-edit-error">{editError}</div> : null}
              <div className="resident-edit-actions">
                {editingResident.origin !== 'seed' ? (
                  <button type="button" className="resident-edit-delete" onClick={deleteResident}>
                    {t('residents.edit.delete')}
                  </button>
                ) : (
                  <span aria-hidden="true" />
                )}
                <div className="resident-edit-actions__group">
                  <button type="button" className="resident-edit-cancel" onClick={cancelEdit}>
                    {t('residents.edit.cancel')}
                  </button>
                  <button type="submit" className="primary">
                    {t('residents.edit.save')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
