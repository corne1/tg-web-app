import { Link } from "react-router-dom";
import type { AppUser } from "../api";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";

type Props = {
  user: AppUser;
  hasProfile: boolean;
};

export function RoleHubScreen({ user, hasProfile }: Props) {
  useBackButton(null);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const psychPath = hasProfile ? "/cabinet" : "/onboarding";

  return (
    <div className="screen home">
      <div className="home-hero">
        <p className="home-brand">Календарь</p>
        <h1 className="home-title">Запись к психологу</h1>
        <p className="home-lead">
          Привет, {user.first_name}. Психолог делится ссылкой — клиент записывается.
        </p>
      </div>
      <nav className="home-nav" aria-label="Роли">
        <Link to={psychPath} className="home-link">
          <span className="home-link-title">Я психолог</span>
          <span className="home-link-desc">
            {hasProfile ? "Кабинет и расписание" : "Онбординг за 5 минут"}
          </span>
        </Link>
        <Link to="/client/bookings" className="home-link">
          <span className="home-link-title">Я клиент</span>
          <span className="home-link-desc">Мои записи и новая запись по ссылке</span>
        </Link>
        <Link to="/notifications" className="home-link">
          <span className="home-link-title">Уведомления</span>
          <span className="home-link-desc">Как выглядят сообщения бота</span>
        </Link>
      </nav>
    </div>
  );
}
