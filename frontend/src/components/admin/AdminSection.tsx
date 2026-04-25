import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UsersAdmin } from './UsersAdmin';
import { DevicesAdmin } from './DevicesAdmin';
import { LocationsAdmin } from './LocationsAdmin';
import { EventsAdmin } from './EventsAdmin';
import { DeviceLogsAdmin } from './DeviceLogsAdmin';
import { ResidentsAdmin } from './ResidentsAdmin';

type AdminTab =
  | 'users'
  | 'devices'
  | 'locations'
  | 'events'
  | 'logs'
  | 'residents';

export const AdminSection = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AdminTab>('residents');

  const tabLabels: Record<AdminTab, string> = {
    residents: t('admin.tabs.residents'),
    users: t('admin.tabs.users'),
    devices: t('admin.tabs.devices'),
    locations: t('admin.tabs.locations'),
    events: t('admin.tabs.events'),
    logs: t('admin.tabs.logs')
  };

  const tabMeta: Record<
    AdminTab,
    {
      eyebrow: string;
      title: string;
      note: string;
      surface: string;
      endpoint: string;
      checklist: [string, string, string];
    }
  > = {
    residents: {
      eyebrow: 'Resident operations',
      title: 'Roster control',
      note: 'Scan resident status, room context, and device linkage before opening deeper records.',
      surface: 'Directory first',
      endpoint: '/api/v1/residents',
      checklist: ['Check filters first', 'Confirm status drift', 'Keep handoff notes short']
    },
    users: {
      eyebrow: 'Identity control',
      title: 'Account registry',
      note: 'Use this surface to verify role assignment, contact quality, and edit pressure on user records.',
      surface: 'Access and contact',
      endpoint: '/api/v1/users',
      checklist: ['Verify role before edit', 'Review contact fields', 'Avoid duplicate accounts']
    },
    devices: {
      eyebrow: 'Hardware fleet',
      title: 'Device registry',
      note: 'Confirm assignment, battery posture, and deployment location before changing fleet records.',
      surface: 'Fleet overview',
      endpoint: '/api/v1/devices',
      checklist: ['Review deployment zone', 'Check battery state', 'Confirm elderly assignment']
    },
    locations: {
      eyebrow: 'Space model',
      title: 'Zone registry',
      note: 'Keep location names, categories, and safe-zone flags coherent before downstream map logic consumes them.',
      surface: 'Zone structure',
      endpoint: '/api/v1/locations',
      checklist: ['Check category naming', 'Verify safe-zone flag', 'Keep beacon references aligned']
    },
    events: {
      eyebrow: 'Incident desk',
      title: 'Event handling',
      note: 'Prioritize recent incidents, confirm status transitions, and keep remarks short enough for fast review.',
      surface: 'Incident workflow',
      endpoint: '/api/v1/events',
      checklist: ['Handle newest events first', 'Confirm trigger sources', 'Keep resolution remark explicit']
    },
    logs: {
      eyebrow: 'Telemetry audit',
      title: 'Device log intake',
      note: 'Review reception quality, fall confirmation fields, and ingest freshness before touching raw log records.',
      surface: 'Raw device stream',
      endpoint: '/api/v1/device-data-log',
      checklist: ['Check ingest totals', 'Validate fall-confirm fields', 'Watch auto-refresh before edit']
    }
  };

  const orderedTabs: AdminTab[] = ['events', 'residents', 'users', 'devices', 'locations', 'logs'];
  const activeMeta = tabMeta[activeTab];

  const renderActivePanel = () => {
    if (activeTab === 'users') return <UsersAdmin />;
    if (activeTab === 'devices') return <DevicesAdmin />;
    if (activeTab === 'locations') return <LocationsAdmin />;
    if (activeTab === 'events') return <EventsAdmin />;
    if (activeTab === 'logs') return <DeviceLogsAdmin />;
    return <ResidentsAdmin />;
  };

  return (
    <section id="admin" className="section admin-section admin-section--workspace">
      <header className="section-heading admin-section__heading">
        <div className="admin-section__intro">
          <p className="admin-section__eyebrow">Admin control room</p>
          <h2>{t('admin.detailsTitle')}</h2>
          <p className="admin-section__lead">{t('admin.detailsSubtitle')}</p>
        </div>
        <div className="admin-section__summary" role="list" aria-label="Admin summary">
          <article className="admin-section__summary-card" role="listitem">
            <span className="admin-section__summary-label">Domains</span>
            <strong className="admin-section__summary-value">{orderedTabs.length}</strong>
          </article>
          <article className="admin-section__summary-card" role="listitem">
            <span className="admin-section__summary-label">Current workspace</span>
            <strong className="admin-section__summary-value">{tabLabels[activeTab]}</strong>
          </article>
          <article className="admin-section__summary-card" role="listitem">
            <span className="admin-section__summary-label">Endpoint family</span>
            <strong className="admin-section__summary-value">{activeMeta.endpoint}</strong>
          </article>
        </div>
      </header>

      <div className="admin-tabs admin-tabs--workspace" role="tablist" aria-label="Admin workspaces">
        {orderedTabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`admin-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
            role="tab"
            aria-selected={activeTab === tab}
          >
            <span className="admin-tab__label">{tabLabels[tab]}</span>
          </button>
        ))}
      </div>

      <div className="admin-workspace">
        <section className="admin-workspace__main">
          <div className="admin-workspace__brief">
            <div>
              <p className="admin-workspace__eyebrow">{activeMeta.eyebrow}</p>
              <h3>{activeMeta.title}</h3>
              <p className="admin-workspace__note">{activeMeta.note}</p>
            </div>
            <span className="admin-workspace__brief-chip">{activeMeta.surface}</span>
          </div>

          <div className="admin-panel admin-panel--workspace">{renderActivePanel()}</div>
        </section>

        <aside className="admin-workspace__aside">
          <section className="admin-workspace__hint-card">
            <p className="admin-workspace__hint-eyebrow">Operator focus</p>
            <h4>{tabLabels[activeTab]}</h4>
            <p className="admin-workspace__hint-copy">
              Keep this workspace narrow in scope: review the current list, confirm the field that matters, then edit once.
            </p>
          </section>

          <section className="admin-workspace__hint-card">
            <p className="admin-workspace__hint-eyebrow">What to verify</p>
            <ul className="admin-workspace__hint-list">
              {activeMeta.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </section>
  );
};
