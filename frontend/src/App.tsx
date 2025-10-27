import './styles/global.css';

import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { LanguageSwitcher } from './components/LanguageSwitcher';
import { LANGUAGE_OPTIONS } from './i18n';

type MetricKey = 'wellbeing' | 'alertsResolved' | 'responseTime';

type Metrics = Record<MetricKey, { value: number; delta: number }>;

type ResidentStatus = 'stable' | 'followUp' | 'high';

type Resident = {
  id: string;
  name: string;
  room: string;
  status: ResidentStatus;
  lastCheck: string;
  bp: string;
  hr: number;
};

type AlertLevel = 'critical' | 'warning' | 'info';

type Alert = {
  id: string;
  level: AlertLevel;
  messageKey: string;
  time: string;
};

const metricOrder: readonly MetricKey[] = ['wellbeing', 'alertsResolved', 'responseTime'];

const residentSeed: Resident[] = [
  { id: 'r1', name: 'Mrs. Chen', room: '204', status: 'followUp', lastCheck: '08:45', bp: '118/76', hr: 72 },
  { id: 'r2', name: 'Mr. Lee', room: '310', status: 'stable', lastCheck: '07:55', bp: '130/82', hr: 80 },
  { id: 'r3', name: 'Mrs. Singh', room: '118', status: 'high', lastCheck: '09:10', bp: '110/70', hr: 96 },
  { id: 'r4', name: 'Ms. Lopez', room: '122', status: 'followUp', lastCheck: '08:20', bp: '116/74', hr: 68 }
];

const alertTemplates: Alert[] = [
  { id: 'a1', level: 'critical', messageKey: 'alerts.items.fall', time: '09:32' },
  { id: 'a2', level: 'warning', messageKey: 'alerts.items.heartRate', time: '09:05' },
  { id: 'a3', level: 'info', messageKey: 'alerts.items.wearable', time: '08:58' },
  { id: 'a4', level: 'info', messageKey: 'alerts.items.ota', time: '08:41' }
];

const initialMetrics: Metrics = {
  wellbeing: { value: 82, delta: 4 },
  alertsResolved: { value: 14, delta: 0 },
  responseTime: { value: 12, delta: -1 }
};

const filterOptions = ['all', 'high', 'followUp', 'stable'] as const;
type FilterKey = (typeof filterOptions)[number];

const randomBetween = (min: number, max: number) => Math.round(Math.random() * (max - min) + min);
const pickRandom = <T,>(items: readonly T[]) => items[randomBetween(0, items.length - 1)];

export default function App() {
  const { t, i18n } = useTranslation();
  const activeLanguage = i18n.resolvedLanguage ?? i18n.language ?? 'en';
  const otherLanguages = useMemo(
    () => LANGUAGE_OPTIONS.filter((option) => option.code !== activeLanguage),
    [activeLanguage]
  );

  const [metrics, setMetrics] = useState<Metrics>(initialMetrics);
  const [residents, setResidents] = useState<Resident[]>(residentSeed);
  const [alerts, setAlerts] = useState<Alert[]>(alertTemplates);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const formattedTime = useMemo(() => {
    return new Intl.DateTimeFormat(activeLanguage, {
      hour: '2-digit',
      minute: '2-digit'
    }).format(lastUpdated);
  }, [activeLanguage, lastUpdated]);

  const filteredResidents = useMemo(() => {
    if (filter === 'all') {
      return residents;
    }
    return residents.filter((resident) => resident.status === filter);
  }, [filter, residents]);

  const handleSimulate = useCallback(() => {
    setMetrics((prev) => ({
      wellbeing: {
        value: randomBetween(70, 95),
        delta: randomBetween(-4, 6)
      },
      alertsResolved: {
        value: randomBetween(8, 20),
        delta: randomBetween(-3, 5)
      },
      responseTime: {
        value: randomBetween(8, 18),
        delta: randomBetween(-3, 3)
      }
    }));

    setResidents((prev) =>
      prev.map((resident) => {
        const minutesAgo = randomBetween(2, 75);
        const lastCheckDate = new Date(Date.now() - minutesAgo * 60 * 1000);
        return {
          ...resident,
          status: pickRandom(['stable', 'followUp', 'high']),
          lastCheck: new Intl.DateTimeFormat(activeLanguage, {
            hour: '2-digit',
            minute: '2-digit'
          }).format(lastCheckDate),
          bp: `${randomBetween(108, 134)}/${randomBetween(65, 88)}`,
          hr: randomBetween(62, 104)
        };
      })
    );

    setAlerts(() => {
      const variants: Alert[] = [
        { id: 'a1', level: pickRandom(['critical', 'warning', 'info'] as const), messageKey: 'alerts.items.fall', time: '09:32' },
        { id: 'a2', level: pickRandom(['critical', 'warning', 'info'] as const), messageKey: 'alerts.items.heartRate', time: '09:05' },
        { id: 'a3', level: pickRandom(['critical', 'warning', 'info'] as const), messageKey: 'alerts.items.wearable', time: '08:58' },
        { id: 'a4', level: pickRandom(['critical', 'warning', 'info'] as const), messageKey: 'alerts.items.ota', time: '08:41' }
      ];
      return variants;
    });

    setLastUpdated(new Date());
  }, [activeLanguage]);

  return (
    <div className="app-background">
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
          <LanguageSwitcher />
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
            </div>
            <div className="filters" role="group" aria-label={t('residents.filters.aria')}>
              {filterOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={option === filter ? 'chip chip--active' : 'chip'}
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
                </tr>
              </thead>
              <tbody>
                {filteredResidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-placeholder">
                      {t('residents.empty')}
                    </td>
                  </tr>
                ) : (
                  filteredResidents.map((resident) => (
                    <tr key={resident.id}>
                      <td data-title={t('residents.columns.name')}>{resident.name}</td>
                      <td data-title={t('residents.columns.room')}>{resident.room}</td>
                      <td data-title={t('residents.columns.lastCheck')}>{resident.lastCheck}</td>
                      <td data-title={t('residents.columns.vitals')}>
                        {resident.bp} • {t('residents.hrLabel', { value: resident.hr })}
                      </td>
                      <td data-title={t('residents.columns.status')}>
                        <span className={`status status-${resident.status}`}>
                          {t(`residents.status.${resident.status}`)}
                        </span>
                      </td>
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
                  <span className="alert-text">{t(alert.messageKey)}</span>
                  <time className="alert-time" dateTime={alert.time}>
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
              <li>{t('insights.items.hydration')}</li>
              <li>{t('insights.items.nightRounds')}</li>
              <li>{t('insights.items.physiotherapy')}</li>
              <li>{t('insights.items.familyFeedback')}</li>
            </ul>
          </article>
        </section>

        <footer className="app-footer">
          <p>{t('layout.footer')}</p>
        </footer>

        <section className="section next-steps">
          <h2>{t('nextSteps.title')}</h2>
          <ol>
            <li>{t('nextSteps.mapDataGateway')}</li>
            <li>{t('nextSteps.portTokens')}</li>
            <li>{t('nextSteps.addRouting')}</li>
          </ol>
          <div className="language-shortcuts">
            {otherLanguages.map((option) => (
              <span key={option.code} className="language-badge">
                {t('common.switchTo', { label: option.label })}
              </span>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
