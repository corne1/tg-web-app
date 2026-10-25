import { Link } from "react-router-dom";
import type { AppUser } from "../api";
import { isOnboardingDone } from "../lib/profileStorage";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";

type Props = {
  user: AppUser;
};

export function RoleHubScreen({ user }: Props) {
  useBackButton(null);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const psychPath = isOnboardingDone() ? "/cabinet" : "/onboarding";

  return (
    <div className="screen home">
      <div className="home-hero">
        <p className="home-brand">Календарь</p>
        <h1 className="home-title">Запись к психологу</h1>
        <p className="home-lead">
          Привет, {user.first_name}. Выберите роль — один психолог на приложение.
        </p>
      </div>
      <nav className="home-nav" aria-label="Роли">
        <Link to={psychPath} className="home-link">
          <span className="home-link-title">Я психолог</span>
          <span className="home-link-desc">
            {isOnboardingDone() ? "Кабинет и расписание" : "Онбординг за 5 минут"}
          </span>
        </Link>
        <Link to="/client" className="home-link">
          <span className="home-link-title">Я клиент</span>
          <span className="home-link-desc">Выбрать слот и записаться</span>
        </Link>
        <Link to="/notifications" className="home-link">
          <span className="home-link-title">Уведомления</span>
          <span className="home-link-desc">Превью напоминаний</span>
        </Link>
      </nav>
    </div>
  );
}
