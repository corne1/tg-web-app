import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import {
  authenticate,
  clearStoredToken,
  fetchMe,
  getStoredToken,
  type AppUser,
} from "./api";
import { useTelegram } from "./hooks/useTelegram";
import { BookingConfirmScreen } from "./screens/BookingConfirmScreen";
import { EmptyStateScreen } from "./screens/EmptyStateScreen";
import { MyBookingsScreen } from "./screens/MyBookingsScreen";
import { NotificationsScreen } from "./screens/NotificationsScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { RoleHubScreen } from "./screens/RoleHubScreen";
import { ScheduleScreen } from "./screens/ScheduleScreen";
import { SlotSelectionScreen } from "./screens/SlotSelectionScreen";

export function App() {
  const { initData, user: tgUser } = useTelegram();
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

  if (loading) {
    return (
      <div className="app-frame">
        <main className="screen">
          <p className="screen-subtitle">Подключение…</p>
        </main>
      </div>
    );
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
        <Routes>
          <Route path="/" element={<RoleHubScreen user={user} />} />
          <Route path="/onboarding" element={<OnboardingScreen />} />
          <Route path="/cabinet" element={<ScheduleScreen />} />
          <Route path="/cabinet/empty" element={<EmptyStateScreen />} />
          <Route path="/client" element={<SlotSelectionScreen />} />
          <Route path="/client/confirm" element={<BookingConfirmScreen />} />
          <Route path="/client/bookings" element={<MyBookingsScreen />} />
          <Route path="/notifications" element={<NotificationsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
