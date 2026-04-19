import './styles/global.css';
import './styles/tokens.css';
import './styles/app-shell.css';
import './styles/overview.css';

import type { FormEvent } from 'react';
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { FallAlertModal } from './components/FallAlertModal';
import type { AdminTab } from './components/admin/AdminSection';
import { AppHeader } from './components/shell/AppHeader';
import { AuthModal } from './components/shell/AuthModal';
import { QuickActionsDock } from './components/shell/QuickActionsDock';
import { initialMetrics, type Metrics } from './constants/metrics';
import { useBackendEvents } from './hooks/useBackendEvents';
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
type LanguageVariant = 'en' | 'zh-CN' | 'zh-HK';

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
  { key: 'position', to: '/position', labelKey: 'layout.nav.position' },
  { key: 'operations', to: '/operations', labelKey: 'layout.nav.operations' },
  { key: 'family', to: '/family', labelKey: 'layout.nav.family' },
  { key: 'admin', to: '/admin', labelKey: 'layout.nav.admin' }
] as const;

const OverviewExperience = lazy(() =>
  import('./components/overview/OverviewExperience').then((module) => ({ default: module.OverviewExperience }))
);
const ResidentsAdmin = lazy(() =>
  import('./components/admin/ResidentsAdmin').then((module) => ({ default: module.ResidentsAdmin }))
);
const AdminSection = lazy(() =>
  import('./components/admin/AdminSection').then((module) => ({ default: module.AdminSection }))
);
const PositionPage = lazy(() =>
  import('./pages/PositionPage').then((module) => ({ default: module.PositionPage }))
);
const FamilyPage = lazy(() =>
  import('./pages/FamilyPage').then((module) => ({ default: module.FamilyPage }))
);
const FlyCarePage = lazy(() =>
  import('./pages/FlyCarePage').then((module) => ({ default: module.FlyCarePage }))
);

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

const resolveLanguageVariant = (language: string): LanguageVariant => {
  const normalized = language.toLowerCase();
  if (normalized.startsWith('zh-hk') || normalized.startsWith('zh-tw')) {
    return 'zh-HK';
  }
  if (normalized.startsWith('zh')) {
    return 'zh-CN';
  }
  return 'en';
};

const ROUTE_BRIEF_COPY = {
  en: {
    operations: {
      chip: 'Shift brief',
      summaryQueue: 'Open queue',
      summaryEscalations: 'Escalations',
      summaryFalls: 'Fall watch',
      summarySync: 'Last brief',
      mainTitle: 'Alert queue',
      mainNote: 'Signal-ranked issues requiring operator follow-up.',
      asideTitle: 'Shift focus',
      asideNote: 'Residents most likely to need escalation in the next round.',
      coverageTitle: 'Coverage snapshot',
      coverageNote: 'Keep the queue short and verify the next handoff before notifying family.',
      coverageResidents: 'Active residents',
      coveragePriority: 'Priority watch',
      coverageSync: 'Briefed at',
      emptyResidents: 'No residents need escalation right now.'
    },
    family: {
      chip: 'Communication brief',
      summaryUpdates: 'Share-ready updates',
      summaryStable: 'Stable residents',
      summaryFollowUps: 'Priority follow-ups',
      summarySync: 'Updated at',
      mainTitle: 'Family-ready updates',
      mainNote: 'Short notes that can be relayed without opening the full chart.',
      asideTitle: 'Outreach queue',
      asideNote: 'Residents whose families may need proactive context.',
      coverageTitle: 'Communication pulse',
      coverageNote: 'Reassure first, escalate only when the resident signal changes.',
      coverageResidents: 'Stable now',
      coveragePriority: 'Needs context',
      coverageSync: 'Updated at',
      emptyResidents: 'No proactive outreach queue right now.'
    }
  },
  'zh-CN': {
    operations: {
      chip: '\u503c\u73ed\u7b80\u62a5',
      summaryQueue: '\u5f85\u5904\u7406',
      summaryEscalations: '\u9700\u5347\u7ea7',
      summaryFalls: '\u8dcc\u5012\u76d1\u63a7',
      summarySync: '\u6700\u540e\u7b80\u62a5',
      mainTitle: '\u8b66\u62a5\u961f\u5217',
      mainNote: '\u6309\u4fe1\u53f7\u4f18\u5148\u7ea7\u6392\u5217\uff0c\u7528\u4e8e\u5feb\u901f\u8ddf\u8fdb\u3002',
      asideTitle: '\u73ed\u6b21\u5173\u6ce8',
      asideNote: '\u4e0b\u4e00\u8f6e\u6700\u53ef\u80fd\u9700\u8981\u5347\u7ea7\u5904\u7406\u7684\u5bf9\u8c61\u3002',
      coverageTitle: '\u8986\u76d6\u5feb\u7167',
      coverageNote: '\u4fdd\u6301\u961f\u5217\u7b80\u77ed\uff0c\u5e76\u5728\u901a\u77e5\u5bb6\u5c5e\u524d\u5148\u5b8c\u6210\u4ea4\u63a5\u786e\u8ba4\u3002',
      coverageResidents: '\u5728\u7ebf\u5c45\u6c11',
      coveragePriority: '\u91cd\u70b9\u76d1\u770b',
      coverageSync: '\u7b80\u62a5\u65f6\u95f4',
      emptyResidents: '\u5f53\u524d\u6ca1\u6709\u9700\u8981\u5347\u7ea7\u7684\u5bf9\u8c61\u3002'
    },
    family: {
      chip: '\u6c9f\u901a\u7b80\u62a5',
      summaryUpdates: '\u53ef\u5bf9\u5916\u66f4\u65b0',
      summaryStable: '\u7a33\u5b9a\u5c45\u6c11',
      summaryFollowUps: '\u91cd\u70b9\u8ddf\u8fdb',
      summarySync: '\u66f4\u65b0\u65f6\u95f4',
      mainTitle: '\u5bb6\u5c5e\u66f4\u65b0',
      mainNote: '\u4e0d\u7528\u6253\u5f00\u5b8c\u6574\u6863\u6848\u4e5f\u80fd\u76f4\u63a5\u4f20\u8fbe\u7684\u77ed\u8981\u8bf4\u660e\u3002',
      asideTitle: '\u6c9f\u901a\u961f\u5217',
      asideNote: '\u5bb6\u5c5e\u53ef\u80fd\u9700\u8981\u63d0\u524d\u83b7\u5f97\u80cc\u666f\u8bf4\u660e\u7684\u5bf9\u8c61\u3002',
      coverageTitle: '\u6c9f\u901a\u8109\u640f',
      coverageNote: '\u5148\u505a\u5b89\u629a\uff0c\u53ea\u5728\u4fe1\u53f7\u53d8\u5316\u65f6\u518d\u5347\u7ea7\u6c9f\u901a\u3002',
      coverageResidents: '\u7a33\u5b9a\u4e2d',
      coveragePriority: '\u9700\u80cc\u666f\u8bf4\u660e',
      coverageSync: '\u66f4\u65b0\u65f6\u95f4',
      emptyResidents: '\u5f53\u524d\u6ca1\u6709\u9700\u8981\u4e3b\u52a8\u6c9f\u901a\u7684\u5bf9\u8c61\u3002'
    }
  },
  'zh-HK': {
    operations: {
      chip: '\u503c\u73ed\u7c21\u5831',
      summaryQueue: '\u5f85\u8655\u7406',
      summaryEscalations: '\u9700\u5347\u7d1a',
      summaryFalls: '\u8dcc\u5012\u76e3\u63a7',
      summarySync: '\u6700\u5f8c\u7c21\u5831',
      mainTitle: '\u8b66\u793a\u4f47\u5217',
      mainNote: '\u6309\u4fe1\u865f\u512a\u5148\u7d1a\u6392\u5217\uff0c\u4f9b\u7576\u73ed\u5feb\u901f\u8ddf\u9032\u3002',
      asideTitle: '\u73ed\u6b21\u95dc\u6ce8',
      asideNote: '\u4e0b\u4e00\u8f2a\u6700\u53ef\u80fd\u9700\u8981\u5347\u7d1a\u8655\u7406\u7684\u5c0d\u8c61\u3002',
      coverageTitle: '\u8986\u84cb\u5feb\u7167',
      coverageNote: '\u4fdd\u6301\u4f47\u5217\u7c21\u77ed\uff0c\u4e26\u5728\u901a\u77e5\u5bb6\u5c6c\u524d\u5148\u5b8c\u6210\u4ea4\u63a5\u78ba\u8a8d\u3002',
      coverageResidents: '\u5728\u7dda\u4f4f\u6236',
      coveragePriority: '\u91cd\u9ede\u76e3\u770b',
      coverageSync: '\u7c21\u5831\u6642\u9593',
      emptyResidents: '\u76ee\u524d\u6c92\u6709\u9700\u8981\u5347\u7d1a\u7684\u5c0d\u8c61\u3002'
    },
    family: {
      chip: '\u6e9d\u901a\u7c21\u5831',
      summaryUpdates: '\u53ef\u5c0d\u5916\u66f4\u65b0',
      summaryStable: '\u7a69\u5b9a\u4f4f\u6236',
      summaryFollowUps: '\u91cd\u9ede\u8ddf\u9032',
      summarySync: '\u66f4\u65b0\u6642\u9593',
      mainTitle: '\u5bb6\u5c6c\u66f4\u65b0',
      mainNote: '\u7121\u9808\u6253\u958b\u5b8c\u6574\u6a94\u6848\uff0c\u4ea6\u80fd\u76f4\u63a5\u50b3\u9054\u7684\u77ed\u8981\u8aaa\u660e\u3002',
      asideTitle: '\u6e9d\u901a\u4f47\u5217',
      asideNote: '\u5bb6\u5c6c\u53ef\u80fd\u9700\u8981\u9810\u5148\u7372\u5f97\u80cc\u666f\u8aaa\u660e\u7684\u5c0d\u8c61\u3002',
      coverageTitle: '\u6e9d\u901a\u8108\u640f',
      coverageNote: '\u5148\u505a\u5b89\u64ab\uff0c\u53ea\u5728\u4fe1\u865f\u8b8a\u5316\u6642\u624d\u5347\u7d1a\u6e9d\u901a\u3002',
      coverageResidents: '\u7a69\u5b9a\u4e2d',
      coveragePriority: '\u9700\u80cc\u666f\u8aaa\u660e',
      coverageSync: '\u66f4\u65b0\u6642\u9593',
      emptyResidents: '\u76ee\u524d\u6c92\u6709\u9700\u8981\u4e3b\u52d5\u6e9d\u901a\u7684\u5c0d\u8c61\u3002'
    }
  }
} as const;

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
  const languageVariant = resolveLanguageVariant(activeLanguage);
  const routeBriefCopy = ROUTE_BRIEF_COPY[languageVariant];
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
  const activeNavItem = activePage === 'flycare' ? { label: t('layout.nav.flycare') } : NAV_ITEMS.find((item) => item.key === activePage);

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
  const stableResidentCount = useMemo(
    () => residentList.filter((resident) => !resident.checkedOut && resident.status === 'stable').length,
    [residentList]
  );

  const operationFocusResidents = useMemo(() => {
    const activeResidents = residentList.filter((resident) => !resident.checkedOut);
    const escalatedResidents = activeResidents.filter(
      (resident) => resident.status === 'high' || resident.status === 'followUp'
    );
    return (escalatedResidents.length > 0 ? escalatedResidents : activeResidents).slice(0, 3);
  }, [residentList]);

  const familyOutreachResidents = useMemo(() => {
    const activeResidents = residentList.filter((resident) => !resident.checkedOut);
    const contextResidents = activeResidents.filter(
      (resident) => resident.status === 'high' || resident.status === 'followUp'
    );
    const steadyResidents = activeResidents.filter((resident) => resident.status === 'stable');
    const nextResidents =
      contextResidents.length > 0 ? contextResidents : steadyResidents.length > 0 ? steadyResidents : activeResidents;
    return nextResidents.slice(0, 3);
  }, [residentList]);

  const formatResidentBriefTime = useCallback(
    (resident: Resident) => {
      const timestamp = primaryTimestamp(resident);
      if (!timestamp) {
        return '--';
      }
      const parsed = new Date(timestamp);
      if (Number.isNaN(parsed.getTime())) {
        return '--';
      }
      return lastSeenFormatter.format(parsed);
    },
    [lastSeenFormatter]
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

  const renderAlertsPanel = () => {
    const copy = routeBriefCopy.operations;
    const summaryItems = [
      {
        key: 'queue',
        label: copy.summaryQueue,
        value: alerts.length,
        tone: 'critical' as const
      },
      {
        key: 'priority',
        label: copy.summaryEscalations,
        value: priorityResidentCount,
        tone: 'warning' as const
      },
      {
        key: 'falls',
        label: copy.summaryFalls,
        value: fallEvents.length,
        tone: 'info' as const
      },
      {
        key: 'sync',
        label: copy.summarySync,
        value: formattedTime,
        tone: 'neutral' as const
      }
    ];

    return (
      <section className="route-surface route-surface--narrow route-surface--brief route-surface--operations">
        <div className="route-surface__header route-surface__header--brief">
          <div>
            <p className="route-surface__eyebrow">Operations</p>
            <h2>{t('alerts.title')}</h2>
            <p className="route-surface__note">{copy.mainNote}</p>
          </div>
          <span className="route-surface__chip">{copy.chip}</span>
        </div>

        <div className="route-brief__summary" role="list">
          {summaryItems.map((item) => (
            <article
              key={item.key}
              className={`route-brief__metric route-brief__metric--${item.tone}`}
              role="listitem"
            >
              <span className="route-brief__metric-label">{item.label}</span>
              <strong className="route-brief__metric-value">{item.value}</strong>
            </article>
          ))}
        </div>

        <div className="route-brief__layout">
          <section className="route-brief__panel route-brief__panel--primary">
            <div className="route-brief__panel-header">
              <div>
                <p className="route-brief__panel-eyebrow">Operations</p>
                <h3>{copy.mainTitle}</h3>
              </div>
              <span className="route-brief__panel-tag">{t('alerts.subtitle')}</span>
            </div>

            <ol className="route-brief__list route-brief__list--alerts">
              {alerts.map((alert, index) => (
                <li key={alert.id} className={`route-brief__list-item route-brief__list-item--${alert.level}`}>
                  <span className="route-brief__list-index">{String(index + 1).padStart(2, '0')}</span>
                  <div className="route-brief__list-copy">
                    <div className="route-brief__list-meta">
                      <span className={`route-brief__tone route-brief__tone--${alert.level}`}>
                        {t(`alertLevels.${alert.level}`)}
                      </span>
                      <time dateTime={alert.timestamp ?? undefined}>{alert.time}</time>
                    </div>
                    <p>{alert.message}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <aside className="route-brief__sidebar">
            <section className="route-brief__panel route-brief__panel--secondary">
              <div className="route-brief__panel-header">
                <div>
                  <p className="route-brief__panel-eyebrow">Operations</p>
                  <h3>{copy.asideTitle}</h3>
                </div>
              </div>
              <p className="route-brief__panel-note">{copy.asideNote}</p>
              {operationFocusResidents.length > 0 ? (
                <ul className="route-brief__resident-list">
                  {operationFocusResidents.map((resident) => (
                    <li key={resident.id} className="route-brief__resident-item">
                      <div className="route-brief__resident-top">
                        <strong>{resident.name}</strong>
                        <span className={`route-brief__resident-status route-brief__resident-status--${resident.status}`}>
                          {t(`residents.status.${resident.status}`)}
                        </span>
                      </div>
                      <div className="route-brief__resident-meta">
                        <span>{resident.lastSeenLocation?.trim() || resident.room?.trim() || t('location.zones.unknown')}</span>
                        <span>{formatResidentBriefTime(resident)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="route-brief__empty">{copy.emptyResidents}</p>
              )}
            </section>

            <section className="route-brief__panel route-brief__panel--compact">
              <div className="route-brief__panel-header">
                <div>
                  <p className="route-brief__panel-eyebrow">Operations</p>
                  <h3>{copy.coverageTitle}</h3>
                </div>
              </div>
              <div className="route-brief__coverage-grid">
                <article className="route-brief__coverage-card">
                  <span className="route-brief__coverage-label">{copy.coverageResidents}</span>
                  <strong className="route-brief__coverage-value">{activeResidentCount}</strong>
                </article>
                <article className="route-brief__coverage-card">
                  <span className="route-brief__coverage-label">{copy.coveragePriority}</span>
                  <strong className="route-brief__coverage-value">{priorityResidentCount}</strong>
                </article>
                <article className="route-brief__coverage-card">
                  <span className="route-brief__coverage-label">{copy.coverageSync}</span>
                  <strong className="route-brief__coverage-value">{formattedTime}</strong>
                </article>
              </div>
              <p className="route-brief__note">{copy.coverageNote}</p>
            </section>
          </aside>
        </div>
      </section>
    );
  };

  const renderInsightsPanel = () => {
    const copy = routeBriefCopy.family;
    const summaryItems = [
      {
        key: 'updates',
        label: copy.summaryUpdates,
        value: insights.length,
        tone: 'info' as const
      },
      {
        key: 'stable',
        label: copy.summaryStable,
        value: stableResidentCount,
        tone: 'neutral' as const
      },
      {
        key: 'followups',
        label: copy.summaryFollowUps,
        value: priorityResidentCount,
        tone: 'warning' as const
      },
      {
        key: 'sync',
        label: copy.summarySync,
        value: formattedTime,
        tone: 'neutral' as const
      }
    ];

    return (
      <section className="route-surface route-surface--narrow route-surface--brief route-surface--family">
        <div className="route-surface__header route-surface__header--brief">
          <div>
            <p className="route-surface__eyebrow">Family</p>
            <h2>{t('insights.title')}</h2>
            <p className="route-surface__note">{copy.mainNote}</p>
          </div>
          <span className="route-surface__chip">{copy.chip}</span>
        </div>

        <div className="route-brief__summary" role="list">
          {summaryItems.map((item) => (
            <article
              key={item.key}
              className={`route-brief__metric route-brief__metric--${item.tone}`}
              role="listitem"
            >
              <span className="route-brief__metric-label">{item.label}</span>
              <strong className="route-brief__metric-value">{item.value}</strong>
            </article>
          ))}
        </div>

        <div className="route-brief__layout">
          <section className="route-brief__panel route-brief__panel--primary">
            <div className="route-brief__panel-header">
              <div>
                <p className="route-brief__panel-eyebrow">Family</p>
                <h3>{copy.mainTitle}</h3>
              </div>
              <span className="route-brief__panel-tag">{t('insights.subtitle')}</span>
            </div>

            <ol className="route-brief__list route-brief__list--insights">
              {insights.map((insight, index) => (
                <li key={insight.id} className="route-brief__list-item route-brief__list-item--insight">
                  <span className="route-brief__list-index">{String(index + 1).padStart(2, '0')}</span>
                  <div className="route-brief__list-copy">
                    <div className="route-brief__list-meta">
                      <span className="route-brief__tone route-brief__tone--info">{copy.summaryUpdates}</span>
                      <span>{formattedTime}</span>
                    </div>
                    <p>{insight.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <aside className="route-brief__sidebar">
            <section className="route-brief__panel route-brief__panel--secondary">
              <div className="route-brief__panel-header">
                <div>
                  <p className="route-brief__panel-eyebrow">Family</p>
                  <h3>{copy.asideTitle}</h3>
                </div>
              </div>
              <p className="route-brief__panel-note">{copy.asideNote}</p>
              {familyOutreachResidents.length > 0 ? (
                <ul className="route-brief__resident-list">
                  {familyOutreachResidents.map((resident) => (
                    <li key={resident.id} className="route-brief__resident-item">
                      <div className="route-brief__resident-top">
                        <strong>{resident.name}</strong>
                        <span className={`route-brief__resident-status route-brief__resident-status--${resident.status}`}>
                          {t(`residents.status.${resident.status}`)}
                        </span>
                      </div>
                      <div className="route-brief__resident-meta">
                        <span>{resident.lastSeenLocation?.trim() || resident.room?.trim() || t('location.zones.unknown')}</span>
                        <span>{formatResidentBriefTime(resident)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="route-brief__empty">{copy.emptyResidents}</p>
              )}
            </section>

            <section className="route-brief__panel route-brief__panel--compact">
              <div className="route-brief__panel-header">
                <div>
                  <p className="route-brief__panel-eyebrow">Family</p>
                  <h3>{copy.coverageTitle}</h3>
                </div>
              </div>
              <div className="route-brief__coverage-grid">
                <article className="route-brief__coverage-card">
                  <span className="route-brief__coverage-label">{copy.coverageResidents}</span>
                  <strong className="route-brief__coverage-value">{stableResidentCount}</strong>
                </article>
                <article className="route-brief__coverage-card">
                  <span className="route-brief__coverage-label">{copy.coveragePriority}</span>
                  <strong className="route-brief__coverage-value">{priorityResidentCount}</strong>
                </article>
                <article className="route-brief__coverage-card">
                  <span className="route-brief__coverage-label">{copy.coverageSync}</span>
                  <strong className="route-brief__coverage-value">{formattedTime}</strong>
                </article>
              </div>
              <p className="route-brief__note">{copy.coverageNote}</p>
            </section>
          </aside>
        </div>
      </section>
    );
  };

  void renderInsightsPanel;

  // 用 route key 驱动页面切换，避免旧版多重 return 再次回流。
  const renderDashboardPage = () => {
    if (location.pathname === '/location') {
      return <Navigate to="/position" replace />;
    }

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
      case 'operations':
        return <div className="route-stack route-stack--narrow">{renderAlertsPanel()}</div>;
      case 'family':
        return <FamilyPage />;
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

  const routeLoadingFallback = (
    <section className="route-surface route-surface--lazy-loading" aria-busy="true" aria-live="polite">
      <div className="route-surface__loading-copy">
        <p className="route-surface__eyebrow">{activeNavItem?.label ?? t('layout.title')}</p>
        <h2>{t('common.loading')}</h2>
      </div>
    </section>
  );

  return (
    <div
      className={`app-background${isPositionPage ? ' app-background--position' : ''}${isFlyCarePage ? ' app-background--flycare' : ''}`}
    >
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
            <Suspense fallback={routeLoadingFallback}>{renderDashboardPage()}</Suspense>
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
