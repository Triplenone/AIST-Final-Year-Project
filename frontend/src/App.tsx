import './styles/global.css';
import './styles/tokens.css';
import './styles/app-shell.css';
import './styles/overview.css';

import type { FormEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

import { FallAlertModal } from './components/FallAlertModal';
import { ResidentsAdmin } from './components/admin/ResidentsAdmin';
import { AdminSection, type AdminTab } from './components/admin/AdminSection';
import { AppHeader } from './components/shell/AppHeader';
import { AuthModal } from './components/shell/AuthModal';
import { QuickActionsDock } from './components/shell/QuickActionsDock';
import { OverviewExperience } from './components/overview/OverviewExperience';
import { LocationDashboard } from './components/LocationDashboard';
import { initialMetrics, type Metrics } from './constants/metrics';
import { useBackendEvents } from './hooks/useBackendEvents';
import { FlyCarePage } from './pages/FlyCarePage';
import { PositionPage } from './pages/PositionPage';
import { useResidentLiveStore } from './shared/resident-live-store';
import type { Resident } from './sse/client';
import {
  deriveAlertsFromResidents,
  deriveInsightsFromResidents,
  deriveResidentMetrics,
  primaryTimestamp,
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

type ThemeMode = 'light' | 'dark';

type ResidentPatch = Partial<Resident> & { roleType?: Resident['roleType'] };

type Alerts = ReturnType<typeof deriveAlertsFromResidents>;
type Alert = Alerts[number];
type Insights = ReturnType<typeof deriveInsightsFromResidents>;
type Insight = Insights[number];

type DashboardPageKey =
  | 'overview'
  | 'residents'
  | 'location'
  | 'position'
  | 'flycare'
  | 'operations'
  | 'family'
  | 'admin';

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

const NAV_ITEMS: ReadonlyArray<{
  key: DashboardPageKey;
  to: string;
  labelKey: string;
}> = [
  { key: 'overview', to: '/', labelKey: 'layout.nav.overview' },
  { key: 'residents', to: '/residents', labelKey: 'layout.nav.residents' },
  { key: 'location', to: '/location', labelKey: 'layout.nav.location' },
  { key: 'position', to: '/position', labelKey: 'layout.nav.position' },
  { key: 'flycare', to: '/flycare', labelKey: 'layout.nav.flycare' },
  { key: 'operations', to: '/operations', labelKey: 'layout.nav.operations' },
  { key: 'family', to: '/family', labelKey: 'layout.nav.family' },
  { key: 'admin', to: '/admin', labelKey: 'layout.nav.admin' }
] as const;

const INDOOR_ZONES = ['Bedroom 1', 'Bedroom 2', 'Bathroom', 'Common Lounge'];
const SIM_STATUSES: Resident['status'][] = ['high', 'followUp', 'stable'];

const hasWindow = () => typeof window !== 'undefined';

const resolveDashboardPage = (pathname: string): DashboardPageKey => {
  switch (pathname) {
    case '/':
    case '/overview':
      return 'overview';
    case '/residents':
      return 'residents';
    case '/location':
      return 'location';
    case '/position':
      return 'position';
    case '/flycare':
      return 'flycare';
    case '/operations':
      return 'operations';
    case '/family':
      return 'family';
    case '/admin':
      return 'admin';
    default:
      return 'overview';
  }
};

const resolveStageTone = (page: DashboardPageKey): 'overview' | 'workspace' | 'utility' | 'position' | 'flycare' => {
  switch (page) {
    case 'position':
      return 'position';
    case 'flycare':
      return 'flycare';
    case 'location':
      return 'workspace';
    case 'overview':
      return 'overview';
    default:
      return 'utility';
  }
};

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
    // 忽略缓存异常，避免打断主流程。
  }
}

function removeStorage(key: string) {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // 忽略清理异常，避免影响登出流程。
  }
}

export default function App() {
  const { t, i18n } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const activeLanguage = i18n.resolvedLanguage ?? i18n.language ?? 'en';
  const location = useLocation();
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<Account[]>(() => {
    const stored = readStorage<Account[]>(STORAGE_KEYS.accounts, []);
    return stored.length ? stored : DEFAULT_ACCOUNTS;
  });
  const [session, setSession] = useState<Session | null>(() => readStorage<Session | null>(STORAGE_KEYS.session, null));
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authInfo, setAuthInfo] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => readStorage<ThemeMode>(STORAGE_KEYS.theme, 'light'));
  const [now, setNow] = useState(() => Date.now());
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics);
  const [showFallAlertModal, setShowFallAlertModal] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [adminActiveTab, setAdminActiveTab] = useState<AdminTab>('users');

  const authFirstFieldRef = useRef<HTMLInputElement | null>(null);
  const previousRawMetricsRef = useRef<RawMetrics | null>(null);
  const knownFallEventIdsRef = useRef<Set<number>>(new Set());
  const fallEventsInitializedRef = useRef(false);

  const activePage = resolveDashboardPage(location.pathname);
  const isPositionPage = activePage === 'position';
  const isFlyCarePage = activePage === 'flycare';
  const stageTone = resolveStageTone(activePage);

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
    writeStorage(STORAGE_KEYS.theme, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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

  const switchAuthMode = useCallback((mode: 'signin' | 'signup', options?: { preserveInfo?: boolean }) => {
    setAuthMode(mode);
    setAuthError(null);
    if (!options?.preserveInfo) {
      setAuthInfo(null);
    }
  }, []);

  useEffect(() => {
    if (!authMode) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeAuth();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
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

      setAccounts((previous) => [...previous, { username, password, role: nextRole }]);
      event.currentTarget.reset();
      setAuthInfo(t('auth.feedback.accountCreated'));
      switchAuthMode('signin', { preserveInfo: true });
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

  const alerts = useMemo<Alert[]>(() => deriveAlertsFromResidents(residentList, now, lastSeenFormatter, t), [
    residentList,
    now,
    lastSeenFormatter,
    t
  ]);

  const insights = useMemo<Insight[]>(() => deriveInsightsFromResidents(residentList, now, t), [residentList, now, t]);

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
    const buckets = Array.from({ length: bucketCount }, (_, index) => ({
      name: formatter.format(new Date(start + (index + 1) * bucketMs)),
      alerts: 0
    }));

    residentList.forEach((resident) => {
      if (resident.checkedOut) return;
      if (resident.status !== 'high' && resident.status !== 'followUp') return;
      const timestamp = primaryTimestamp(resident);
      if (!timestamp) return;
      const parsed = Date.parse(timestamp);
      if (Number.isNaN(parsed)) return;
      const bucketIndex = Math.floor((parsed - start) / bucketMs);
      if (bucketIndex >= 0 && bucketIndex < bucketCount) {
        buckets[bucketIndex].alerts += 1;
      }
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
    setMetrics({
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
    });
    previousRawMetricsRef.current = raw;
  }, [residentList, now]);

  useEffect(() => {
    startStream();
    return () => stopStream();
  }, [startStream, stopStream]);

  const fallEventIds = useMemo(() => new Set(fallEvents.map((event) => event.event_id)), [fallEvents]);

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

  const handleGoToEvents = useCallback(() => {
    setShowFallAlertModal(false);
    if (location.pathname !== '/admin') {
      navigate('/admin');
    }
    setAdminActiveTab('events');
  }, [location.pathname, navigate]);

  const formattedTime = useMemo(
    () =>
      new Intl.DateTimeFormat(activeLanguage, {
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(now)),
    [activeLanguage, now]
  );

  const isLoggedIn = Boolean(session);
  const userDisplayName = session?.username ?? t('auth.guestName');
  const userRoleLabel = t(`auth.roles.${session?.role ?? 'guest'}`);
  const signButtonLabel = t(isLoggedIn ? 'auth.signOut' : 'auth.signIn');

  const navItems = useMemo(
    () =>
      NAV_ITEMS.map((item) => ({
        ...item,
        label: t(item.labelKey)
      })),
    [t]
  );

  const activeResidentCount = useMemo(() => residentList.filter((resident) => !resident.checkedOut).length, [residentList]);
  const priorityResidentCount = useMemo(
    () => residentList.filter((resident) => resident.status === 'high' || resident.status === 'followUp').length,
    [residentList]
  );

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

      const updates: ResidentPatch = {
        status,
        roleType,
        lastSeenLocation: pick(INDOOR_ZONES),
        lastSeenAt: new Date(Date.now() - randomInt(0, 90) * 60000).toISOString(),
        vitals: buildVitals(status, forceHighHr),
        checkedOut: false
      };

      updateResident(resident.id, updates);
    });
  }, [residentList, setDemoMode, updateResident]);

  const handleExitDemoMode = useCallback(() => {
    setDemoMode(false);
  }, [setDemoMode]);

  const toggleTheme = useCallback(() => {
    setTheme((previous) => (previous === 'light' ? 'dark' : 'light'));
  }, []);

  const renderAlertsPanel = () => (
    <section className="route-surface route-surface--narrow">
      <div className="route-surface__header">
        <div>
          <p className="route-surface__eyebrow">Operations</p>
          <h2>{t('alerts.title')}</h2>
        </div>
        <span className="route-surface__chip">{t('alerts.subtitle')}</span>
      </div>
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
    </section>
  );

  const renderInsightsPanel = () => (
    <section className="route-surface route-surface--narrow">
      <div className="route-surface__header">
        <div>
          <p className="route-surface__eyebrow">Family</p>
          <h2>{t('insights.title')}</h2>
        </div>
        <span className="route-surface__chip">{t('insights.subtitle')}</span>
      </div>
      <ul className="insight-list">
        {insights.map((insight) => (
          <li key={insight.id}>{insight.text}</li>
        ))}
      </ul>
    </section>
  );

  // 用 route key 驱动页面切换，避免旧版多重 return 再次回流。
  const renderDashboardPage = () => {
    switch (activePage) {
      case 'position':
        return <PositionPage onSosOrFallDetected={() => setShowFallAlertModal(true)} />;
      case 'flycare':
        return <FlyCarePage onSosOrFallDetected={() => setShowFallAlertModal(true)} />;
      case 'residents':
        return (
          <section className="route-surface">
            <div className="route-surface__header">
              <div>
                <p className="route-surface__eyebrow">Residents</p>
                <h2>{t('layout.nav.residents')}</h2>
              </div>
              <span className="route-surface__chip">{t('admin.residents.subtitle')}</span>
            </div>
            <ResidentsAdmin />
          </section>
        );
      case 'location':
        return (
          <div className="route-stack">
            <LocationDashboard />
          </div>
        );
      case 'operations':
        return <div className="route-stack route-stack--narrow">{renderAlertsPanel()}</div>;
      case 'family':
        return <div className="route-stack route-stack--narrow">{renderInsightsPanel()}</div>;
      case 'admin':
        return (
          <div className="route-stack">
            <AdminSection activeTab={adminActiveTab} onTabChange={setAdminActiveTab} />
          </div>
        );
      case 'overview':
      default:
        return (
          <OverviewExperience
            metrics={metrics}
            demoMode={demoMode}
            formattedTime={formattedTime}
            statusData={statusChartData}
            zoneData={zoneChartData}
            alertTrendData={alertTrendData}
            chartLabels={chartLabels}
            alerts={alerts}
            insights={insights}
            residents={residentList}
            activeResidentCount={activeResidentCount}
            priorityResidentCount={priorityResidentCount}
            fallEventCount={fallEvents.length}
            onSimulate={handleSimulateNewData}
            onExitDemo={handleExitDemoMode}
          />
        );
    }
  };

  const pageTransition = shouldReduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 18 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -12 }
      };

  return (
    <div className={`app-background${isPositionPage ? ' app-background--position' : ''}`}>
      <main
        className={`app-shell app-shell--ambient app-shell--route-${activePage}${isFlyCarePage ? ' app-shell--flycare' : ''}`}
      >
        <AppHeader
          isFlyCarePage={isFlyCarePage}
          activeKey={activePage}
          brandTitle={isFlyCarePage ? t('layout.flycareBrand') : t('layout.title')}
          brandSubtitle={isFlyCarePage ? 'Smart Wearable Safety System for International Airport' : t('layout.subtitle')}
          navItems={navItems}
        />

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activePage}
            className={`app-stage app-stage--${stageTone} app-stage--route-${activePage}`}
            transition={{ duration: shouldReduceMotion ? 0 : 0.38, ease: [0.22, 1, 0.36, 1] }}
            {...pageTransition}
          >
            {renderDashboardPage()}
          </motion.div>
        </AnimatePresence>

        <QuickActionsDock
          open={controlsOpen}
          onToggle={() => setControlsOpen((value) => !value)}
          theme={theme}
          onThemeToggle={toggleTheme}
          userDisplayName={userDisplayName}
          userRoleLabel={userRoleLabel}
          actionLabel={signButtonLabel}
          onAction={isLoggedIn ? handleSignOut : () => openAuth('signin')}
        />
      </main>

      <AnimatePresence>
        {showFallAlertModal ? <FallAlertModal onGoToEvents={handleGoToEvents} /> : null}
      </AnimatePresence>

      <AnimatePresence>
        {authMode ? (
          <AuthModal
            mode={authMode}
            error={authError}
            info={authInfo}
            firstFieldRef={authFirstFieldRef}
            onClose={closeAuth}
            onSwitchMode={switchAuthMode}
            onSignInSubmit={handleSignInSubmit}
            onSignUpSubmit={handleSignUpSubmit}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
