import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMe } from "../api";
import { MasterTabBar } from "../components/master/MasterTabBar";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { cacheProfile } from "../lib/profileStorage";
import type { MasterProfile } from "../types";
import { Button } from "../ui";

function displayLink(url: string): string {
  return url.replace(/^https?:\/\//i, "");
}

export function CabinetProfileScreen() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<MasterProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMe()
      .then((me) => {
        if (cancelled || !me.profile) return;
        cacheProfile(me.profile);
        setProfile(me.profile);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const goHome = useCallback(() => navigate("/"), [navigate]);
  useBackButton(goHome);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <div className="master-setup ms-cabinet">
      <header className="ms-cab-header">
        <h1 className="ms-cab-title">Профиль</h1>
      </header>
      <div className="ms-body ms-cab-body">
        <section className="ms-success-card" aria-label="Профиль мастера">
          <h2 className="ms-success-card-title">
            {profile?.name?.trim() || "Мастер"}
          </h2>
          {profile?.city ? (
            <p className="ms-cab-empty-text">{profile.city}</p>
          ) : null}
          {profile?.bookingLink ? (
            <div className="ms-success-url">
              {displayLink(profile.bookingLink)}
            </div>
          ) : null}
          <Button variant="secondary" onClick={() => navigate("/onboarding")}>
            Редактировать профиль
          </Button>
          <Button variant="primary" onClick={() => navigate("/cabinet/empty")}>
            Поделиться ссылкой
          </Button>
        </section>
      </div>
      <MasterTabBar />
    </div>
  );
}
