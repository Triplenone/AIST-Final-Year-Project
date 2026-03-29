import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import { metricOrder, type Metrics } from '../../constants/metrics';
import type { Resident } from '../../sse/client';
import eldercareTextureUrl from '../../assets/brand/texture-eldercare-exact-full.svg';
import eldercareImg from '../../img/ElderlyCare.png';
import { DashboardCharts } from '../charts/DashboardCharts';

type MetricPoint = Metrics[keyof Metrics];

type OverviewAlert = {
  id: string;
  level: string;
  message: string;
  time: string;
  timestamp?: string | null;
};

type OverviewInsight = {
  id: string;
  text: string;
};

type OverviewExperienceProps = {
  metrics: Metrics;
  demoMode: boolean;
  formattedTime: string;
  statusData: Array<{ name: string; value: number }>;
  zoneData: Array<{ name: string; value: number }>;
  alertTrendData: Array<{ name: string; alerts: number }>;
  chartLabels: {
    statusTitle: string;
    statusSubtitle: string;
    zoneTitle: string;
    zoneSubtitle: string;
    alertsTitle: string;
    alertsSubtitle: string;
    alertsSeries: string;
    empty: string;
  };
  alerts: OverviewAlert[];
  insights: OverviewInsight[];
  residents: Resident[];
  activeResidentCount: number;
  priorityResidentCount: number;
  fallEventCount: number;
  onSimulate: () => void;
  onExitDemo: () => void;
};

const heroTransition = {
  duration: 0.48,
  ease: [0.22, 1, 0.36, 1]
} as const;

export function OverviewExperience({
  metrics,
  demoMode,
  formattedTime,
  statusData,
  zoneData,
  alertTrendData,
  chartLabels,
  alerts,
  insights,
  residents,
  activeResidentCount,
  priorityResidentCount,
  fallEventCount,
  onSimulate,
  onExitDemo
}: OverviewExperienceProps) {
  const { t } = useTranslation();

  const spotlightResidents = residents.slice(0, 4);
  const strongestZone = zoneData[0];
  const signalPanels = [
    {
      label: 'Active residents',
      value: String(activeResidentCount),
      detail: strongestZone ? `${chartLabels.zoneTitle}: ${strongestZone.name}` : chartLabels.empty
    },
    {
      label: 'Priority queue',
      value: String(priorityResidentCount),
      detail: `${chartLabels.alertsTitle}: ${fallEventCount}`
    },
    {
      label: 'Sync pulse',
      value: formattedTime,
      detail: demoMode ? 'Demo mode active' : 'Live stream connected'
    }
  ];

  const nextSteps = [
    t('nextSteps.mapDataGateway'),
    t('nextSteps.portTokens'),
    t('nextSteps.addRouting')
  ];

  return (
    <div className="overview-scene">
      <motion.section
        className="overview-hero"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={heroTransition}
      >
        <div className="overview-hero__copy">
          <p className="overview-hero__eyebrow">{t('hero.eyebrow')}</p>
          <h1>{t('hero.title')}</h1>
          <p className="overview-hero__lede">{t('hero.description')}</p>

          <div className="overview-hero__actions">
            <button type="button" className="primary" onClick={onSimulate}>
              {t('actions.simulate')}
            </button>
            {demoMode ? (
              <button type="button" className="secondary" onClick={onExitDemo}>
                {t('actions.exitDemo')}
              </button>
            ) : null}
            <span className="overview-hero__timestamp">{t('hero.lastUpdated', { time: formattedTime })}</span>
          </div>
        </div>

        <div className="overview-hero__visual">
          <div className="overview-hero__visual-base" aria-hidden="true">
            <img className="overview-hero__visual-layer" src={eldercareImg} alt="" />
          </div>
          <div className="overview-hero__brand-texture" aria-hidden="true">
            <img className="overview-hero__brand-texture-image" src={eldercareTextureUrl} alt="" />
          </div>
          <div className="overview-hero__veil" />
          <div className="overview-signal-grid">
            {signalPanels.map((panel, index) => (
              <motion.article
                key={panel.label}
                className="overview-signal"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...heroTransition, delay: 0.08 + index * 0.08 }}
              >
                <span className="overview-signal__label">{panel.label}</span>
                <strong className="overview-signal__value">{panel.value}</strong>
                <p className="overview-signal__detail">{panel.detail}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </motion.section>

      <section className="metrics-rail">
        {metricOrder.map((metricKey) => {
          const metric: MetricPoint = metrics[metricKey];
          const isPositive = metric.delta >= 0;
          const deltaLabel =
            metricKey === 'responseTime'
              ? t('stats.delta.minutes', { count: Math.abs(metric.delta) })
              : t('stats.delta.points', { count: Math.abs(metric.delta) });

          return (
            <article key={metricKey} className="metrics-rail__card">
              <div className="metrics-rail__topline">
                <h2>{t(`stats.${metricKey}.title`)}</h2>
                <span className={`metrics-rail__delta ${isPositive ? 'is-positive' : 'is-negative'}`}>
                  {isPositive ? '+' : '-'}
                  {deltaLabel}
                </span>
              </div>
              <p className="metrics-rail__value">
                {metricKey === 'responseTime' ? `${metric.value} ${t('stats.responseTime.unit')}` : metric.value}
              </p>
              <p className="metrics-rail__detail">{t(`stats.${metricKey}.description`)}</p>
            </article>
          );
        })}
      </section>

      <section className="overview-grid">
        <article className="overview-panel overview-panel--charts">
          <div className="overview-panel__header">
            <div>
              <p className="overview-panel__eyebrow">Command deck</p>
              <h2>{t('charts.title')}</h2>
            </div>
            <span className="overview-panel__chip">{t('charts.subtitle')}</span>
          </div>
          <DashboardCharts
            statusData={statusData}
            zoneData={zoneData}
            alertTrendData={alertTrendData}
            labels={chartLabels}
          />
        </article>

        <article className="overview-panel overview-panel--feed">
          <div className="overview-panel__header">
            <div>
              <p className="overview-panel__eyebrow">Recent alerts</p>
              <h2>{t('alerts.title')}</h2>
            </div>
            <span className="overview-panel__chip">{t('alerts.subtitle')}</span>
          </div>
          <ul className="alert-list">
            {alerts.slice(0, 5).map((alert) => (
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

        <article className="overview-panel overview-panel--focus">
          <div className="overview-panel__header">
            <div>
              <p className="overview-panel__eyebrow">Human layer</p>
              <h2>{t('insights.title')}</h2>
            </div>
            <span className="overview-panel__chip">{t('insights.subtitle')}</span>
          </div>

          <ul className="overview-resident-list">
            {spotlightResidents.length === 0 ? (
              <li className="overview-resident-list__empty">{chartLabels.empty}</li>
            ) : (
              spotlightResidents.map((resident) => (
                <li key={resident.id} className="overview-resident">
                  <div>
                    <strong>{resident.name}</strong>
                    <p>{resident.room ?? chartLabels.empty}</p>
                  </div>
                  <span className={`status status-${resident.status}`}>{t(`residents.status.${resident.status}`)}</span>
                </li>
              ))
            )}
          </ul>

          <ul className="insight-list">
            {insights.slice(0, 4).map((insight) => (
              <li key={insight.id}>{insight.text}</li>
            ))}
          </ul>
        </article>

        <article className="overview-panel overview-panel--next">
          <div className="overview-panel__header">
            <div>
              <p className="overview-panel__eyebrow">Delivery focus</p>
              <h2>{t('nextSteps.title')}</h2>
            </div>
            <span className="overview-panel__chip">Non-FlyCare roadmap</span>
          </div>

          <ol className="overview-next-list">
            {nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>
      </section>
    </div>
  );
}
