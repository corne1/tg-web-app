import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ensureMasterProfile } from "../api";
import { BootSplash } from "../components/BootSplash";
import { cacheProfile, isOnboardingDone, masterResumePath } from "../lib/profileStorage";
import { syncDraftFromServer } from "../lib/syncDraftFromServer";
import { parseEntryContext } from "../lib/startParam";
import type { MasterProfile } from "../types";

export function HomeRedirect({
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
        if (profile?.name || profile?.serviceTypeCode) {
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
