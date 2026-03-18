import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { UsersAdmin } from './UsersAdmin';
import { DevicesAdmin } from './DevicesAdmin';
import { LocationsAdmin } from './LocationsAdmin';
import { EventsAdmin } from './EventsAdmin';
import { DeviceLogsAdmin } from './DeviceLogsAdmin';
import { ResidentsAdmin } from './ResidentsAdmin';
import { UserStatusAdmin } from './UserStatusAdmin';
import { KpiAdmin } from './KpiAdmin';

type AdminTab =
  | 'users'
  | 'devices'
  | 'locations'
  | 'events'
  | 'logs'
  | 'residents'
  | 'userStatus'
  | 'kpi';

export const AdminSection = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AdminTab>('residents');

  const tabLabels: Record<AdminTab, string> = {
    residents: t('admin.tabs.residents'),
    users: t('admin.tabs.users'),
    devices: t('admin.tabs.devices'),
    locations: t('admin.tabs.locations'),
    events: t('admin.tabs.events'),
    logs: t('admin.tabs.logs'),
    userStatus: t('admin.tabs.userStatus'),
    kpi: t('admin.tabs.kpi')
  };

  return (
    <section id="admin" className="section admin-section">
      <header className="section-heading">
        <div>
          <h2>{t('admin.detailsTitle')}</h2>
          <p className="muted">{t('admin.detailsSubtitle')}</p>
        </div>
      </header>

      <div className="admin-tabs">
        {(Object.keys(tabLabels) as AdminTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`admin-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      <div className="admin-panel">
        {activeTab === 'users' && <UsersAdmin />}
        {activeTab === 'devices' && <DevicesAdmin />}
        {activeTab === 'locations' && <LocationsAdmin />}
        {activeTab === 'events' && <EventsAdmin />}
        {activeTab === 'logs' && <DeviceLogsAdmin />}
        {activeTab === 'residents' && <ResidentsAdmin />}
        {activeTab === 'userStatus' && <UserStatusAdmin />}
        {activeTab === 'kpi' && <KpiAdmin />}
      </div>
    </section>
  );
};
