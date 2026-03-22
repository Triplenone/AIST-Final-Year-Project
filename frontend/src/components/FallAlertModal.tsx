import { useTranslation } from 'react-i18next';

type FallAlertModalProps = {
  onGoToEvents: () => void;
};

export function FallAlertModal({ onGoToEvents }: FallAlertModalProps) {
  const { t } = useTranslation();

  return (
    <div className="fall-alert-modal" role="alertdialog" aria-modal="true" aria-labelledby="fall-alert-title">
      <div className="fall-alert-modal__backdrop" aria-hidden="true" />
      <div className="fall-alert-modal__dialog">
        <h2 id="fall-alert-title" className="fall-alert-modal__title">
          {t('fallAlert.message')}
        </h2>
        <div className="fall-alert-modal__actions">
          <button type="button" className="primary fall-alert-modal__button" onClick={onGoToEvents}>
            {t('fallAlert.goToEvents')}
          </button>
        </div>
      </div>
    </div>
  );
}
