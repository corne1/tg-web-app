import { NavLink } from "react-router-dom";

function IconSchedule({ active }: { active: boolean }) {
  const stroke = active ? "#623DF5" : "#5E636E";
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
  const stroke = active ? "#623DF5" : "#5E636E";
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 11a3.25 3.25 0 1 0 0-6.5A3.25 3.25 0 0 0 8 11ZM16.5 11.5a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5Z"
        stroke={stroke}
        strokeWidth="1.5"
      />
      <path
        d="M3.5 18.25c.7-2.4 2.7-3.75 4.5-3.75s3.8 1.35 4.5 3.75M14 14.75c1.5 0 3.2.95 3.9 3"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconProfile({ active }: { active: boolean }) {
  const stroke = active ? "#623DF5" : "#5E636E";
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
