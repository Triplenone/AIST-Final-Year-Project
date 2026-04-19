export type FamilyRelation = 'daughter' | 'son' | 'spouse' | 'sibling' | 'other';

export type FamilyMember = {
  name: string;
  relation: FamilyRelation;
  phone: string;
};

export type ResidentContact = {
  phone: string;
  family: FamilyMember[];
};

export const RESIDENT_CONTACTS: Record<string, ResidentContact> = {
  'chan-tai-man': {
    phone: '+852 9000 0001',
    family: [
      { name: 'LEE TAI MAN 李大雯', relation: 'daughter', phone: '+852 9000 0002' },
      { name: 'CHAN SIU MING 陳小明', relation: 'son', phone: '+852 9000 0003' }
    ]
  }
};
