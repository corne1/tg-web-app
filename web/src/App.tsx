import { useCallback, useEffect, useState } from "react";
import { authenticate, clearStoredToken, fetchMe, getStoredToken, type AppUser } from "./api";
import { useBackButton } from "./hooks/useBackButton";
import { useMainButton } from "./hooks/useMainButton";
import { useTelegram } from "./hooks/useTelegram";
import { Profile } from "./components/Profile";

type View = "home" | "profile";

export function App() {
  const { webApp, initData, isTelegram, user: tgUser } = useTelegram();
  const [view, setView] = useState<View>("home");
  const [user, setUser] = useState<AppUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      setLoading(true);
      setError(null);
      try {
        if (initData) {
          const { user: authed } = await authenticate(initData);
          if (!cancelled) setUser(authed);
          return;
        }

        if (getStoredToken()) {
          const me = await fetchMe();
          if (!cancelled) setUser(me);
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

  const openProfile = useCallback(() => {
    webApp?.HapticFeedback?.impactOccurred("light");
    setView("profile");
  }, [webApp]);

  const goHome = useCallback(() => {
    setView("home");
  }, []);

  useMainButton({
    text: view === "home" ? "View profile" : "Done",
    visible: Boolean(user) && !loading,
    onClick: view === "home" ? openProfile : goHome,
  });

  useBackButton(view === "profile" ? goHome : null);

  if (loading) {
    return (
      <main className="screen">
        <p className="muted">Connecting…</p>
      </main>
    );
  }

  if (error && !user) {
    return (
      <main className="screen">
        <h1>Telegram Mini App</h1>
        <p className="error">{error}</p>
        {tgUser && (
          <p className="muted">
            Client user: {tgUser.first_name} (not verified by server)
          </p>
        )}
      </main>
    );
  }

  if (view === "profile" && user) {
    return (
      <main className="screen">
        <Profile user={user} />
      </main>
    );
  }

  return (
    <main className="screen">
      <p className="eyebrow">{isTelegram ? "Mini App" : "Dev preview"}</p>
      <h1>Hello{user ? `, ${user.first_name}` : ""}</h1>
      <p className="lede">
        Authenticated via Telegram <code>initData</code>. Use the main button to
        open your profile.
      </p>
      {user && (
        <dl className="meta">
          <div>
            <dt>User ID</dt>
            <dd>{user.id}</dd>
          </div>
          {user.username && (
            <div>
              <dt>Username</dt>
              <dd>@{user.username}</dd>
            </div>
          )}
        </dl>
      )}
    </main>
  );
}
