// 儀表板殼層：結合隨機 KPI 與 SSE 推送的即時住民資料。
import './styles/global.css';

import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { LanguageSwitcher } from './components/LanguageSwitcher';
import {
  initialMetrics,
  metricOrder,
  type Metrics
} from './constants/metrics';
import { useResidentLiveStore } from './shared/resident-live-store';
import type { Resident } from './sse/client';
import {
  deriveAlertsFromResidents,
  deriveInsightsFromResidents,
  deriveResidentMetrics,
  primaryTimestamp,
  type RawMetrics
} from './utils/resident-derived';
import { AdminSection, type AdminTab } from './components/admin/AdminSection';
import { DashboardCharts } from './components/charts/DashboardCharts';
import { FallAlertModal } from './components/FallAlertModal';
import { LocationDashboard } from './components/LocationDashboard';
import { FlyCarePage } from './pages/FlyCarePage';
import { PositionPage } from './pages/PositionPage';
import { useBackendEvents } from './hooks/useBackendEvents';

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

type ThemeMode = 'light' | 'dark';

type ResidentPatch = Partial<Resident> & { roleType?: Resident['roleType'] };


const DEFAULT_ACCOUNTS: Account[] = [
  { username: 'guest_demo', password: 'guest123', role: 'guest' },
  { username: 'care_demo', password: 'care1234', role: 'caregiver' },
  { username: 'admin_master', password: 'admin888', role: 'admin' }
];

const STORAGE_KEYS = {
  accounts: 'smartcare-react-accounts',
  session: 'smartcare-react-session',
  theme: 'smartcare-theme'
} as const;

const hasWindow = () => typeof window !== 'undefined';

const INDOOR_ZONES = ['Bedroom 1', 'Bedroom 2', 'Bathroom', 'Common Lounge'];
const SIM_STATUSES: Resident['status'][] = ['high', 'followUp', 'stable'];

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(values: T[]) => values[randomInt(0, values.length - 1)];

const buildVitals = (status: Resident['status'], forceHighHr: boolean) => {
  const hr =
    forceHighHr || status === 'high'
      ? randomInt(115, 135)
      : status === 'followUp'
        ? randomInt(85, 110)
        : randomInt(60, 95);
  const spo2 = status === 'high' ? randomInt(90, 95) : status === 'followUp' ? randomInt(93, 97) : randomInt(96, 99);
  const temperature =
    status === 'high'
      ? Number((Math.random() * 0.6 + 37.8).toFixed(1))
      : Number((Math.random() * 0.6 + 36.4).toFixed(1));
  return {
    hr,
    bpSystolic: randomInt(105, 135),
    bpDiastolic: randomInt(65, 90),
    spo2,
    temperature
  };
};

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
  const [theme, setTheme] = useState<ThemeMode>(() => readStorage<ThemeMode>(STORAGE_KEYS.theme, 'light'));

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

  useEffect(() => {
    writeStorage(STORAGE_KEYS.theme, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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

  const { residents: residentMap, startStream, stopStream, updateResident, setDemoMode, demoMode } = useResidentLiveStore();
  const { activeEvents: fallEvents } = useBackendEvents({
    pollIntervalMs: 5000,
    limit: 300,
    activeStatuses: ['unhandled', 'confirmed'],
    includeTypes: ['fall']
  });

  const [now, setNow] = useState(() => Date.now());
  const [lastUpdated] = useState<Date>(() => new Date());
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics);
  const previousRawMetricsRef = useRef<RawMetrics | null>(null);
  const [showFallAlertModal, setShowFallAlertModal] = useState(false);
  const [positionHeaderActionsOpen, setPositionHeaderActionsOpen] = useState(false);
  const [adminActiveTab, setAdminActiveTab] = useState<AdminTab>('residents');
  const knownFallEventIdsRef = useRef<Set<number>>(new Set());
  const fallEventsInitializedRef = useRef(false);

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

  const statusChartData = useMemo(() => {
    const statusKeys: Resident['status'][] = ['stable', 'followUp', 'high', 'checked_out'];
    const tally: Record<Resident['status'], number> = {
      stable: 0,
      followUp: 0,
      high: 0,
      checked_out: 0
    };

    residentList.forEach((resident) => {
      tally[resident.status] = (tally[resident.status] ?? 0) + 1;
    });

    return statusKeys
      .map((status) => ({
        name: t(`residents.status.${status}`),
        value: tally[status]
      }))
      .filter((item) => item.value > 0);
  }, [residentList, t]);

  const zoneChartData = useMemo(() => {
    const tally = new Map<string, number>();

    residentList.forEach((resident) => {
      if (resident.checkedOut) return;
      const rawLabel = resident.lastSeenLocation?.trim() || resident.room?.trim() || '';
      const label = rawLabel || t('location.zones.unknown');
      tally.set(label, (tally.get(label) ?? 0) + 1);
    });

    return Array.from(tally.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [residentList, t]);

  const alertTrendData = useMemo(() => {
    const bucketCount = 6;
    const bucketMs = 60 * 60 * 1000;
    const start = now - bucketCount * bucketMs;
    const formatter = new Intl.DateTimeFormat(activeLanguage, {
      hour: '2-digit',
      minute: '2-digit'
    });
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
      const bucketEnd = new Date(start + (index + 1) * bucketMs);
      return { name: formatter.format(bucketEnd), alerts: 0 };
    });

    const pushToBucket = (timestamp: number) => {
      const bucketIndex = Math.floor((timestamp - start) / bucketMs);
      if (bucketIndex >= 0 && bucketIndex < bucketCount) {
        buckets[bucketIndex].alerts += 1;
      }
    };

    residentList.forEach((resident) => {
      if (resident.checkedOut) return;
      if (resident.status !== 'high' && resident.status !== 'followUp') return;
      const timestamp = primaryTimestamp(resident);
      if (!timestamp) return;
      const parsed = Date.parse(timestamp);
      if (Number.isNaN(parsed)) return;
      pushToBucket(parsed);
    });

    return buckets;
  }, [residentList, now, activeLanguage]);

  const chartLabels = useMemo(
    () => ({
      statusTitle: t('charts.status.title'),
      statusSubtitle: t('charts.status.subtitle'),
      zoneTitle: t('charts.zones.title'),
      zoneSubtitle: t('charts.zones.subtitle'),
      alertsTitle: t('charts.alerts.title'),
      alertsSubtitle: t('charts.alerts.subtitle'),
      alertsSeries: t('charts.alerts.series'),
      empty: t('charts.empty')
    }),
    [t]
  );

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
    startStream();
    return () => {
      stopStream();
    };
  }, [startStream, stopStream]);

  const fallEventIds = useMemo(
    () => new Set(fallEvents.map((e) => e.event_id)),
    [fallEvents]
  );

  useEffect(() => {
    if (!fallEventsInitializedRef.current) {
      knownFallEventIdsRef.current = new Set(fallEventIds);
      fallEventsInitializedRef.current = true;
      return;
    }
    const known = knownFallEventIdsRef.current;
    for (const id of fallEventIds) {
      if (!known.has(id)) {
        known.add(id);
        setShowFallAlertModal(true);
        break;
      }
    }
  }, [fallEventIds]);

  const location = useLocation();
  const navigate = useNavigate();
  const handleGoToEvents = useCallback(() => {
    setShowFallAlertModal(false);
    if (location.pathname === '/position' || location.pathname === '/flycare') {
      navigate('/');
    }
    setAdminActiveTab('events');
    setTimeout(() => document.getElementById('admin')?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [location.pathname, navigate]);

  const formattedTime = useMemo(() => {
    return new Intl.DateTimeFormat(activeLanguage, {
      hour: '2-digit',
      minute: '2-digit'
    }).format(lastUpdated);
  }, [activeLanguage, lastUpdated]);

  const isLoggedIn = Boolean(session);
  const userDisplayName = session?.username ?? t('auth.guestName');
  const userRoleLabel = t(`auth.roles.${session?.role ?? 'guest'}`);
  const signButtonLabel = t(isLoggedIn ? 'auth.signOut' : 'auth.signIn');
  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const handleSimulateNewData = useCallback(() => {
    const targetResidents = residentList.slice(0, 7);
    if (targetResidents.length === 0) return;

    setDemoMode(true);
    const caregiverIndex = randomInt(0, targetResidents.length - 1);
    const statusAssignments = targetResidents.map(() => pick(SIM_STATUSES));

    if (!statusAssignments.includes('high')) {
      statusAssignments[randomInt(0, statusAssignments.length - 1)] = 'high';
    }
    if (!statusAssignments.includes('followUp') && statusAssignments.length > 1) {
      statusAssignments[randomInt(0, statusAssignments.length - 1)] = 'followUp';
    }

    targetResidents.forEach((resident, index) => {
      const status = statusAssignments[index] ?? 'stable';
      const roleType = index === caregiverIndex ? 'caregiver' : 'elderly';
      const forceHighHr = roleType === 'elderly' && status === 'high';
      const minutesAgo = randomInt(0, 90);
      const lastSeenAt = new Date(Date.now() - minutesAgo * 60000).toISOString();
      const lastSeenLocation = pick(INDOOR_ZONES);

      const updates: ResidentPatch = {
        status,
        roleType,
        lastSeenLocation,
        lastSeenAt,
        vitals: buildVitals(status, forceHighHr),
        checkedOut: false
      };

      updateResident(resident.id, updates);
    });
  }, [residentList, setDemoMode, updateResident]);

  const handleExitDemoMode = useCallback(() => {
    setDemoMode(false);
  }, [setDemoMode]);

  const isPositionPage = location.pathname === '/position';
  const isFlyCarePage = location.pathname === '/flycare';
  const isPositionLikePage = isPositionPage || isFlyCarePage;

  return (
    <div className={`app-background${isPositionLikePage ? ' app-background--position' : ''}`}>
      <main className="app-shell">
        <header className={`app-header${isFlyCarePage ? ' app-header--flycare' : ''}`}>
          <div className="brand">
            <span className="brand-mark">{isFlyCarePage ? t('layout.flycareBrand') : t('layout.title')}</span>
            <p className="brand-tagline">
              {isFlyCarePage ? 'Smart Wearable Safety System for International Airport' : t('layout.subtitle')}
            </p>
          </div>
          {!isFlyCarePage && (
            <nav className="header-nav" aria-label={t('layout.nav.aria')}>
              <>
                {isPositionLikePage ? <Link to="/">{t('layout.nav.overview')}</Link> : <a href="#overview">{t('layout.nav.overview')}</a>}
                <a href={isPositionLikePage ? '/#residents' : '#residents'}>{t('layout.nav.residents')}</a>
                <a href={isPositionLikePage ? '/#location' : '#location'}>{t('layout.nav.location')}</a>
                <Link to="/position">{t('layout.nav.position')}</Link>
                <Link to="/flycare">{t('layout.nav.flycare')}</Link>
                <a href={isPositionLikePage ? '/#operations' : '#operations'}>{t('layout.nav.operations')}</a>
                <a href={isPositionLikePage ? '/#family' : '#family'}>{t('layout.nav.family')}</a>
                <a href={isPositionLikePage ? '/#admin' : '#admin'}>{t('layout.nav.admin')}</a>
              </>
            </nav>
          )}
          {!isPositionLikePage && (
            <div className="actions">
              <LanguageSwitcher />
              <button type="button" className="theme-toggle" onClick={toggleTheme}>
                {theme === 'light' ? 'Dark mode' : 'Light mode'}
              </button>
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
          )}
        </header>

        {isPositionLikePage ? (
          <>
            {isPositionPage && <PositionPage onSosOrFallDetected={() => setShowFallAlertModal(true)} />}
            {isFlyCarePage && <FlyCarePage onSosOrFallDetected={() => setShowFallAlertModal(true)} />}
            <div className="actions-drawer" aria-label="页面操作">
              <button
                type="button"
                className="actions-toggle"
                onClick={() => setPositionHeaderActionsOpen((v) => !v)}
                aria-expanded={positionHeaderActionsOpen}
                aria-label={positionHeaderActionsOpen ? '收起侧栏' : '展开侧栏'}
                title={positionHeaderActionsOpen ? '收起侧栏' : '展开侧栏'}
              >
                <span className="actions-toggle__arrow" aria-hidden>{positionHeaderActionsOpen ? '◀' : '▶'}</span>
              </button>
              <div className={`actions-panel${positionHeaderActionsOpen ? ' actions-panel--open' : ''}`}>
                <div className="actions">
                  <LanguageSwitcher openUpward />
                  <button type="button" className="theme-toggle" onClick={toggleTheme}>
                    {theme === 'light' ? 'Dark mode' : 'Light mode'}
                  </button>
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
              </div>
            </div>
          </>
        ) : (
        <>
        <section id="overview" className="section hero">
          <div className="hero-copy">
            <p className="eyebrow">{t('hero.eyebrow')}</p>
            <h1>{t('hero.title')}</h1>
            <p>{t('hero.description')}</p>
          </div>
          <div className="hero-actions">
            <button type="button" className="primary" onClick={handleSimulateNewData}>
              {t('actions.simulate')}
            </button>
            {demoMode ? (
              <button type="button" className="secondary" onClick={handleExitDemoMode}>
                {t('actions.exitDemo')}
              </button>
            ) : null}
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

        <section className="section charts-section">
          <header className="section-heading">
            <div>
              <h2>{t('charts.title')}</h2>
              <p className="muted">{t('charts.subtitle')}</p>
            </div>
          </header>
          <DashboardCharts
            statusData={statusChartData}
            zoneData={zoneChartData}
            alertTrendData={alertTrendData}
            labels={chartLabels}
          />
        </section>

        <LocationDashboard />

        <section id="residents" className="residents">
          <AdminSection activeTab={adminActiveTab} onTabChange={setAdminActiveTab} />
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
        </>
        )}
      </main>

      {showFallAlertModal ? (
        <FallAlertModal onGoToEvents={handleGoToEvents} />
      ) : null}

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
                {authMode === 'signin' ? (
                  <input name="password" type="password" autoComplete="current-password" />
                ) : (
                  <input name="password" type="password" autoComplete="new-password" />
                )}
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

    </div>
  );
}
