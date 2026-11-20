import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import {
  authenticate,
  clearStoredToken,
  fetchMe,
  getStoredToken,
  type AppUser,
} from "./api";
import { AppRoutes } from "./app/AppRoutes";
import { BootSplash } from "./components/BootSplash";
import { PageTransition } from "./components/PageTransition";
import { useTelegram } from "./hooks/useTelegram";
import { cacheProfile } from "./lib/profileStorage";
import { loadServiceTypes } from "./lib/serviceTypesCatalog";
import { syncDraftFromServer } from "./lib/syncDraftFromServer";
import type { MasterProfile } from "./types";

export function App() {
  const { initData, user: tgUser, startParam } = useTelegram();
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<MasterProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    function applyMe(me: {
      user: AppUser;
      profile: MasterProfile | null;
      services: Parameters<typeof syncDraftFromServer>[1];
    }) {
      setUser(me.user);
      setProfile(me.profile);
      cacheProfile(me.profile);
      syncDraftFromServer(me.profile, me.services);
    }

    async function boot() {
      setLoading(true);
      setError(null);
      void loadServiceTypes().catch(() => undefined);
      try {
        if (initData) {
          const { user: authed } = await authenticate(initData);
          const me = await fetchMe();
          if (!cancelled) {
            setUser(me.user ?? authed);
            setProfile(me.profile);
            cacheProfile(me.profile);
            syncDraftFromServer(me.profile, me.services);
          }
          return;
        }

        if (getStoredToken()) {
          const me = await fetchMe();
          if (!cancelled) applyMe(me);
          return;
        }

        if (!cancelled) {
          setUser(null);
          setError(
            "Open this Mini App from Telegram. Browser preview has no initData.",
          );
        }
      } catch (err) {
        clearStoredToken();
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Auth failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void boot();
    return () => {
      cancelled = true;
    };
  }, [initData]);

  if (loading) {
    return <BootSplash framed label="Подключение…" />;
  }

  if (error && !user) {
    return (
      <div className="app-frame">
        <main className="screen">
          <h1 className="screen-title">Календарь</h1>
          <p className="error">{error}</p>
          {tgUser && (
            <p className="screen-subtitle">
              Client user: {tgUser.first_name} (not verified by server)
            </p>
          )}
        </main>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <BrowserRouter>
      <div className="app-frame">
        <PageTransition>
          <AppRoutes startParam={startParam} profile={profile} />
        </PageTransition>
      </div>
    </BrowserRouter>
  );
}
