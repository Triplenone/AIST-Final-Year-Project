import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import '../../styles/family-page.css';
import { VitalsHistoryPanel } from './VitalsHistoryPanel';

type VitalsHistoryModalProps = {
  residentId: string | null;
  residentName: string | null;
  isOpen: boolean;
  onClose: () => void;
};

export function VitalsHistoryModal({
  residentId,
  residentName,
  isOpen,
  onClose,
}: VitalsHistoryModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !residentId || !residentName) {
    return null;
  }

  return (
    <div
      className="family-modal"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="family-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="family-vitals-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="family-modal__header">
          <div>
            <p className="family-modal__eyebrow">{t('layout.nav.residents')}</p>
            <h3 id="family-vitals-modal-title">{t('residents.vitalsModal.title')}</h3>
            <p className="family-modal__note">
              {t('residents.vitalsModal.subtitle', { name: residentName })}
            </p>
          </div>
          <button
            type="button"
            className="family-modal__close"
            onClick={onClose}
          >
            {t('residents.vitalsModal.close')}
          </button>
        </header>

        <VitalsHistoryPanel residentId={residentId} residentName={residentName} />
      </div>
    </div>
  );
}
