import { NavLink } from 'react-router-dom';

import flyCareBadgeUrl from '../../assets/brand/flycare-badge-exact-crop.svg';
import smartCareMarkUrl from '../../assets/brand/smartcare-mark-exact-full.svg';

type AppHeaderNavItem = {
  key: string;
  to: string;
  label: string;
};

type AppHeaderProps = {
  isFlyCarePage: boolean;
  activeKey: string;
  brandTitle: string;
  brandSubtitle: string;
  navItems: AppHeaderNavItem[];
};

export function AppHeader({ isFlyCarePage, activeKey, brandTitle, brandSubtitle, navItems }: AppHeaderProps) {
  const brandMarkUrl = isFlyCarePage ? flyCareBadgeUrl : smartCareMarkUrl;
  const hasDenseNav = !isFlyCarePage && activeKey !== 'position' && navItems.length >= 8;

  return (
    <header
      className={`ambient-header ambient-header--route-${activeKey}${isFlyCarePage ? ' ambient-header--flycare' : ''}${
        hasDenseNav ? ' ambient-header--dense-nav' : ''
      }`}
    >
      <div className="ambient-header__inner">
        <div className="ambient-header__brand">
          <div className="ambient-header__brand-lockup">
            <span
              className={`ambient-header__brand-mark-wrap${isFlyCarePage ? ' ambient-header__brand-mark-wrap--flycare' : ''}`}
              aria-hidden="true"
            >
              <img
                className={`ambient-header__brand-mark${isFlyCarePage ? ' ambient-header__brand-mark--flycare' : ''}`}
                src={brandMarkUrl}
                alt=""
              />
            </span>
            <div className="ambient-header__copy ambient-header__brand-copy">
              <span className="ambient-header__mark">{brandTitle}</span>
              <p className="ambient-header__tagline">{brandSubtitle}</p>
            </div>
          </div>
          {!isFlyCarePage ? (
            <div className="ambient-header__context">
              <span className="ambient-header__status">Live Care Workspace</span>
            </div>
          ) : null}
        </div>

        {!isFlyCarePage ? (
          <nav className="ambient-header__nav" aria-label="Primary navigation">
            {navItems.map((item) => (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.to === '/'}
                className={activeKey === item.key ? 'is-active' : undefined}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        ) : null}
      </div>
    </header>
  );
}
