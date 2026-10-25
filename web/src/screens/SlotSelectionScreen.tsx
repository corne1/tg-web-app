import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenShell } from "../components/calendar/ScreenShell";
import { SlotGridSkeleton } from "../components/calendar/Skeleton";
import { UiMainButton } from "../components/calendar/UiMainButton";
import { timeSlots } from "../data/mock";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import { getPsychologistProfile } from "../lib/profileStorage";

export function SlotSelectionScreen() {
  const navigate = useNavigate();
  const { isTelegram } = useTelegram();
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const profile = getPsychologistProfile();

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  const days = useMemo(() => {
    const map = new Map<string, typeof timeSlots>();
    for (const slot of timeSlots) {
      const key = `${slot.dayLabel}|${slot.date}`;
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return [...map.entries()];
  }, []);

  const selected = timeSlots.find((s) => s.id === selectedId);

  const book = useCallback(() => {
    if (!selected) return;
    navigate("/client/confirm", {
      state: {
        dayLabel: selected.dayLabel,
        date: selected.date,
        time: selected.time,
        duration: profile?.duration ?? 50,
        price: profile?.price ?? 5000,
      },
    });
  }, [navigate, profile?.duration, profile?.price, selected]);

  const goHome = useCallback(() => navigate("/"), [navigate]);
  useBackButton(goHome);
  useMainButton({
    text: selected ? `Записаться на ${selected.time}` : "Выберите время",
    visible: isTelegram && Boolean(selected),
    onClick: book,
  });

  return (
    <ScreenShell
      title="Записаться на консультацию"
      subtitle="Выберите удобный слот на ближайшие 7 дней"
      footer={
        !isTelegram ? (
          <UiMainButton onClick={book} disabled={!selected}>
            {selected ? `Записаться на ${selected.time}` : "Выберите время"}
          </UiMainButton>
        ) : undefined
      }
    >
      {loading ? (
        <SlotGridSkeleton />
      ) : (
        <div className="slot-grid">
          {days.map(([key, slots]) => {
            const [dayLabel, date] = key.split("|");
            return (
              <div key={key} className="slot-day">
                <div className="slot-day-head">
                  <strong>{dayLabel}</strong>
                  <span>{date}</span>
                </div>
                <div className="slot-times">
                  {slots.map((slot) => (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={!slot.available}
                      className={`slot-btn ${selectedId === slot.id ? "is-active" : ""} ${!slot.available ? "is-busy" : ""}`}
                      onClick={() => setSelectedId(slot.id)}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ScreenShell>
  );
}
