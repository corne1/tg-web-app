import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  cancelBooking,
  fetchCabinetClient,
  fetchCabinetSessions,
  markBookingPaid,
} from "../api";
import timerIcon from "../assets/cabinet/timer.svg";
import {
  clientInitial,
  clientVisitsLabel,
  type BookingClient,
} from "../lib/bookingClients";
import { formatDuration, WEEKDAYS } from "../lib/masterDraft";
import {
  MONTHS_GEN,
  sessionEndClock,
  sessionStartDate,
  weekdayIdFromDate,
} from "../lib/scheduleUi";
import type { Session } from "../types";
import { BackIcon, cx, IconButton } from "../ui";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";

function formatDetailDay(date: Date): string {
  const wd = WEEKDAYS.find((w) => w.id === weekdayIdFromDate(date));
  return `${date.getDate()} ${MONTHS_GEN[date.getMonth()]}, ${wd?.label ?? ""}`;
}

function formatCreatedBadge(iso?: string): string {
  if (!iso) return "Создана";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Создана";
  return `Создана ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

function formatRub(n: number): string {
  return `${n.toLocaleString("ru-RU")} ₽`;
}

function MoreIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="6" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="18" r="1.5" fill="currentColor" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" fill="#067FF9" />
      <path
        d="M8 7.25V11M8 5.25h.01"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6 3.5 10.5 8 6 12.5"
        stroke="#067FF9"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function NotePinIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 17.5c.5-2.5 5-4.2 5-8.2A5 5 0 0 0 5 9.3c0 4 4.5 5.7 5 8.2Z"
        stroke="#623DF5"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="9" r="1.5" fill="#623DF5" />
    </svg>
  );
}

type DetailState = "upcoming" | "done" | "cancelled";

function detailState(session: Session): DetailState {
  if (session.status === "cancelled") return "cancelled";
  if (session.paid || session.status === "paid") return "done";
  return "upcoming";
}

export function BookingDetailScreen() {
  const navigate = useNavigate();
  const { bookingId = "" } = useParams<{ bookingId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [client, setClient] = useState<BookingClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const goBack = useCallback(() => navigate("/cabinet"), [navigate]);
  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setClient(null);
      try {
        const data = await fetchCabinetSessions("week");
        if (cancelled) return;
        const found = data.sessions.find((s) => s.id === bookingId) ?? null;
        setSession(found);
        if (!found) {
          setError("Запись не найдена");
          return;
        }
        if (found.clientId) {
          try {
            const clientData = await fetchCabinetClient(found.clientId);
            if (!cancelled) setClient(clientData.client);
          } catch {
            if (!cancelled) setClient(null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Ошибка загрузки");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  const state = session ? detailState(session) : "upcoming";
  const start = session ? sessionStartDate(session.startsAt) : null;
  const durationMin = session?.durationMin ?? 60;
  const end = session
    ? sessionEndClock(session.startsAt, durationMin, session.time)
    : "";
  const price = session?.price ?? 0;

  async function completeVisit() {
    if (!session || busy) return;
    setBusy(true);
    setError(null);
    try {
      await markBookingPaid(session.id);
      setSession({ ...session, paid: true, status: "paid" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось завершить");
    } finally {
      setBusy(false);
    }
  }

  async function onCancel() {
    if (!session || busy) return;
    setBusy(true);
    setMenuOpen(false);
    setError(null);
    try {
      await cancelBooking(session.id);
      setSession({ ...session, status: "cancelled" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отменить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="master-setup ms-cabinet ms-bd">
      <header className="ms-bd-toolbar">
        <IconButton label="Назад" onClick={goBack}>
          <BackIcon />
        </IconButton>
        <h1 className="ms-bd-toolbar-title">Детали записи</h1>
        <IconButton label="Ещё" onClick={() => setMenuOpen(true)}>
          <MoreIcon />
        </IconButton>
      </header>

      <div className="ms-body ms-bd-body">
        {loading ? (
          <p className="ms-cab-loading">Загрузка…</p>
        ) : !session ? (
          <p className="ms-footer-error">{error ?? "Запись не найдена"}</p>
        ) : (
          <>
            <div className="ms-bd-badges">
              <span
                className={cx(
                  "ms-bd-badge",
                  state === "upcoming" && "is-upcoming",
                  state === "done" && "is-done",
                  state === "cancelled" && "is-cancelled",
                )}
              >
                {state === "upcoming"
                  ? "Предстоит"
                  : state === "done"
                    ? "Завершена"
                    : "Отменена"}
              </span>
              <span className="ms-bd-badge is-meta">
                {formatCreatedBadge(session.createdAt)}
              </span>
            </div>

            <div className="ms-bd-when">
              <h2 className="ms-bd-when-title">
                {start ? formatDetailDay(start) : session.dateLabel}
              </h2>
              <p className="ms-bd-when-range">
                {session.time}–{end}
              </p>
              <p className="ms-bd-when-dur">
                <img src={timerIcon} width={16} height={16} alt="" />
                <span>Продолжительность · {formatDuration(durationMin)}</span>
              </p>
            </div>

            <section className="ms-bd-section">
              <h3 className="ms-bd-section-title">Клиент</h3>
              <div className="ms-nb-card is-selected ms-bd-client">
                <span
                  className={cx(
                    "ms-nb-avatar",
                    `tone-${client?.avatarTone ?? "violet"}`,
                  )}
                  aria-hidden
                >
                  {clientInitial(session.clientName)}
                </span>
                <div className="ms-nb-card-main">
                  <span className="ms-nb-card-name">{session.clientName}</span>
                  {client ? (
                    <>
                      <span className="ms-nb-card-phone">{client.phone}</span>
                      <span className="ms-nb-card-meta">
                        {clientVisitsLabel(client)}
                      </span>
                      {client.notes.length > 0 ? (
                        <button
                          type="button"
                          className="ms-nb-note-chip"
                          onClick={() => setNotesOpen(true)}
                        >
                          <InfoIcon />
                          <span>Есть важная заметка</span>
                          <ChevronIcon />
                        </button>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="ms-bd-section">
              <h3 className="ms-bd-section-title">Услуги и стоимость</h3>
              <ul className="ms-bd-services">
                <li className="ms-bd-service">
                  <div className="ms-bd-service-copy">
                    <span className="ms-bd-service-title">Услуга</span>
                    <span className="ms-bd-service-meta">
                      {formatDuration(durationMin)}
                    </span>
                  </div>
                  <span className="ms-bd-service-price">{formatRub(price)}</span>
                </li>
              </ul>
              <div className="ms-bd-total">
                <span>Стоимость</span>
                <strong>{formatRub(price)}</strong>
              </div>
            </section>

            {client && client.notes.length > 0 ? (
              <section className="ms-bd-section">
                <h3 className="ms-bd-section-title">Важно помнить</h3>
                <ul className="ms-bd-notes">
                  {client.notes.map((note) => (
                    <li key={note.id} className="ms-bd-note">
                      <span className="ms-bd-note-icon" aria-hidden>
                        <NotePinIcon />
                      </span>
                      <div className="ms-bd-note-copy">
                        <p className="ms-bd-note-title">{note.title}</p>
                        <p className="ms-bd-note-text">{note.body}</p>
                        <p className="ms-bd-note-meta">{note.addedLabel}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {state === "cancelled" ? (
              <section className="ms-bd-section">
                <h3 className="ms-bd-section-title">Причина отмены</h3>
                <p className="ms-bd-cancel-reason">Не указано</p>
              </section>
            ) : null}

            {error ? <p className="ms-footer-error">{error}</p> : null}
          </>
        )}
      </div>

      {session && state === "upcoming" ? (
        <div className="ms-bd-footer">
          <button
            type="button"
            className="ms-btn ms-btn-primary"
            disabled={busy}
            onClick={() => void completeVisit()}
          >
            Завершить визит
          </button>
        </div>
      ) : null}

      {menuOpen ? (
        <div className="ms-nb-sheet-root" role="dialog" aria-modal="true">
          <button
            type="button"
            className="ms-nb-sheet-backdrop"
            aria-label="Закрыть"
            onClick={() => setMenuOpen(false)}
          />
          <div className="ms-nb-sheet">
            <div className="ms-nb-sheet-handle" aria-hidden />
            <p className="ms-nb-sheet-title">Действия</p>
            {state !== "cancelled" ? (
              <button
                type="button"
                className="ms-bd-menu-danger"
                disabled={busy}
                onClick={() => void onCancel()}
              >
                Отменить запись
              </button>
            ) : null}
            <button
              type="button"
              className="ms-btn ms-btn-secondary ms-nb-sheet-ok"
              onClick={() => setMenuOpen(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      ) : null}

      {notesOpen && client ? (
        <div className="ms-nb-sheet-root" role="dialog" aria-modal="true">
          <button
            type="button"
            className="ms-nb-sheet-backdrop"
            aria-label="Закрыть"
            onClick={() => setNotesOpen(false)}
          />
          <div className="ms-nb-sheet">
            <div className="ms-nb-sheet-handle" aria-hidden />
            <h2 className="ms-nb-sheet-title">Важно помнить</h2>
            <ul className="ms-nb-sheet-notes">
              {client.notes.map((note) => (
                <li key={note.id} className="ms-nb-sheet-note">
                  <span className="ms-nb-sheet-note-icon" aria-hidden>
                    <NotePinIcon />
                  </span>
                  <div className="ms-nb-sheet-note-body">
                    <p className="ms-nb-sheet-note-title">{note.title}</p>
                    <p className="ms-nb-sheet-note-text">{note.body}</p>
                    <p className="ms-nb-sheet-note-meta">{note.addedLabel}</p>
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="ms-btn ms-btn-primary ms-nb-sheet-ok"
              onClick={() => setNotesOpen(false)}
            >
              Понятно
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
