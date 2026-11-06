import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createCabinetClientNote, fetchCabinetClient } from "../api";
import calendarIcon from "../assets/cabinet/calendar.svg";
import { ClientCardSkeleton } from "../components/calendar/Skeleton";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import {
  clientInitial,
  pluralVisits,
  type BookingClient,
} from "../lib/bookingClients";
import { BackIcon, ChevronRightIcon, cx, IconButton } from "../ui";

function MoreIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="6" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="18" r="1.5" fill="currentColor" />
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

type TabId = "overview" | "history";

/** Figma 21317:15642 — «Карточка клиента». */
export function ClientCardScreen() {
  const navigate = useNavigate();
  const { clientId = "" } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<BookingClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [noteBusy, setNoteBusy] = useState(false);

  const goBack = useCallback(
    () => navigate("/cabinet/clients"),
    [navigate],
  );
  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!clientId) {
        setClient(null);
        setLoading(false);
        setError("Клиент не найден");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCabinetClient(clientId);
        if (!cancelled) setClient(data.client);
      } catch (err) {
        if (!cancelled) {
          setClient(null);
          setError(err instanceof Error ? err.message : "Клиент не найден");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  async function addNote() {
    if (!client || noteBusy) return;
    const body = window.prompt("Текст заметки");
    if (!body?.trim()) return;
    setNoteBusy(true);
    try {
      const data = await createCabinetClientNote(client.id, {
        title: "Заметка",
        body: body.trim(),
      });
      setClient(data.client);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setNoteBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="master-setup ms-cabinet ms-cc">
        <header className="ms-bd-toolbar">
          <IconButton label="Назад" onClick={goBack}>
            <BackIcon />
          </IconButton>
          <h1 className="ms-bd-toolbar-title">Карточка клиента</h1>
          <span className="ms-cc-toolbar-spacer" aria-hidden />
        </header>
        <div className="ms-body ms-cab-body ms-cc-body">
          <ClientCardSkeleton />
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="master-setup ms-cabinet ms-cc">
        <header className="ms-bd-toolbar">
          <IconButton label="Назад" onClick={goBack}>
            <BackIcon />
          </IconButton>
          <h1 className="ms-bd-toolbar-title">Карточка клиента</h1>
          <span className="ms-cc-toolbar-spacer" aria-hidden />
        </header>
        <div className="ms-body ms-cab-body">
          <p className="ms-footer-error">{error ?? "Клиент не найден"}</p>
        </div>
      </div>
    );
  }

  const history = client.history ?? [];

  return (
    <div className="master-setup ms-cabinet ms-cc">
      <header className="ms-bd-toolbar">
        <IconButton label="Назад" onClick={goBack}>
          <BackIcon />
        </IconButton>
        <h1 className="ms-bd-toolbar-title">Карточка клиента</h1>
        <IconButton label="Ещё" onClick={() => undefined}>
          <MoreIcon />
        </IconButton>
      </header>

      <div className="ms-body ms-cab-body ms-cc-body">
        <div className="ms-cc-hero">
          <span
            className={cx("ms-nb-avatar", "ms-cc-avatar", `tone-${client.avatarTone}`)}
            aria-hidden
          >
            {clientInitial(client.name)}
          </span>
          <h2 className="ms-cc-name">{client.name}</h2>
          <p className="ms-cc-phone">{client.phone || "Телефон не указан"}</p>
          {client.clientSinceLabel ? (
            <p className="ms-cc-since">{client.clientSinceLabel}</p>
          ) : null}
        </div>

        <div className="ms-cc-stats" role="group" aria-label="Статистика">
          <div className="ms-cc-stat">
            <span className="ms-cc-stat-value">
              {client.visits} {pluralVisits(client.visits)}
            </span>
          </div>
          <div className="ms-cc-stat">
            <span className="ms-cc-stat-value">
              {client.lastVisitLabel ?? "—"}
            </span>
            <span className="ms-cc-stat-label">Последний визит</span>
          </div>
        </div>

        <div className="ms-cc-tabs" role="tablist" aria-label="Разделы">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "overview"}
            className={cx("ms-cc-tab", tab === "overview" && "is-on")}
            onClick={() => setTab("overview")}
          >
            Обзор
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "history"}
            className={cx("ms-cc-tab", tab === "history" && "is-on")}
            onClick={() => setTab("history")}
          >
            История
          </button>
        </div>

        {tab === "overview" ? (
          <>
            <section className="ms-cc-section">
              <h3 className="ms-cc-section-title">Следующая запись</h3>
              {client.nextBooking ? (
                <button
                  type="button"
                  className="ms-cc-next"
                  onClick={() =>
                    navigate(
                      client.nextBooking?.bookingId
                        ? `/cabinet/booking/${client.nextBooking.bookingId}`
                        : "/cabinet",
                    )
                  }
                >
                  <span className="ms-cc-next-icon" aria-hidden>
                    <img src={calendarIcon} width={20} height={20} alt="" />
                  </span>
                  <span className="ms-cc-next-copy">
                    <span className="ms-cc-next-when">
                      {client.nextBooking.dateLabel} · {client.nextBooking.time}
                    </span>
                    <span className="ms-cc-next-service">
                      {client.nextBooking.serviceTitle}
                    </span>
                    <span className="ms-cc-next-price">
                      {client.nextBooking.priceLabel}
                    </span>
                  </span>
                  <span className="ms-cl-row-chevron" aria-hidden>
                    <ChevronRightIcon />
                  </span>
                </button>
              ) : (
                <p className="ms-cc-empty-line">Нет предстоящих записей</p>
              )}
            </section>

            <section className="ms-cc-section">
              <div className="ms-cc-section-head">
                <h3 className="ms-cc-section-title">Важно помнить</h3>
                <button
                  type="button"
                  className="ms-cc-add-note"
                  disabled={noteBusy}
                  onClick={() => void addNote()}
                >
                  + Добавить заметку
                </button>
              </div>
              {client.notes.length === 0 ? (
                <p className="ms-cc-empty-line">Пока нет заметок</p>
              ) : (
                <ul className="ms-cc-notes">
                  {client.notes.map((note) => (
                    <li key={note.id} className="ms-cc-note">
                      <span className="ms-cc-note-icon" aria-hidden>
                        <NotePinIcon />
                      </span>
                      <div className="ms-cc-note-copy">
                        <p className="ms-cc-note-title">{note.title}</p>
                        <p className="ms-cc-note-text">{note.body}</p>
                        <p className="ms-cc-note-meta">{note.addedLabel}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : (
          <section className="ms-cc-section">
            {history.length === 0 ? (
              <p className="ms-cc-empty-line">История визитов пуста</p>
            ) : (
              <ul className="ms-cc-history">
                {history.map((item) => (
                  <li key={item.id} className="ms-cc-history-item">
                    <div className="ms-cc-history-copy">
                      <span className="ms-cc-history-date">{item.dateLabel}</span>
                      <span className="ms-cc-history-service">
                        {item.serviceTitle}
                      </span>
                      <span className="ms-cc-history-status">
                        {item.statusLabel}
                      </span>
                    </div>
                    <span className="ms-cc-history-price">{item.priceLabel}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {error ? <p className="ms-footer-error">{error}</p> : null}
      </div>
    </div>
  );
}
