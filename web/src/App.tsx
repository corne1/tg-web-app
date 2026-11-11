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
import { BootSplash } from "./components/BootSplash";
import { PageTransition } from "./components/PageTransition";
import { useTelegram } from "./hooks/useTelegram";
import {
  cacheProfile,
  isOnboardingDone,
  masterResumePath,
} from "./lib/profileStorage";
import {
  loadMasterDraft,
  normalizeWorkingHours,
  saveMasterDraft,
  type MasterSpecialty,
} from "./lib/masterDraft";
import { parseEntryContext } from "./lib/startParam";
import type { MasterProfile, MasterServiceDto } from "./types";
import { BookingDetailScreen } from "./screens/BookingDetailScreen";
import { ClientAddressScreen } from "./screens/client/ClientAddressScreen";
import { ClientBookingDetailScreen } from "./screens/client/ClientBookingDetailScreen";
import { ClientBookingTokenScreen } from "./screens/client/ClientBookingTokenScreen";
import { ClientConfirmScreen } from "./screens/client/ClientConfirmScreen";
import { ClientDateTimeScreen } from "./screens/client/ClientDateTimeScreen";
import { ClientPlaceScreen } from "./screens/client/ClientPlaceScreen";
import { ClientPublicProfileScreen } from "./screens/client/ClientPublicProfileScreen";
import { ClientServicesScreen } from "./screens/client/ClientServicesScreen";
import { ClientSuccessScreen } from "./screens/client/ClientSuccessScreen";
import { ClientYourDataScreen } from "./screens/client/ClientYourDataScreen";
import { CabinetProfileScreen } from "./screens/CabinetProfileScreen";
import { EditPublicPageScreen } from "./screens/EditPublicPageScreen";
import { ProfileStubScreen } from "./screens/ProfileStubScreen";
import { PublicProfileScreen } from "./screens/PublicProfileScreen";
import { ClientCardScreen } from "./screens/ClientCardScreen";
import { CreateClientNoteScreen } from "./screens/CreateClientNoteScreen";
import { EditClientNoteScreen } from "./screens/EditClientNoteScreen";
import { ClientsScreen } from "./screens/ClientsScreen";
import { EmptyStateScreen } from "./screens/EmptyStateScreen";
import { MyBookingsScreen } from "./screens/MyBookingsScreen";
import { NotificationsScreen } from "./screens/NotificationsScreen";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { OnboardingSuccessScreen } from "./screens/OnboardingSuccessScreen";
import { WelcomeMasterScreen } from "./screens/WelcomeMasterScreen";
import { ScheduleScreen } from "./screens/ScheduleScreen";
import { HoursSettingsScreen } from "./screens/HoursSettingsScreen";
import { HoursStepScreen } from "./screens/HoursStepScreen";
import { PlaceSettingsScreen } from "./screens/PlaceSettingsScreen";
import { ServicesSettingsScreen } from "./screens/ServicesSettingsScreen";
import { NewBookingClientScreen } from "./screens/NewBookingClientScreen";
import { NewBookingConfirmScreen } from "./screens/NewBookingConfirmScreen";
import { NewBookingPlaceScreen } from "./screens/NewBookingPlaceScreen";
import { NewBookingServiceScreen } from "./screens/NewBookingServiceScreen";
import { CreateClientScreen } from "./screens/CreateClientScreen";
import { NewBookingTimeScreen } from "./screens/NewBookingTimeScreen";
import { PlaceStepScreen } from "./screens/PlaceStepScreen";
import { ServiceFormScreen } from "./screens/ServiceFormScreen";
import { ServicesStepScreen } from "./screens/ServicesStepScreen";

function syncDraftFromServer(
  profile: MasterProfile | null,
  services: MasterServiceDto[],
) {
  if (!profile) return;
  const prev = loadMasterDraft();
  const place = profile.place;
  saveMasterDraft({
    ...prev,
    name: profile.name,
    specialty: (profile.specialty as MasterSpecialty | null) ?? null,
    city: profile.city ?? "Москва",
    hours: profile.workingHours
      ? normalizeWorkingHours(profile.workingHours)
      : prev.hours,
    dayBreakMin:
      profile.dayBreakMin !== undefined
        ? profile.dayBreakMin
        : prev.dayBreakMin,
    placeMode: place?.mode ?? prev.placeMode,
    studioPlace: place
      ? {
          city: place.studio.city,
          address: place.studio.address,
          comment: place.studio.comment,
          addressVisibility: place.studio.addressVisibility,
        }
      : prev.studioPlace,
    visitPlace: place
      ? {
          city: place.visit.city,
          address: "",
          comment: place.visit.areas,
          addressVisibility: "public" as const,
        }
      : prev.visitPlace,
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
  profile: MasterProfile | null;
}) {
  const navigate = useNavigate();
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function route() {
      const ctx = parseEntryContext(startParam);

      if (ctx.mode === "clientBooking") {
        navigate(
          `/client/bookings/t/${encodeURIComponent(ctx.accessToken)}`,
          { replace: true },
        );
        return;
      }

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
        navigate("/onboarding/welcome", { replace: true });
      }
    }

    void route();
    return () => {
      cancelled = true;
    };
  }, [navigate, profile, startParam]);

  return <BootSplash label={bootError ?? "Открываем…"} />;
}

export function App() {
  const { initData, user: tgUser, startParam } = useTelegram();
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<MasterProfile | null>(null);
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
          <Routes>
            <Route
              path="/"
              element={
                <HomeRedirect startParam={startParam} profile={profile} />
              }
            />
            <Route
              path="/onboarding/welcome"
              element={<WelcomeMasterScreen />}
            />
            <Route path="/onboarding" element={<OnboardingScreen />} />
            <Route
              path="/onboarding/services"
              element={<ServicesStepScreen />}
            />
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
            <Route path="/onboarding/hours" element={<HoursStepScreen />} />
            <Route path="/onboarding/place" element={<PlaceStepScreen />} />
            <Route
              path="/onboarding/success"
              element={<OnboardingSuccessScreen />}
            />
            <Route path="/cabinet" element={<ScheduleScreen />} />
            <Route path="/cabinet/clients" element={<ClientsScreen />} />
            <Route
              path="/cabinet/clients/:clientId"
              element={<ClientCardScreen />}
            />
            <Route
              path="/cabinet/clients/:clientId/notes/new"
              element={<CreateClientNoteScreen />}
            />
            <Route
              path="/cabinet/clients/:clientId/notes/:noteId"
              element={<EditClientNoteScreen />}
            />
            <Route path="/cabinet/profile" element={<CabinetProfileScreen />} />
            <Route
              path="/cabinet/profile/public"
              element={<PublicProfileScreen />}
            />
            <Route
              path="/cabinet/profile/edit"
              element={<EditPublicPageScreen />}
            />
            <Route
              path="/cabinet/profile/services"
              element={<ServicesSettingsScreen />}
            />
            <Route
              path="/cabinet/profile/services/new"
              element={
                <ServiceFormScreen
                  mode="new"
                  listPath="/cabinet/profile/services"
                />
              }
            />
            <Route
              path="/cabinet/profile/services/:serviceId/edit"
              element={
                <ServiceFormScreen
                  mode="edit"
                  listPath="/cabinet/profile/services"
                />
              }
            />
            <Route
              path="/cabinet/profile/services/:serviceId/duplicate"
              element={
                <ServiceFormScreen
                  mode="duplicate"
                  listPath="/cabinet/profile/services"
                />
              }
            />
            <Route
              path="/cabinet/profile/hours"
              element={<HoursSettingsScreen />}
            />
            <Route
              path="/cabinet/profile/place"
              element={<PlaceSettingsScreen />}
            />
            <Route
              path="/cabinet/profile/:stubKey"
              element={<ProfileStubScreen />}
            />
            <Route path="/cabinet/empty" element={<EmptyStateScreen />} />
            <Route
              path="/cabinet/booking/new"
              element={<NewBookingClientScreen />}
            />
            <Route
              path="/cabinet/booking/new/service"
              element={<NewBookingServiceScreen />}
            />
            <Route
              path="/cabinet/booking/new/time"
              element={<NewBookingTimeScreen />}
            />
            <Route
              path="/cabinet/booking/new/place"
              element={<NewBookingPlaceScreen />}
            />
            <Route
              path="/cabinet/booking/new/confirm"
              element={<NewBookingConfirmScreen />}
            />
            <Route
              path="/cabinet/booking/new/client"
              element={<CreateClientScreen />}
            />
            <Route
              path="/cabinet/clients/new"
              element={<CreateClientScreen />}
            />
            <Route
              path="/cabinet/booking/:bookingId"
              element={<BookingDetailScreen />}
            />
            <Route path="/client/bookings" element={<MyBookingsScreen />} />
            <Route
              path="/client/bookings/t/:accessToken"
              element={<ClientBookingTokenScreen />}
            />
            <Route
              path="/client/bookings/:bookingId"
              element={<ClientBookingDetailScreen />}
            />
            <Route
              path="/client/:masterId/services"
              element={<ClientServicesScreen />}
            />
            <Route
              path="/client/:masterId/place"
              element={<ClientPlaceScreen />}
            />
            <Route
              path="/client/:masterId/address"
              element={<ClientAddressScreen />}
            />
            <Route
              path="/client/:masterId/time"
              element={<ClientDateTimeScreen />}
            />
            <Route
              path="/client/:masterId/data"
              element={<ClientYourDataScreen />}
            />
            <Route
              path="/client/:masterId/confirm"
              element={<ClientConfirmScreen />}
            />
            <Route
              path="/client/:masterId/success"
              element={<ClientSuccessScreen />}
            />
            <Route
              path="/client/:masterId"
              element={<ClientPublicProfileScreen />}
            />
            <Route
              path="/client"
              element={<Navigate to="/client/bookings" replace />}
            />
            <Route path="/notifications" element={<NotificationsScreen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </PageTransition>
      </div>
    </BrowserRouter>
  );
}
