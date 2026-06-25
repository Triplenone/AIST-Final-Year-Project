import { NavLink } from 'react-router-dom';

import smartCareMarkUrl from '../../assets/brand/smartcare-mark-exact-full.svg';

type AppHeaderNavItem = {
  key: string;
  to: string;
  label: string;
};

type AppHeaderProps = {
  activeKey: string;
  brandTitle: string;
  brandSubtitle: string;
  navItems: AppHeaderNavItem[];
};

export function AppHeader({ activeKey, brandTitle, brandSubtitle, navItems }: AppHeaderProps) {
  const hasDenseNav = activeKey !== 'position' && navItems.length >= 8;

  return (
    <header
      className={`ambient-header ambient-header--route-${activeKey}${
        hasDenseNav ? ' ambient-header--dense-nav' : ''
      }`}
    >
      <div className="ambient-header__inner">
        <div className="ambient-header__brand">
          <div className="ambient-header__brand-lockup">
            <span
              className="ambient-header__brand-mark-wrap"
              aria-hidden="true"
            >
              <img
                className="ambient-header__brand-mark"
                src={smartCareMarkUrl}
                alt=""
              />
            </span>
            <div className="ambient-header__copy ambient-header__brand-copy">
              <span className="ambient-header__mark">{brandTitle}</span>
              <p className="ambient-header__tagline">{brandSubtitle}</p>
            </div>
          </div>
          <div className="ambient-header__context">
            <span className="ambient-header__status">Live Care Workspace</span>
          </div>
        </div>

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
      </div>
    </header>
  );
}
