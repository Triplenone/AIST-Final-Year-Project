// ä½æ?è³‡æ?? å?ï¼šå?ç«????ç«¯ Resident ?‹åˆ¥
// Resident data mapping: backend response (BackendResident) to frontend Resident
import type { BackendResident } from '../types/backend';
import type { Resident } from '../types/resident';

const safeNumber = (value: number | null | undefined, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

export const mapBackendResidentToResident = (backend: BackendResident): Resident => {
  const hr = safeNumber(backend.vitals?.hr ?? backend.heart_rate, 72);
  const spo2 = safeNumber(backend.vitals?.spo2 ?? backend.blood_oxygen, 98);
  const temperature = safeNumber(backend.vitals?.temperature ?? backend.body_temperature, 36.7);
  const bpSystolic = safeNumber(backend.vitals?.bp_systolic, 118);
  const bpDiastolic = safeNumber(backend.vitals?.bp_diastolic, 78);

  const resolvedRoom =
    backend.room ||
    backend.last_seen_location ||
    backend.device_deploy_location ||
    'Unknown';

  return {
    id: backend.id,
    name: backend.name,
    room: resolvedRoom,
    status: backend.status,
    lastSeenAt: backend.last_seen_at ?? undefined,
    lastSeenLocation: backend.last_seen_location ?? backend.device_deploy_location ?? '',
    vitals: {
      hr,
      bpSystolic,
      bpDiastolic,
      spo2,
      temperature
    },
    checkedOut: backend.checked_out,
    createdAt: backend.created_at,
    updatedAt: backend.updated_at,
    origin: 'db'
  };
};

export const mapBackendResidents = (items: BackendResident[]): Resident[] =>
  items.map(mapBackendResidentToResident);

