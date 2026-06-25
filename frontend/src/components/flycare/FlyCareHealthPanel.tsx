import { useTranslation } from 'react-i18next';

import {
  getPositionZoneDisplayForResident,
  type PositionMapProfile,
  type PositionResidentViewModel
} from '../../adapters/position-command-center';
import type { ReminderLatestItem } from '../../services/api';

type FlyCareHealthPanelProps = {
  resident: PositionResidentViewModel | null;
  fetchedAt: string | null;
  mapProfile?: PositionMapProfile;
  latestReminder?: ReminderLatestItem | null;
};

function formatValue(value: unknown): string {
  return value != null && value !== '' ? String(value) : 'No data';
}

function formatMetric(value: number | null, suffix: string): string {
  return value == null ? 'No data' : `${value}${suffix}`;
}

function formatTime(value: string | null, locale: string): string {
  if (!value) return 'No data';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(parsed));
}

function formatCoords(resident: PositionResidentViewModel | null): string {
  if (!resident?.currentCoords) return 'No data';
  return `${resident.currentCoords.x}, ${resident.currentCoords.y}`;
}

export function FlyCareHealthPanel({
  resident,
  fetchedAt,
  mapProfile = 'indoor',
  latestReminder = null
}: FlyCareHealthPanelProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en';
  const location = resident ? getPositionZoneDisplayForResident(resident, t, mapProfile) : 'No data';
  const reminder = latestReminder?.reminder;
  const medicine = latestReminder?.medicine_name ?? reminder?.medicine_name;
  const dosage = latestReminder?.dosage ?? reminder?.dosage;
  const scheduledTime = latestReminder?.scheduled_time ?? reminder?.scheduled_time;
  const reminderMessage = latestReminder?.message ?? reminder?.message;

  return (
    <section className="position-command-center__surface flycare-health-panel" aria-live="polite">
      <header className="flycare-health-panel__header">
        <div>
          <p className="position-command-center__eyebrow">
            {t('flyCare.healthEyebrow', { defaultValue: 'Health' })}
          </p>
          <h2>{t('flyCare.healthTitle', { defaultValue: 'Health information' })}</h2>
        </div>
      </header>

      <dl className="flycare-health-panel__grid">
        <div>
          <dt>{t('flyCare.healthResident', { defaultValue: 'Resident' })}</dt>
          <dd>{formatValue(resident?.displayName)}</dd>
        </div>
        <div>
          <dt>{t('position.heartRateBpm', { defaultValue: 'Heart rate' })}</dt>
          <dd>{formatMetric(resident?.heartRate ?? null, ' bpm')}</dd>
        </div>
        <div>
          <dt>{t('position.spo2Percentage', { defaultValue: 'SpO2' })}</dt>
          <dd>{formatMetric(resident?.spo2 ?? null, '%')}</dd>
        </div>
        <div>
          <dt>{t('position.batteryLevel', { defaultValue: 'Battery' })}</dt>
          <dd>{formatMetric(resident?.battery ?? null, '%')}</dd>
        </div>
        <div>
          <dt>{t('position.currentLocation', { defaultValue: 'Current zone' })}</dt>
          <dd>{location}</dd>
        </div>
        <div>
          <dt>{t('position.coordinates', { defaultValue: 'Coordinates' })}</dt>
          <dd>{formatCoords(resident)}</dd>
        </div>
        <div>
          <dt>{t('position.fallStateDescription', { defaultValue: 'Fall state' })}</dt>
          <dd>{formatValue(resident?.fallState)}</dd>
        </div>
        <div>
          <dt>{t('position.sosStatus', { defaultValue: 'SOS state' })}</dt>
          <dd>
            {resident?.sosState
              ? t('flyCare.healthSosActive', { defaultValue: 'Active' })
              : t('flyCare.healthSosNormal', { defaultValue: 'Normal' })}
          </dd>
        </div>
        <div>
          <dt>{t('position.freshness', { defaultValue: 'Freshness' })}</dt>
          <dd>{formatValue(resident?.freshnessLevel)}</dd>
        </div>
        <div>
          <dt>{t('position.lastUpdate', { defaultValue: 'Last update' })}</dt>
          <dd>{formatTime(resident?.lastSeenAt ?? fetchedAt, locale)}</dd>
        </div>
        <div>
          <dt>{t('flyCare.latestReminder', { defaultValue: 'Latest reminder' })}</dt>
          <dd>{formatValue(medicine)}</dd>
        </div>
        <div>
          <dt>{t('flyCare.reminderDosage', { defaultValue: 'Dosage' })}</dt>
          <dd>{formatValue(dosage)}</dd>
        </div>
        <div>
          <dt>{t('flyCare.reminderTime', { defaultValue: 'Reminder time' })}</dt>
          <dd>{formatValue(scheduledTime)}</dd>
        </div>
        <div>
          <dt>{t('flyCare.reminderMessage', { defaultValue: 'Reminder note' })}</dt>
          <dd>{formatValue(reminderMessage)}</dd>
        </div>
      </dl>
    </section>
  );
}
