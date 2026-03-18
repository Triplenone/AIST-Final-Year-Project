import './styles/global.css';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LanguageSwitcher } from './components/LanguageSwitcher';
import { BackendAlertsPanel } from './components/BackendAlertsPanel';
import { EmergencyAlertModal } from './components/EmergencyAlertModal';
import { LocationDashboard } from './components/LocationDashboard';
import { PushNotificationPanel } from './components/PushNotificationPanel';
import { AdminSection } from './components/admin/AdminSection';
import { DashboardCharts } from './components/charts/DashboardCharts';
import { ImuWaveformChart } from './components/charts/ImuWaveformChart';
import { initialMetrics, metricOrder, type Metrics } from './constants/metrics';
import { useResidentLiveStore } from './shared/resident-live-store';
import type { Resident } from './types/resident';
import { deriveInsightsFromResidents, deriveResidentMetrics, primaryTimestamp, type RawMetrics } from './utils/resident-derived';

type ThemeMode = 'light' | 'dark';

type Insights = ReturnType<typeof deriveInsightsFromResidents>;
type Insight = Insights[number];

const STORAGE_KEYS = {
  theme: 'smartcare-theme',
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
    // ignore storage failures
  }
}

export default function App() {
  const { t, i18n } = useTranslation();
  const activeLanguage = i18n.resolvedLanguage ?? i18n.language ?? 'en';
  const {
    residents: residentMap,
    loading: residentLoading,
    error: residentError,
    lastUpdatedAt,
    refreshResidents,
  } = useResidentLiveStore();

  const [theme, setTheme] = useState<ThemeMode>(() => readStorage<ThemeMode>(STORAGE_KEYS.theme, 'light'));
  const [now, setNow] = useState(() => Date.now());
  const [metrics, setMetrics] = useState<Metrics>(initialMetrics);
  const previousRawMetricsRef = useRef<RawMetrics | null>(null);

  const captureMode = useMemo(() => {
    if (!hasWindow()) return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('capture');
  }, []);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.theme, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!hasWindow()) return;
    const hash = window.location.hash;
    if (!hash) return;
    const target = document.querySelector(hash);
    if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const residentList = useMemo<Resident[]>(() => {
    return Object.values(residentMap)
      .map((resident) => ({
        ...resident,
        updatedAt: resident.updatedAt ?? resident.createdAt,
      }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [residentMap]);

  const previewResidents = useMemo(() => residentList.slice(0, 8), [residentList]);

  const insights = useMemo<Insight[]>(() => deriveInsightsFromResidents(residentList, now, t), [residentList, now, t]);

  const statusChartData = useMemo(() => {
    const statusKeys: Resident['status'][] = ['stable', 'followUp', 'high', 'checked_out'];
    const tally: Record<Resident['status'], number> = {
      stable: 0,
      followUp: 0,
      high: 0,
      checked_out: 0,
    };

    residentList.forEach((resident) => {
      tally[resident.status] = (tally[resident.status] ?? 0) + 1;
    });

    return statusKeys
      .map((status) => ({
        name: t(`residents.status.${status}`),
        value: tally[status],
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
      minute: '2-digit',
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
      empty: t('charts.empty'),
    }),
    [t]
  );

  useEffect(() => {
    const raw = deriveResidentMetrics(residentList, now);
    const previous = previousRawMetricsRef.current ?? raw;
    const next: Metrics = {
      wellbeing: {
        value: raw.wellbeing,
        delta: raw.wellbeing - previous.wellbeing,
      },
      alertsResolved: {
        value: raw.alertsResolved,
        delta: raw.alertsResolved - previous.alertsResolved,
      },
      responseTime: {
        value: raw.responseTime,
        delta: raw.responseTime - previous.responseTime,
      },
    };
    previousRawMetricsRef.current = raw;
    setMetrics(next);
  }, [residentList, now]);

  const formattedTime = useMemo(() => {
    if (!lastUpdatedAt) return t('common.unknown');
    const parsed = new Date(lastUpdatedAt);
    if (Number.isNaN(parsed.getTime())) return t('common.unknown');
    return new Intl.DateTimeFormat(activeLanguage, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(parsed);
  }, [activeLanguage, lastUpdatedAt, t]);

  const toggleTheme = useCallback(() => {
    setTheme((previous) => (previous === 'light' ? 'dark' : 'light'));
  }, []);

  const handleRefresh = useCallback(() => {
    void refreshResidents().catch(() => {});
  }, [refreshResidents]);

  if (captureMode === 'location') {
    return (
      <div className="app-background">
        <main className="app-shell">
          <LocationDashboard />
        </main>
      </div>
    );
  }

  return (
    <div className="app-background app-background--with-header">
      <main className="app-shell app-shell--with-header">
        <header className="app-header">
          <div className="brand">
            <span className="brand-mark">{t('layout.title')}</span>
            <p className="brand-tagline">{t('layout.subtitle')}</p>
          </div>
          <nav className="header-nav" aria-label={t('layout.nav.aria')}>
            <a href="#overview">{t('layout.nav.overview')}</a>
            <a href="#residents">{t('layout.nav.residents')}</a>
            <a href="#location">{t('layout.nav.location')}</a>
            <a href="#operations">{t('layout.nav.operations')}</a>
            <a href="#family">{t('layout.nav.family')}</a>
            <a href="#admin">{t('layout.nav.admin')}</a>
          </nav>
          <div className="header-actions">
            <LanguageSwitcher />
            <button type="button" className="theme-toggle" onClick={toggleTheme}>
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </button>
          </div>
        </header>

        <section id="overview" className="section hero">
          <div className="hero-copy">
            <p className="eyebrow">{t('hero.eyebrow')}</p>
            <h1>{t('hero.title')}</h1>
            <p>{t('hero.description')}</p>
          </div>
          <div className="hero-actions">
            <button type="button" className="primary" onClick={handleRefresh}>
              {residentLoading ? t('common.loading') : t('admin.residents.refresh')}
            </button>
            <span className="timestamp" aria-live="polite">
              {t('hero.lastUpdated', { time: formattedTime })}
            </span>
            {residentError ? <div className="admin-error">{residentError}</div> : null}
          </div>
        </section>

        <section id="residents" className="section">
          <header className="section-heading">
            <div>
              <h2>{t('residents.title')}</h2>
              <p className="muted">{t('residents.subtitle')}</p>
            </div>
          </header>
          <div className="hero-residents">
            <ul className="hero-residents__list">
              {previewResidents.length ? (
                previewResidents.map((resident) => (
                  <li key={resident.id} className="hero-residents__item">
                    <div>
                      <span className="hero-residents__name">{resident.name}</span>
                      <span className="hero-residents__room">{resident.room}</span>
                    </div>
                    <span className={`status status-${resident.status}`}>
                      {t(`residents.status.${resident.status}`)}
                    </span>
                  </li>
                ))
              ) : (
                <li className="hero-residents__empty">
                  {residentLoading ? t('common.loading') : t('admin.residents.noData')}
                </li>
              )}
            </ul>
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
                        delta: deltaLabel,
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
          <ImuWaveformChart />
        </section>

        <LocationDashboard />

        <section id="operations" className="section split">
          <BackendAlertsPanel />
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
          <PushNotificationPanel />
        </section>

        <AdminSection />

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

      <EmergencyAlertModal />
    </div>
  );
}
