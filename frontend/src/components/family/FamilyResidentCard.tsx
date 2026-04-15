import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { BackendResident } from '../../types/backend';

type FamilyResidentCardProps = {
  resident: BackendResident;
  isSelected: boolean;
  onSelect: (residentId: string) => void;
};

const getAvatarInitial = (name: string) => {
  const trimmedName = name.trim();
  return trimmedName ? trimmedName.charAt(0).toUpperCase() : '?';
};

export function FamilyResidentCard({ resident, isSelected, onSelect }: FamilyResidentCardProps) {
  const { t } = useTranslation();
  const [imageUnavailable, setImageUnavailable] = useState(false);

  const avatarUrl = resident.avatar_url?.trim() ? resident.avatar_url.trim() : null;
  const showImage = Boolean(avatarUrl) && !imageUnavailable;

  return (
    <button
      type="button"
      className={`family-resident-card${isSelected ? ' family-resident-card--selected' : ''}`}
      onClick={() => onSelect(resident.id)}
      aria-pressed={isSelected}
    >
      <span className="family-resident-card__avatar-wrap">
        {showImage ? (
          <img
            className="family-resident-card__avatar"
            src={avatarUrl ?? undefined}
            alt={t('family.avatarAlt', { name: resident.name })}
            loading="lazy"
            onError={() => setImageUnavailable(true)}
          />
        ) : (
          <span className="family-resident-card__avatar-fallback" aria-hidden="true">
            {getAvatarInitial(resident.name)}
          </span>
        )}
      </span>

      <span className="family-resident-card__body">
        <span className="family-resident-card__heading">
          <strong className="family-resident-card__name">{resident.name}</strong>
          <span className={`family-resident-card__status family-resident-card__status--${resident.status}`}>
            {t(`residents.status.${resident.status}`)}
          </span>
        </span>

        <span className="family-resident-card__label">{t('family.roomLabel')}</span>
        <span className="family-resident-card__room">{resident.room?.trim() || t('family.roomUnknown')}</span>
      </span>
    </button>
  );
}
