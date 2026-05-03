import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
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

  const aboutPillars = [
    {
      key: 'mission',
      title: t('aboutUs.pillars.mission.title', { defaultValue: 'Our mission' }),
      description: t('aboutUs.pillars.mission.description', {
        defaultValue: 'Keep elderly residents safe with quiet, always-on sensing instead of intrusive checks.'
      })
    },
    {
      key: 'team',
      title: t('aboutUs.pillars.team.title', { defaultValue: 'Our team' }),
      description: t('aboutUs.pillars.team.description', {
        defaultValue: 'A multidisciplinary FYP team — AI, backend, hardware, and frontend — building the platform end to end.'
      })
    },
    {
      key: 'platform',
      title: t('aboutUs.pillars.platform.title', { defaultValue: 'Our platform' }),
      description: t('aboutUs.pillars.platform.description', {
        defaultValue: 'Wearable sensing, indoor positioning, fall detection, and care workflows woven into one workspace.'
      })
    }
  ];

  const whyItems = [
    {
      key: 'fall',
      title: t('whyChooseUs.items.fall.title', { defaultValue: 'Real-time fall detection' }),
      description: t('whyChooseUs.items.fall.description', {
        defaultValue: 'Wearable IMU + edge inference flags falls in seconds and routes the alert to on-shift caregivers.'
      })
    },
    {
      key: 'position',
      title: t('whyChooseUs.items.position.title', { defaultValue: 'Indoor positioning awareness' }),
      description: t('whyChooseUs.items.position.description', {
        defaultValue: 'Floor-plan map and zone history tell you where each resident is — not just that something happened.'
      })
    },
    {
      key: 'family',
      title: t('whyChooseUs.items.family.title', { defaultValue: 'Family communication' }),
      description: t('whyChooseUs.items.family.description', {
        defaultValue: 'Daily summaries and vitals snapshots let families stay informed without paging caregivers.'
      })
    },
    {
      key: 'workflow',
      title: t('whyChooseUs.items.workflow.title', { defaultValue: 'Caregiver-first workflows' }),
      description: t('whyChooseUs.items.workflow.description', {
        defaultValue: 'Handle alerts directly from the resident view — Confirm, Resolve, or False alarm without context switching.'
      })
    }
  ];

  const supportMetrics = metricOrder.map((metricKey) => {
    const metric: MetricPoint = metrics[metricKey];
    const isPositive = metric.delta >= 0;
    const deltaLabel =
      metricKey === 'responseTime'
        ? t('stats.delta.minutes', { count: Math.abs(metric.delta) })
        : t('stats.delta.points', { count: Math.abs(metric.delta) });

    return {
      key: metricKey,
      title: t(`stats.${metricKey}.title`),
      value: metricKey === 'responseTime' ? `${metric.value} ${t('stats.responseTime.unit')}` : String(metric.value),
      detail: t(`stats.${metricKey}.description`),
      deltaLabel,
      isPositive
    };
  });

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

      <motion.section
        className="overview-support"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ ...heroTransition, delay: 0.04 }}
      >
        <div className="overview-support__intro">
          <p className="overview-panel__eyebrow">Shift pulse</p>
          <h2>Three signals that frame the next handoff</h2>
          <p>
            Keep the first readout tight: wellbeing, resolution cadence, and response speed before operators dive into
            deeper panels.
          </p>
        </div>

        <div className="metrics-rail metrics-rail--support">
          {supportMetrics.map((metric) => (
            <article key={metric.key} className="metrics-rail__card">
              <div className="metrics-rail__topline">
                <h2>{metric.title}</h2>
                <span className={`metrics-rail__delta ${metric.isPositive ? 'is-positive' : 'is-negative'}`}>
                  {metric.isPositive ? '+' : '-'}
                  {metric.deltaLabel}
                </span>
              </div>
              <p className="metrics-rail__value">{metric.value}</p>
              <p className="metrics-rail__detail">{metric.detail}</p>
            </article>
          ))}
        </div>
      </motion.section>

      <motion.section
        className="overview-about"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ ...heroTransition, delay: 0.05 }}
      >
        <div className="overview-about__intro">
          <p className="overview-panel__eyebrow">{t('aboutUs.eyebrow', { defaultValue: 'About us' })}</p>
          <h2>{t('aboutUs.title', { defaultValue: 'Built by carers, for carers' })}</h2>
          <p>
            {t('aboutUs.description', {
              defaultValue:
                'Proactive Guardian Care is an FYP project from a Hong Kong team blending sensing hardware, AI fall detection, and care-team workflows so elderly residents stay safe without losing dignity.'
            })}
          </p>
        </div>
        <ul className="overview-about__pillars">
          {aboutPillars.map((pillar) => (
            <li key={pillar.key} className="overview-about__pillar">
              <strong>{pillar.title}</strong>
              <p>{pillar.description}</p>
            </li>
          ))}
        </ul>
      </motion.section>

      <motion.section
        className="overview-why"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ ...heroTransition, delay: 0.06 }}
      >
        <div className="overview-why__intro">
          <p className="overview-panel__eyebrow">
            {t('whyChooseUs.eyebrow', { defaultValue: 'Why choose us' })}
          </p>
          <h2>{t('whyChooseUs.title', { defaultValue: "Care that's both proactive and discreet" })}</h2>
          <p>
            {t('whyChooseUs.description', {
              defaultValue:
                'Four capabilities, one workspace — wearable safety, indoor awareness, family briefings, and a caregiver-first response loop.'
            })}
          </p>
        </div>
        <ul className="overview-why__grid">
          {whyItems.map((item) => (
            <li key={item.key} className="overview-why__card">
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </li>
          ))}
        </ul>
      </motion.section>

      <motion.section
        className="overview-detail-grid"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ ...heroTransition, delay: 0.06 }}
      >
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
              <p className="overview-panel__eyebrow">Care focus</p>
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

          <div className="overview-panel__divider" />

          <ul className="insight-list">
            {insights.slice(0, 4).map((insight) => (
              <li key={insight.id}>{insight.text}</li>
            ))}
          </ul>
        </article>
      </motion.section>

      <motion.section
        className="overview-roadmap"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ ...heroTransition, delay: 0.08 }}
      >
        <div className="overview-roadmap__intro">
          <p className="overview-panel__eyebrow">Delivery focus</p>
          <h2>{t('nextSteps.title')}</h2>
          <p>
            Keep the prototype grounded in one migration path: stable data hooks, shared tokens, and authenticated
            route rollout instead of more dashboard sprawl.
          </p>
          <div className="overview-roadmap__actions">
            <button type="button" className="primary" onClick={onSimulate}>
              {t('actions.simulate')}
            </button>
            {demoMode ? (
              <button type="button" className="secondary" onClick={onExitDemo}>
                {t('actions.exitDemo')}
              </button>
            ) : null}
            <span className="overview-roadmap__timestamp">{t('hero.lastUpdated', { time: formattedTime })}</span>
          </div>
        </div>

        <div className="overview-roadmap__content">
          <span className="overview-panel__chip">Non-FlyCare roadmap</span>
          <ol className="overview-next-list">
            {nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
      </motion.section>

      <div className="overview-entry-row">
        <article className="campus-entry campus-entry--bottom-left">
          <div>
            <strong>Campus</strong>
            <p>Smart campus navigation and emergency alert demo</p>
          </div>
          <NavLink to="/campus" aria-label="Open Campus">
            Open Campus
          </NavLink>
        </article>

        <div className="overview-flycare-hint">
          <NavLink to="/flycare" aria-label={t('layout.nav.flycare')}>
            {t('layout.nav.flycare')}
          </NavLink>
        </div>
      </div>
    </div>
  );
}
