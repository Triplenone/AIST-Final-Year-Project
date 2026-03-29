import { NavLink } from 'react-router-dom';

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
  return (
    <header className={`ambient-header${isFlyCarePage ? ' ambient-header--flycare' : ''}`}>
      <div className="ambient-header__inner">
        <div className="ambient-header__brand">
          <div className="ambient-header__brand-lockup">
            <span className="ambient-header__brand-mark-wrap" aria-hidden="true">
              <img className="ambient-header__brand-mark" src={smartCareMarkUrl} alt="" />
            </span>
            <div className="ambient-header__copy ambient-header__brand-copy">
              <span className="ambient-header__mark">{brandTitle}</span>
              <p className="ambient-header__tagline">{brandSubtitle}</p>
            </div>
          </div>
          {!isFlyCarePage ? <span className="ambient-header__status">Live Care Workspace</span> : null}
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
