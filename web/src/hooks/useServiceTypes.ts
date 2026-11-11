import { useEffect, useState } from "react";
import type { ServiceTypeDto } from "../api";
import {
  getCachedServiceTypes,
  loadServiceTypes,
  serviceTypeMeta,
} from "../lib/serviceTypesCatalog";

export function useServiceTypes() {
  const [serviceTypes, setServiceTypes] = useState<ServiceTypeDto[]>(() =>
    getCachedServiceTypes(),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(
    () => getCachedServiceTypes().length === 0,
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(getCachedServiceTypes().length === 0);
    void loadServiceTypes()
      .then((list) => {
        if (cancelled) return;
        setServiceTypes(list);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Не удалось загрузить направления",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { serviceTypes, loading, error, metaFor: serviceTypeMeta };
}
