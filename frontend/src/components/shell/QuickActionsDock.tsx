import { LanguageSwitcher } from '../LanguageSwitcher';

type QuickActionsDockProps = {
  open: boolean;
  onToggle: () => void;
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
  userDisplayName: string;
  userRoleLabel: string;
  actionLabel: string;
  onAction: () => void;
};

export function QuickActionsDock({
  open,
  onToggle,
  theme,
  onThemeToggle,
  userDisplayName,
  userRoleLabel,
  actionLabel,
  onAction
}: QuickActionsDockProps) {
  const panelId = 'ambient-actions-panel';

  return (
    <div className={`actions-drawer ambient-actions${open ? ' ambient-actions--open' : ''}`} aria-label="Quick actions">
      <button
        type="button"
        className="actions-toggle ambient-actions__toggle"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Hide controls' : 'Show controls'}
        title={open ? 'Hide controls' : 'Show controls'}
      >
        <span className="ambient-actions__icon" aria-hidden>
          {open ? 'x' : '+'}
        </span>
      </button>

      <div
        id={panelId}
        className={`actions-panel ambient-actions__panel${open ? ' actions-panel--open' : ''}`}
        aria-hidden={!open}
        hidden={!open}
      >
        <div className="actions ambient-actions__content">
          <LanguageSwitcher openUpward />
          <button type="button" className="theme-toggle ambient-actions__theme" onClick={onThemeToggle}>
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>
          <div className="auth-menu ambient-actions__account" aria-live="polite">
            <div className="auth-menu__details">
              <span className="auth-menu__name">{userDisplayName}</span>
              <span className="auth-menu__role">{userRoleLabel}</span>
            </div>
            <button type="button" className="auth-menu__button" onClick={onAction}>
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
