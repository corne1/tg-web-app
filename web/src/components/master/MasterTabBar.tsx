import { NavLink } from "react-router-dom";

function IconSchedule({ active }: { active: boolean }) {
  const stroke = active ? "#623DF5" : "#26282C";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect
        x="3.75"
        y="5.75"
        width="16.5"
        height="14.5"
        rx="2.25"
        stroke={stroke}
        strokeWidth="1.5"
      />
      <path
        d="M3.75 9.5h16.5M8 3.75v3M16 3.75v3"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconClients({ active }: { active: boolean }) {
  const stroke = active ? "#623DF5" : "#26282C";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19.5c.85-2.7 2.85-4.25 5-4.25s4.15 1.55 5 4.25"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="9" cy="8.25" r="3" stroke={stroke} strokeWidth="1.5" />
      <path
        d="M15.5 11.75a2.5 2.5 0 1 0 0-5"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16.5 15.25c1.35.15 2.85 1.1 3.5 3.25"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconProfile({ active }: { active: boolean }) {
  const stroke = active ? "#623DF5" : "#26282C";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="9" r="3.25" stroke={stroke} strokeWidth="1.5" />
      <path
        d="M5.5 19c1.1-2.7 3.4-4 6.5-4s5.4 1.3 6.5 4"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const TABS = [
  { to: "/cabinet", label: "Расписание", Icon: IconSchedule, end: true },
  { to: "/cabinet/clients", label: "Клиенты", Icon: IconClients, end: false },
  { to: "/cabinet/profile", label: "Профиль", Icon: IconProfile, end: false },
] as const;

export function MasterTabBar() {
  return (
    <nav className="ms-tabbar" aria-label="Кабинет">
      {TABS.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `ms-tabbar-item${isActive ? " is-active" : ""}`
          }
        >
          {({ isActive }) => (
            <>
              <span className="ms-tabbar-icon">
                <Icon active={isActive} />
              </span>
              <span className="ms-tabbar-label">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
