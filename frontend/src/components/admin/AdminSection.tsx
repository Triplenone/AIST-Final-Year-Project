import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UsersAdmin } from './UsersAdmin';
import { DevicesAdmin } from './DevicesAdmin';
import { LocationsAdmin } from './LocationsAdmin';
import { EventsAdmin } from './EventsAdmin';
import { DeviceLogsAdmin } from './DeviceLogsAdmin';
import { ResidentsAdmin } from './ResidentsAdmin';

export type AdminTab =
  | 'users'
  | 'devices'
  | 'locations'
  | 'events'
  | 'logs'
  | 'residents';

type AdminSectionProps = {
  activeTab?: AdminTab;
  onTabChange?: (tab: AdminTab) => void;
};

export const AdminSection = ({ activeTab: controlledTab, onTabChange }: AdminSectionProps) => {
  const { t } = useTranslation();
  const [internalTab, setInternalTab] = useState<AdminTab>('residents');
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = onTabChange ?? setInternalTab;

  useEffect(() => {
    if (controlledTab != null) {
      setInternalTab(controlledTab);
    }
  }, [controlledTab]);

  const tabLabels: Record<AdminTab, string> = {
    residents: t('admin.tabs.residents'),
    users: t('admin.tabs.users'),
    devices: t('admin.tabs.devices'),
    locations: t('admin.tabs.locations'),
    events: t('admin.tabs.events'),
    logs: t('admin.tabs.logs')
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
            onClick={() => setActiveTab(tab as AdminTab)}
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
      </div>
    </section>
  );
};
