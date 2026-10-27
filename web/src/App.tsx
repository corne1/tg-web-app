import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import {
  authenticate,
  clearStoredToken,
  ensureMasterProfile,
  fetchMe,
  getStoredToken,
  type AppUser,
} from "./api";
import { useTelegram } from "./hooks/useTelegram";
import {
  cacheProfile,
  isOnboardingDone,
  masterResumePath,
} from "./lib/profileStorage";
import {
  saveMasterDraft,
  type MasterSpecialty,
} from "./lib/masterDraft";
import { parseEntryContext } from "./lib/startParam";
import type { MasterServiceDto, PsychologistProfile } from "./types";
import { BookingConfirmScreen } from "./screens/BookingConfirmScreen";
import { EmptyStateScreen } from "./screens/EmptyStateScreen";
import { MyBookingsScreen } from "./screens/MyBookingsScreen";
import { NotificationsScreen } from "./screens/NotificationsScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { ScheduleScreen } from "./screens/ScheduleScreen";
import { HoursPlaceholderScreen } from "./screens/HoursPlaceholderScreen";
import { ServiceFormScreen } from "./screens/ServiceFormScreen";
import { ServicesStepScreen } from "./screens/ServicesStepScreen";
import { SlotSelectionScreen } from "./screens/SlotSelectionScreen";

function syncDraftFromServer(
  profile: PsychologistProfile | null,
  services: MasterServiceDto[],
) {
  if (!profile) return;
  saveMasterDraft({
    name: profile.name,
    specialty: (profile.specialty as MasterSpecialty | null) ?? null,
    city: profile.city ?? "Москва",
    services: services.map((s) => ({
      id: s.id,
      title: s.title,
      durationMin: s.durationMin,
      price: s.price,
      priceMode: s.priceMode,
      breakAfterMin: s.breakAfterMin,
      description: s.description,
    })),
  });
}

function HomeRedirect({
  startParam,
  profile,
}: {
  startParam: string | undefined;
  profile: PsychologistProfile | null;
}) {
  const navigate = useNavigate();
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function route() {
      const ctx = parseEntryContext(startParam);

      if (ctx.mode === "client") {
        if ("masterId" in ctx) {
          navigate(`/client/${ctx.masterId}`, { replace: true });
          return;
        }
        navigate(`/client/${encodeURIComponent(ctx.slug)}`, { replace: true });
        return;
      }

      // Master context (explicit cabinet) or default open from menu.
      try {
        const ensured = await ensureMasterProfile();
        if (cancelled) return;
        cacheProfile(ensured.profile);
        syncDraftFromServer(ensured.profile, ensured.services);

        if (isOnboardingDone(ensured.profile)) {
          navigate("/cabinet", { replace: true });
          return;
        }
        navigate(masterResumePath(ensured.profile), { replace: true });
      } catch (err) {
        if (cancelled) return;
        // Fallback without ensure (e.g. offline draft).
        if (isOnboardingDone(profile)) {
          navigate("/cabinet", { replace: true });
          return;
        }
        if (profile?.name || profile?.specialty) {
          navigate(masterResumePath(profile), { replace: true });
          return;
        }
        setBootError(err instanceof Error ? err.message : "Не удалось открыть кабинет");
        navigate("/onboarding", { replace: true });
      }
    }

    void route();
    return () => {
      cancelled = true;
    };
  }, [navigate, profile, startParam]);

  return (
    <main className="screen">
      <p className="screen-subtitle">{bootError ?? "Открываем…"}</p>
    </main>
  );
}

export function App() {
  const { initData, user: tgUser, startParam } = useTelegram();
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<PsychologistProfile | null>(null);
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
          if (!cancelled) {
            setUser(me.user);
            setProfile(me.profile);
            cacheProfile(me.profile);
            syncDraftFromServer(me.profile, me.services);
          }
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
          <Route
            path="/"
            element={<HomeRedirect startParam={startParam} profile={profile} />}
          />
          <Route path="/onboarding" element={<OnboardingScreen />} />
          <Route path="/onboarding/services" element={<ServicesStepScreen />} />
          <Route
            path="/onboarding/services/new"
            element={<ServiceFormScreen mode="new" />}
          />
          <Route
            path="/onboarding/services/:serviceId/edit"
            element={<ServiceFormScreen mode="edit" />}
          />
          <Route
            path="/onboarding/services/:serviceId/duplicate"
            element={<ServiceFormScreen mode="duplicate" />}
          />
          <Route path="/onboarding/hours" element={<HoursPlaceholderScreen />} />
          <Route path="/cabinet" element={<ScheduleScreen />} />
          <Route path="/cabinet/empty" element={<EmptyStateScreen />} />
          <Route path="/client/confirm" element={<BookingConfirmScreen />} />
          <Route path="/client/bookings" element={<MyBookingsScreen />} />
          <Route path="/client" element={<SlotSelectionScreen />} />
          <Route path="/client/:psychologistId" element={<SlotSelectionScreen />} />
          <Route path="/notifications" element={<NotificationsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
