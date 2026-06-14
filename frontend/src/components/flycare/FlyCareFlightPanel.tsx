import { useTranslation } from 'react-i18next';

import type { ResolvedFlightInfo } from '../../utils/flycare-flight';

type FlyCareFlightPanelProps = {
  flightInfo: ResolvedFlightInfo | null;
  pendingFlightUpdate: ResolvedFlightInfo | null;
  showFlightUpdateDrawer: boolean;
  onConfirmFlightUpdate: () => void;
  onCloseFlightUpdateDrawer: () => void;
};

function formatVal(value: unknown): string {
  return value != null && value !== '' ? String(value) : '—';
}

function formatStatus(value: string | undefined): string {
  if (!value) return formatVal(value);
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDelay(minutes: number | undefined, reason: string | undefined): string {
  if (minutes == null) return formatVal(undefined);
  const base = `${minutes} min`;
  return reason ? `${base} - ${reason}` : base;
}

export function FlyCareFlightPanel({
  flightInfo,
  pendingFlightUpdate,
  showFlightUpdateDrawer,
  onConfirmFlightUpdate,
  onCloseFlightUpdateDrawer
}: FlyCareFlightPanelProps) {
  const { t } = useTranslation();

  return (
    <>
      <section className="position-command-center__surface flycare-flight-panel" aria-live="polite">
        <header className="flycare-flight-panel__header">
          <div>
            <p className="position-command-center__eyebrow">
              {t('flyCare.flightEyebrow', { defaultValue: 'Flight' })}
            </p>
            <h2>{t('flyCare.flightTitle', { defaultValue: 'Flight information' })}</h2>
          </div>
        </header>
        <dl className="flycare-flight-panel__grid">
          <div>
            <dt>{t('flyCare.flightPassengerName', { defaultValue: 'Passenger' })}</dt>
            <dd>{formatVal(flightInfo?.passengerName)}</dd>
          </div>
          <div>
            <dt>{t('flyCare.flightNumber', { defaultValue: 'Flight number' })}</dt>
            <dd>{formatVal(flightInfo?.flightNumber)}</dd>
          </div>
          <div>
            <dt>{t('flyCare.flightGate', { defaultValue: 'Gate' })}</dt>
            <dd>{formatVal(flightInfo?.gate)}</dd>
          </div>
          <div>
            <dt>{t('flyCare.flightTime', { defaultValue: 'Flight time' })}</dt>
            <dd>{formatVal(flightInfo?.flightTime)}</dd>
          </div>
          <div>
            <dt>{t('flyCare.flightEstimatedDeparture', { defaultValue: 'Estimated departure' })}</dt>
            <dd>{formatVal(flightInfo?.estimatedDeparture)}</dd>
          </div>
          <div>
            <dt>{t('flyCare.flightBoardingTime', { defaultValue: 'Boarding time' })}</dt>
            <dd>{formatVal(flightInfo?.boardingTime)}</dd>
          </div>
          <div>
            <dt>{t('flyCare.flightStatus', { defaultValue: 'Flight status' })}</dt>
            <dd>{formatStatus(flightInfo?.flightStatus)}</dd>
          </div>
          <div>
            <dt>{t('flyCare.flightDelay', { defaultValue: 'Delay' })}</dt>
            <dd>{formatDelay(flightInfo?.delayMinutes, flightInfo?.delayReason)}</dd>
          </div>
          <div>
            <dt>{t('flyCare.flightAirline', { defaultValue: 'Airline' })}</dt>
            <dd>{formatVal(flightInfo?.airline)}</dd>
          </div>
          <div>
            <dt>{t('flyCare.flightDeparture', { defaultValue: 'Departure' })}</dt>
            <dd>{formatVal(flightInfo?.departureAirport)}</dd>
          </div>
          <div>
            <dt>{t('flyCare.flightArrival', { defaultValue: 'Arrival' })}</dt>
            <dd>{formatVal(flightInfo?.arrivalAirport)}</dd>
          </div>
          <div>
            <dt>{t('flyCare.flightSeat', { defaultValue: 'Seat' })}</dt>
            <dd>{formatVal(flightInfo?.seatNumber)}</dd>
          </div>
          <div>
            <dt>{t('flyCare.flightTerminal', { defaultValue: 'Terminal' })}</dt>
            <dd>{formatVal(flightInfo?.terminal)}</dd>
          </div>
          <div>
            <dt>{t('flyCare.flightCheckinCounter', { defaultValue: 'Check-in counter' })}</dt>
            <dd>{formatVal(flightInfo?.checkinCounter)}</dd>
          </div>
        </dl>
      </section>

      {showFlightUpdateDrawer ? (
        <div
          className="flycare-page__flight-drawer-backdrop"
          onClick={onCloseFlightUpdateDrawer}
          aria-hidden
        />
      ) : null}
      <div
        className={`flycare-page__flight-drawer${showFlightUpdateDrawer ? ' flycare-page__flight-drawer--open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="flycare-flight-drawer-title"
      >
        <div className="flycare-page__flight-drawer-inner">
          <h3 id="flycare-flight-drawer-title" className="flycare-page__flight-drawer-title">
            {t('flyCare.flightUpdateTitle', { defaultValue: 'Flight update' })}
          </h3>
          {pendingFlightUpdate ? (
            <div className="flycare-page__flight-drawer-fields">
              <p>
                <strong>{t('flyCare.flightPassengerName', { defaultValue: 'Passenger' })}</strong>:{' '}
                {formatVal(pendingFlightUpdate.passengerName)}
              </p>
              <p>
                <strong>{t('flyCare.flightNumber', { defaultValue: 'Flight number' })}</strong>:{' '}
                {formatVal(pendingFlightUpdate.flightNumber)}
              </p>
              <p>
                <strong>{t('flyCare.flightGate', { defaultValue: 'Gate' })}</strong>:{' '}
                {formatVal(pendingFlightUpdate.gate)}
              </p>
              <p>
                <strong>{t('flyCare.flightTime', { defaultValue: 'Flight time' })}</strong>:{' '}
                {formatVal(pendingFlightUpdate.flightTime)}
              </p>
              <p>
                <strong>
                  {t('flyCare.flightEstimatedDeparture', { defaultValue: 'Estimated departure' })}
                </strong>
                : {formatVal(pendingFlightUpdate.estimatedDeparture)}
              </p>
              <p>
                <strong>{t('flyCare.flightBoardingTime', { defaultValue: 'Boarding time' })}</strong>:{' '}
                {formatVal(pendingFlightUpdate.boardingTime)}
              </p>
              <p>
                <strong>{t('flyCare.flightStatus', { defaultValue: 'Flight status' })}</strong>:{' '}
                {formatStatus(pendingFlightUpdate.flightStatus)}
              </p>
              <p>
                <strong>{t('flyCare.flightDelay', { defaultValue: 'Delay' })}</strong>:{' '}
                {formatDelay(pendingFlightUpdate.delayMinutes, pendingFlightUpdate.delayReason)}
              </p>
              <p>
                <strong>{t('flyCare.flightAirline', { defaultValue: 'Airline' })}</strong>:{' '}
                {formatVal(pendingFlightUpdate.airline)}
              </p>
              <p>
                <strong>{t('flyCare.flightDeparture', { defaultValue: 'Departure' })}</strong>:{' '}
                {formatVal(pendingFlightUpdate.departureAirport)}
              </p>
              <p>
                <strong>{t('flyCare.flightArrival', { defaultValue: 'Arrival' })}</strong>:{' '}
                {formatVal(pendingFlightUpdate.arrivalAirport)}
              </p>
              <p>
                <strong>{t('flyCare.flightSeat', { defaultValue: 'Seat' })}</strong>:{' '}
                {formatVal(pendingFlightUpdate.seatNumber)}
              </p>
              <p>
                <strong>{t('flyCare.flightTerminal', { defaultValue: 'Terminal' })}</strong>:{' '}
                {formatVal(pendingFlightUpdate.terminal)}
              </p>
              <p>
                <strong>{t('flyCare.flightCheckinCounter', { defaultValue: 'Check-in counter' })}</strong>
                : {formatVal(pendingFlightUpdate.checkinCounter)}
              </p>
            </div>
          ) : null}
          <div className="flycare-page__flight-drawer-actions">
            <button type="button" className="primary" onClick={onConfirmFlightUpdate}>
              {t('flyCare.flightUpdateConfirm', { defaultValue: 'Confirm update' })}
            </button>
            <button type="button" className="secondary" onClick={onCloseFlightUpdateDrawer}>
              {t('common.close', { defaultValue: 'Close' })}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
