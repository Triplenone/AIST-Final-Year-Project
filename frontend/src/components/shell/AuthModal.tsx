import type { FormEvent, RefObject } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

type AuthModalProps = {
  mode: 'signin' | 'signup';
  error: string | null;
  info: string | null;
  firstFieldRef: RefObject<HTMLInputElement>;
  onClose: () => void;
  onSwitchMode: (mode: 'signin' | 'signup') => void;
  onSignInSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSignUpSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AuthModal({
  mode,
  error,
  info,
  firstFieldRef,
  onClose,
  onSwitchMode,
  onSignInSubmit,
  onSignUpSubmit
}: AuthModalProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      className="auth-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="auth-modal__backdrop" onClick={onClose} role="presentation" />
      <motion.div
        className="auth-modal__dialog"
        role="document"
        initial={{ opacity: 0, y: 26, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <button type="button" className="auth-modal__close" onClick={onClose} aria-label={t('common.close')}>
          ×
        </button>
        <h2 id="auth-modal-title">{t(mode === 'signin' ? 'auth.signInTitle' : 'auth.signUpTitle')}</h2>

        {error ? (
          <div className="auth-modal__alert auth-modal__alert--error" role="alert">
            {error}
          </div>
        ) : null}

        {info ? (
          <div className="auth-modal__alert auth-modal__alert--info" role="status">
            {info}
          </div>
        ) : null}

        <form className="auth-modal__form" onSubmit={mode === 'signin' ? onSignInSubmit : onSignUpSubmit} noValidate>
          <label>
            <span>{t('auth.username')}</span>
            <input ref={firstFieldRef} name="username" type="text" autoComplete="username" />
          </label>
          <label>
            <span>{t('auth.password')}</span>
            <input
              name="password"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </label>

          {mode === 'signup' ? (
            <label>
              <span>{t('auth.role')}</span>
              <select name="role" defaultValue="guest">
                <option value="guest">{t('auth.roles.guest')}</option>
                <option value="caregiver">{t('auth.roles.caregiver')}</option>
              </select>
            </label>
          ) : null}

          <button type="submit" className="primary auth-modal__submit">
            {t(mode === 'signin' ? 'auth.continue' : 'auth.create')}
          </button>
        </form>

        <p className="auth-modal__switch">
          {mode === 'signin' ? (
            <>
              {t('auth.noAccount')}{' '}
              <button type="button" className="auth-modal__link" onClick={() => onSwitchMode('signup')}>
                {t('auth.toSignUp')}
              </button>
            </>
          ) : (
            <>
              {t('auth.haveAccount')}{' '}
              <button type="button" className="auth-modal__link" onClick={() => onSwitchMode('signin')}>
                {t('auth.toSignIn')}
              </button>
            </>
          )}
        </p>
      </motion.div>
    </motion.div>
  );
}
