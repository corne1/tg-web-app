import { useCallback, useEffect, useState } from "react";
import { resolveCity, searchCities, type CityHit } from "../api";

export function useCitySearch(active: boolean, query: string, limit = 12) {
  const [suggestions, setSuggestions] = useState<CityHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    const q = query.trim();
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      void searchCities(q, limit)
        .then((cities) => {
          if (!cancelled) setSuggestions(cities);
        })
        .catch(() => {
          if (!cancelled) {
            setSuggestions([]);
            setError("Не удалось загрузить города. Попробуйте ещё раз");
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [active, limit, query]);

  const commitQuery = useCallback(async (raw: string): Promise<string | null> => {
    const q = raw.trim();
    if (!q) return null;
    setError(null);
    try {
      const resolved = await resolveCity(q);
      return resolved;
    } catch {
      setError("Не удалось проверить город");
      return null;
    }
  }, []);

  return {
    suggestions,
    loading,
    error,
    setError,
    commitQuery,
  };
}
