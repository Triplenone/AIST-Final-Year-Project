import type { TFunction } from 'i18next';

import type { Resident } from '../sse/client';
import { initialMetrics } from '../constants/metrics';

export type RawMetrics = {
  wellbeing: number;
  alertsResolved: number;
  responseTime: number;
};

export const STATUS_SCORE_OFFSET: Record<Resident['status'], number> = {
  stable: 8,
  followUp: -6,
  high: -14,
  checked_out: -18
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const computeResidentScore = (resident: Resident): number => {
  const baseScore = 90;
  const vitals = resident.vitals;

  if (!vitals) {
    return clamp(baseScore + STATUS_SCORE_OFFSET[resident.status] - 10, 45, 98);
  }

  const hrPenalty = Math.max(0, Math.abs(vitals.hr - 72) - 8) * 0.6;
  const spo2Penalty = Math.max(0, 98 - vitals.spo2) * 1.6;
  const tempPenalty = Math.max(0, Math.abs(vitals.temperature - 36.7) - 0.35) * 12;
  const bpSysPenalty = Math.max(0, Math.abs(vitals.bpSystolic - 118) - 12) * 0.35;
  const bpDiaPenalty = Math.max(0, Math.abs(vitals.bpDiastolic - 78) - 8) * 0.6;

  const penalties = hrPenalty + spo2Penalty + tempPenalty + bpSysPenalty + bpDiaPenalty;
  const score = baseScore - penalties + STATUS_SCORE_OFFSET[resident.status];

  return clamp(Math.round(score), 45, 98);
};

export const deriveResidentMetrics = (residents: Resident[], now: number): RawMetrics => {
  const activeResidents = residents.filter((resident) => !resident.checkedOut);
  if (activeResidents.length === 0) {
    return {
      wellbeing: initialMetrics.wellbeing.value,
      alertsResolved: initialMetrics.alertsResolved.value,
      responseTime: initialMetrics.responseTime.value
    };
  }

  const wellbeingTotal = activeResidents.reduce((total, resident) => total + computeResidentScore(resident), 0);
  const wellbeing = Math.round(wellbeingTotal / activeResidents.length);

  const statusTally = activeResidents.reduce(
    (acc, resident) => {
      if (resident.status === 'stable') acc.stable += 1;
      if (resident.status === 'followUp') acc.followUp += 1;
      if (resident.status === 'high') acc.high += 1;
      return acc;
    },
    { stable: 0, followUp: 0, high: 0 }
  );

  const alertsResolvedScore = statusTally.stable * 3 + statusTally.followUp - statusTally.high * 2;
  const alertsResolved = Math.max(0, alertsResolvedScore * 2);

  const responseMinutes = activeResidents
    .map((resident) => {
      const baseTimestamp = resident.lastSeenAt ?? resident.updatedAt ?? resident.createdAt;
      const parsed = baseTimestamp ? Date.parse(baseTimestamp) : Number.NaN;
      if (Number.isNaN(parsed)) {
        return null;
      }
      const diffMinutes = Math.round((now - parsed) / 60000);
      return Math.max(0, diffMinutes);
    })
    .filter((value): value is number => value !== null);

  const responseTime =
    responseMinutes.length === 0
      ? initialMetrics.responseTime.value
      : Math.max(1, Math.round(responseMinutes.reduce((sum, minutes) => sum + minutes, 0) / responseMinutes.length));

  return {
    wellbeing,
    alertsResolved,
    responseTime
  };
};

export const toLocalDateTimeInputValue = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

export const fromLocalDateTimeInputValue = (value: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
};

export const primaryTimestamp = (resident: Resident) => resident.lastSeenAt ?? resident.updatedAt ?? resident.createdAt;

export const parseTimestamp = (value: string | null | undefined): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

export const minutesSinceResident = (resident: Resident, now: number): number | null => {
  const timestamp = parseTimestamp(primaryTimestamp(resident));
  if (!timestamp) {
    return null;
  }
  const diffMinutes = Math.round((now - timestamp.getTime()) / 60000);
  return Number.isNaN(diffMinutes) ? null : Math.max(0, diffMinutes);
};

export const formatAlertTime = (
  resident: Resident,
  formatter: Intl.DateTimeFormat
): { label: string; iso: string | null } => {
  const timestamp = parseTimestamp(primaryTimestamp(resident));
  if (!timestamp) {
    return { label: '—', iso: null };
  }
  return { label: formatter.format(timestamp), iso: timestamp.toISOString() };
};

const formatDurationLabel = (minutes: number, t: TFunction<'translation'>): string => {
  return t('stats.delta.minutes', { count: minutes });
};

const fallbackAlertTemplates: Array<{ id: string; level: 'critical' | 'warning' | 'info'; key: string; time: string }> =
  [
    { id: 'a1', level: 'critical', key: 'alerts.items.fall', time: '09:32' },
    { id: 'a2', level: 'warning', key: 'alerts.items.heartRate', time: '09:05' },
    { id: 'a3', level: 'info', key: 'alerts.items.wearable', time: '08:58' },
    { id: 'a4', level: 'info', key: 'alerts.items.ota', time: '08:41' }
  ];

const fallbackInsightKeys = [
  'insights.items.hydration',
  'insights.items.nightRounds',
  'insights.items.physiotherapy',
  'insights.items.familyFeedback'
];

export const deriveAlertsFromResidents = (
  residents: Resident[],
  now: number,
  formatter: Intl.DateTimeFormat,
  t: TFunction<'translation'>
) => {
  type AlertLevel = 'critical' | 'warning' | 'info';

  const limit = fallbackAlertTemplates.length;
  const activeResidents = residents.filter((resident) => !resident.checkedOut);
  if (activeResidents.length === 0) {
    return fallbackAlertTemplates.map((template) => ({
      id: template.id,
      level: template.level as AlertLevel,
      message: t(template.key),
      time: template.time,
      timestamp: null
    }));
  }

  const results: Array<{
    id: string;
    level: AlertLevel;
    message: string;
    time: string;
    timestamp: string | null;
  }> = [];
  const seenIds = new Set<string>();
  const pushAlert = (
    id: string,
    level: AlertLevel,
    message: string,
    time: string,
    timestamp: string | null = null
  ) => {
    if (!message || seenIds.has(id) || results.length >= limit) {
      return;
    }
    results.push({ id, level, message, time, timestamp });
    seenIds.add(id);
  };

  const priorityOrder: Record<Resident['status'], number> = {
    high: 0,
    followUp: 1,
    stable: 2,
    checked_out: 3
  };

  const sortedResidents = [...activeResidents].sort((a, b) => priorityOrder[a.status] - priorityOrder[b.status]);

  sortedResidents
    .filter((resident) => resident.status === 'high')
    .forEach((resident) => {
      const { label: timeLabel, iso } = formatAlertTime(resident, formatter);
      pushAlert(
        `high-${resident.id}`,
        'critical',
        t('alerts.generated.highStatus', { name: resident.name, room: resident.room }),
        timeLabel,
        iso
      );
      const vitals = resident.vitals;
      if (vitals && results.length < limit) {
        if (vitals.spo2 <= 92) {
          pushAlert(
            `spo2-${resident.id}`,
            'critical',
            t('alerts.generated.lowSpo2', { name: resident.name, spo2: vitals.spo2 }),
            timeLabel,
            iso
          );
        } else if (vitals.hr >= 110) {
          pushAlert(
            `hr-${resident.id}`,
            'warning',
            t('alerts.generated.highHr', { name: resident.name, hr: vitals.hr }),
            timeLabel,
            iso
          );
        } else if (vitals.temperature >= 38) {
          pushAlert(
            `temp-${resident.id}`,
            'warning',
            t('alerts.generated.temperatureHigh', {
              name: resident.name,
              temperature: vitals.temperature.toFixed(1)
            }),
            timeLabel,
            iso
          );
        }
      }
    });

  sortedResidents
    .filter((resident) => resident.status === 'followUp')
    .forEach((resident) => {
      const { label: timeLabel, iso } = formatAlertTime(resident, formatter);
      pushAlert(
        `follow-${resident.id}`,
        'warning',
        t('alerts.generated.followUp', { name: resident.name, room: resident.room }),
        timeLabel,
        iso
      );
    });

  sortedResidents.forEach((resident) => {
    const minutes = minutesSinceResident(resident, now);
    if (minutes !== null && minutes >= 90) {
      const { label: timeLabel, iso } = formatAlertTime(resident, formatter);
      pushAlert(
        `stale-${resident.id}`,
        'info',
        t('alerts.generated.stale', { name: resident.name, duration: formatDurationLabel(minutes, t) }),
        timeLabel,
        iso
      );
    }
  });

  if (results.length < limit) {
    fallbackAlertTemplates.forEach((template) => {
      if (results.length >= limit) return;
      pushAlert(
        `fallback-${template.id}`,
        template.level as AlertLevel,
        t(template.key),
        template.time,
        null
      );
    });
  }

  return results.slice(0, limit);
};

export const deriveInsightsFromResidents = (residents: Resident[], now: number, t: TFunction<'translation'>) => {
  const limit = fallbackInsightKeys.length;
  const activeResidents = residents.filter((resident) => !resident.checkedOut);
  if (activeResidents.length === 0) {
    return fallbackInsightKeys.map((key, index) => ({
      id: `fallback-${index}`,
      text: t(key)
    }));
  }

  const results: Array<{ id: string; text: string }> = [];
  const seenTexts = new Set<string>();
  const pushInsight = (id: string, text: string) => {
    if (!text || seenTexts.has(text) || results.length >= limit) {
      return;
    }
    results.push({ id, text });
    seenTexts.add(text);
  };

  activeResidents
    .filter((resident) => resident.status === 'high')
    .forEach((resident) => {
      pushInsight(`focus-${resident.id}`, t('insights.generated.focusHigh', { name: resident.name, room: resident.room }));
    });

  activeResidents
    .filter((resident) => resident.status === 'followUp')
    .forEach((resident) => {
      pushInsight(`follow-${resident.id}`, t('insights.generated.followUp', { name: resident.name, room: resident.room }));
    });

  activeResidents.forEach((resident) => {
    const minutes = minutesSinceResident(resident, now);
    if (minutes !== null && minutes >= 120) {
      pushInsight(
        `hydration-${resident.id}`,
        t('insights.generated.hydration', { name: resident.name, duration: formatDurationLabel(minutes, t) })
      );
    }
  });

  const stableResident = activeResidents.find((resident) => resident.status === 'stable');
  if (stableResident) {
    pushInsight(`positive-${stableResident.id}`, t('insights.generated.familyUpdate', { name: stableResident.name }));
  }

  activeResidents.forEach((resident) => {
    if (results.length >= limit) return;
    pushInsight(
      `location-${resident.id}`,
      t('insights.generated.location', {
        name: resident.name,
        location: resident.lastSeenLocation ?? resident.room
      })
    );
  });

  if (results.length < limit) {
    fallbackInsightKeys.forEach((key, index) => {
      if (results.length >= limit) return;
      pushInsight(`fallback-${index}`, t(key));
    });
  }

  return results.slice(0, limit);
};

export const statusOptions: Resident['status'][] = ['stable', 'followUp', 'high', 'checked_out'];
