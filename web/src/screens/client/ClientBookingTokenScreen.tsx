import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchClientBookingByToken } from "../../api";
import { ClientFlowShell } from "../../components/client/ClientFlowShell";

/** Resolves `startapp=b_<token>` → booking detail. */
export function ClientBookingTokenScreen() {
  const { accessToken = "" } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchClientBookingByToken(accessToken)
      .then((data) => {
        if (cancelled) return;
        navigate(`/client/bookings/${encodeURIComponent(data.booking.id)}`, {
          replace: true,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Запись не найдена");
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, navigate]);

  return (
    <ClientFlowShell hideHeader>
      <p className="ms-client-muted">
        {error ?? "Открываем запись…"}
      </p>
    </ClientFlowShell>
  );
}
