import type { BackendResidentStatus, RoleType } from './backend';

export type ResidentStatus = BackendResidentStatus;

export type ResidentVitals = {
  hr: number;
  bpSystolic: number;
  bpDiastolic: number;
  spo2: number;
  temperature: number;
};

export type Resident = {
  id: string;
  name: string;
  room: string;
  status: ResidentStatus;
  lastSeenAt?: string;
  lastSeenLocation: string;
  vitals: ResidentVitals;
  checkedOut: boolean;
  createdAt: string;
  updatedAt: string;
  origin?: 'db';
  roleType?: RoleType | null;
};
