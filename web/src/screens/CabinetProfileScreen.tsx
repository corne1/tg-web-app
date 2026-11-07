import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMe } from "../api";
import avatarDemo from "../assets/cabinet/profile/avatar-demo.jpg";
import bellIcon from "../assets/cabinet/profile/bell.svg";
import calendarClockIcon from "../assets/cabinet/profile/calendar-clock.svg";
import coverDemo from "../assets/cabinet/profile/cover.jpg";
import infoIcon from "../assets/cabinet/profile/info.svg";
import mapPinIcon from "../assets/cabinet/profile/map-pin.svg";
import scissorsIcon from "../assets/cabinet/profile/scissors.svg";
import settingsIcon from "../assets/cabinet/profile/settings.svg";
import { MasterTabBar } from "../components/master/MasterTabBar";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import {
  loadMasterAvatarDataUrl,
  saveMasterAvatarDataUrl,
} from "../lib/masterAvatar";
import { specialtyMeta } from "../lib/masterDraft";
import { cacheProfile } from "../lib/profileStorage";
import type { MasterProfile } from "../types";
import { ChevronRightIcon } from "../ui";

type MenuItem = {
  id: string;
  label: string;
  icon: string;
  to: string;
};

const MENU_PRIMARY: MenuItem[] = [
  {
    id: "services",
    label: "Мои услуги",
    icon: scissorsIcon,
    to: "/cabinet/profile/services",
  },
  {
    id: "hours",
    label: "Рабочее время",
    icon: calendarClockIcon,
    to: "/cabinet/profile/hours",
  },
  {
    id: "place",
    label: "Место приёма",
    icon: mapPinIcon,
    to: "/cabinet/profile/place",
  },
];

const MENU_SECONDARY: MenuItem[] = [
  {
    id: "notifications",
    label: "Уведомления",
    icon: bellIcon,
    to: "/notifications",
  },
  {
    id: "settings",
    label: "Настройки",
    icon: settingsIcon,
    to: "/cabinet/profile/settings",
  },
  {
    id: "about",
    label: "О приложении",
    icon: infoIcon,
    to: "/cabinet/profile/about",
  },
];

function MenuGroup({ items }: { items: MenuItem[] }) {
  const navigate = useNavigate();
  return (
    <div className="ms-prof-menu">
      {items.map((item, index) => (
        <div key={item.id}>
          {index > 0 ? <hr className="ms-prof-menu-rule" /> : null}
          <button
            type="button"
            className="ms-prof-menu-item"
            onClick={() => navigate(item.to)}
          >
            <img src={item.icon} width={20} height={20} alt="" aria-hidden />
            <span className="ms-prof-menu-label">{item.label}</span>
            <ChevronRightIcon />
          </button>
        </div>
      ))}
    </div>
  );
}

/** Figma 21412:90105 — cabinet Profile tab. */
export function CabinetProfileScreen() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MasterProfile | null>(null);
  const [avatarSrc, setAvatarSrc] = useState(
    () => loadMasterAvatarDataUrl() ?? avatarDemo,
  );

  useEffect(() => {
    let cancelled = false;
    void fetchMe()
      .then((me) => {
        if (cancelled || !me.profile) return;
        cacheProfile(me.profile);
        setProfile(me.profile);
        const remote = me.profile.avatarUrl;
        const local = loadMasterAvatarDataUrl();
        if (remote) {
          saveMasterAvatarDataUrl(remote);
          setAvatarSrc(remote);
        } else if (local) {
          setAvatarSrc(local);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const title = useMemo(() => {
    const meta = specialtyMeta(
      (profile?.specialty as Parameters<typeof specialtyMeta>[0]) ?? null,
    );
    return meta?.title ?? "мастер";
  }, [profile?.specialty]);

  const published =
    profile?.status === "active" || Boolean(profile?.onboardingComplete);

  const goHome = useCallback(() => navigate("/"), [navigate]);
  useBackButton(goHome);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <div className="master-setup ms-cabinet ms-prof">
      <div className="ms-body ms-cab-body ms-prof-body">
        <section className="ms-prof-hero">
          <div className="ms-prof-cover" aria-hidden>
            <img src={coverDemo} alt="" />
          </div>
          <div className="ms-prof-identity">
            <div className="ms-prof-avatar-wrap">
              <img
                className="ms-prof-avatar"
                src={avatarSrc}
                width={100}
                height={100}
                alt=""
              />
            </div>
            <div className="ms-prof-identity-text">
              <h1 className="ms-prof-name">
                {profile?.name?.trim() || "Мастер"}
              </h1>
              <p className="ms-prof-role">{title}</p>
            </div>
          </div>
        </section>

        <div className="ms-prof-content">
          <section className="ms-prof-public-card">
            <div className="ms-prof-public-head">
              <div className="ms-prof-public-copy">
                <div className="ms-prof-public-title-row">
                  <h2 className="ms-prof-public-title">Публичный профиль</h2>
                  {published ? (
                    <span className="ms-prof-status">
                      <span className="ms-prof-status-dot" aria-hidden />
                      Опубликован
                    </span>
                  ) : (
                    <span className="ms-prof-status is-draft">Черновик</span>
                  )}
                </div>
                <p className="ms-prof-public-lead">Так вас видят клиенты</p>
              </div>
            </div>
            <button
              type="button"
              className="ms-prof-manage"
              onClick={() => navigate("/cabinet/profile/public")}
            >
              <span>Управление</span>
              <ChevronRightIcon />
            </button>
          </section>

          <MenuGroup items={MENU_PRIMARY} />
          <MenuGroup items={MENU_SECONDARY} />
        </div>
      </div>

      <MasterTabBar />
    </div>
  );
}
