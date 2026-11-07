import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { fetchCabinetClient } from "../api";
import calendarIcon from "../assets/cabinet/calendar.svg";
import { ClientCardSkeleton } from "../components/calendar/Skeleton";
import { MsToast } from "../components/master/MsToast";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import {
  clientInitial,
  pluralVisits,
  type BookingClient,
  type ClientNote,
} from "../lib/bookingClients";
import { openClientTelegram } from "../lib/telegramDeepLink";
import {
  BackIcon,
  BottomSheet,
  ChevronRightIcon,
  cx,
  IconButton,
  SheetSimpleHeader,
} from "../ui";

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

function NoteMoreIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="4.5" r="1.25" fill="currentColor" />
      <circle cx="10" cy="10" r="1.25" fill="currentColor" />
      <circle cx="10" cy="15.5" r="1.25" fill="currentColor" />
    </svg>
  );
}

function TgWriteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M8.2 11.8 16.5 3.5M8.35 12.05l2.1 4.55c.3.64 1.22.58 1.42-.1l4.85-15.05c.22-.7-.45-1.32-1.12-1.04L2.55 8.3c-.7.3-.64 1.3.1 1.5l5.7 1.55Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type TabId = "overview" | "history";
type NoteToastKind = "added" | "updated" | "deleted";

type LocationState = {
  noteToast?: NoteToastKind;
};

/** Figma 21317:15642 — «Карточка клиента». */
export function ClientCardScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { webApp } = useTelegram();
  const { clientId = "" } = useParams<{ clientId: string }>();
  const [client, setClient] = useState<BookingClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("overview");
  const [toast, setToast] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "danger">("success");
  const [fullNote, setFullNote] = useState<ClientNote | null>(null);
  const [menuNoteId, setMenuNoteId] = useState<string | null>(null);

  const goBack = useCallback(
    () => navigate("/cabinet/clients"),
    [navigate],
  );
  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  useEffect(() => {
    const state = location.state as LocationState | null;
    if (!state?.noteToast) return;
    const map: Record<NoteToastKind, string> = {
      added: "Заметка добавлена",
      updated: "Заметка изменена",
      deleted: "Заметка удалена",
    };
    setToastTone("success");
    setToast(map[state.noteToast]);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

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

  const writeTelegram = useCallback(() => {
    const username = client?.telegramUsername;
    if (!username) return;
    webApp?.HapticFeedback?.impactOccurred("light");
    const ok = openClientTelegram(username, webApp ?? null);
    if (!ok) {
      setToastTone("danger");
      setToast("Не удалось открыть Telegram");
    }
  }, [client?.telegramUsername, webApp]);

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
  const notesCarousel = client.notes.length > 1;

  return (
    <div className="master-setup ms-cabinet ms-cc">
      {toast ? (
        <div className="ms-toast-host">
          <MsToast
            message={toast}
            tone={toastTone}
            onDismiss={() => setToast(null)}
          />
        </div>
      ) : null}

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
          {client.telegramUsername ? (
            <button
              type="button"
              className="ms-cc-tg-btn"
              onClick={writeTelegram}
            >
              <TgWriteIcon />
              <span>Написать в Telegram</span>
            </button>
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
                  onClick={() =>
                    navigate(`/cabinet/clients/${client.id}/notes/new`)
                  }
                >
                  + Добавить заметку
                </button>
              </div>
              {client.notes.length === 0 ? (
                <p className="ms-cc-empty-line">Пока нет заметок</p>
              ) : (
                <ul
                  className={cx(
                    "ms-cc-notes",
                    notesCarousel && "is-carousel",
                  )}
                >
                  {client.notes.map((note) => (
                    <li
                      key={note.id}
                      className={cx(
                        "ms-cc-note",
                        notesCarousel && "is-slide",
                        menuNoteId === note.id && "is-menu-open",
                      )}
                    >
                      <span className="ms-cc-note-icon" aria-hidden>
                        <NotePinIcon />
                      </span>
                      <div className="ms-cc-note-copy">
                        <div className="ms-cc-note-title-row">
                          <p className="ms-cc-note-title">{note.title}</p>
                          <button
                            type="button"
                            className="ms-cc-note-more"
                            aria-label="Действия с заметкой"
                            onClick={() =>
                              setMenuNoteId((id) =>
                                id === note.id ? null : note.id,
                              )
                            }
                          >
                            <NoteMoreIcon />
                          </button>
                        </div>
                        <p className="ms-cc-note-text">{note.body}</p>
                        <button
                          type="button"
                          className="ms-cc-note-expand"
                          onClick={() => setFullNote(note)}
                        >
                          Показать полностью
                        </button>
                        <p className="ms-cc-note-meta">
                          {note.editedLabel ?? note.addedLabel}
                        </p>
                        {menuNoteId === note.id ? (
                          <div className="ms-cc-note-menu" role="menu">
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setMenuNoteId(null);
                                navigate(
                                  `/cabinet/clients/${client.id}/notes/${note.id}`,
                                );
                              }}
                            >
                              Редактировать
                            </button>
                          </div>
                        ) : null}
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
                  <li key={item.id}>
                    <button
                      type="button"
                      className="ms-cc-history-item"
                      onClick={() => navigate(`/cabinet/booking/${item.id}`)}
                    >
                      <div className="ms-cc-history-copy">
                        <span className="ms-cc-history-date">
                          {item.dateLabel}
                        </span>
                        <span className="ms-cc-history-service">
                          {item.serviceTitle}
                          {item.multiService ? " · несколько услуг" : ""}
                        </span>
                        <span className="ms-cc-history-status">
                          {item.statusLabel}
                        </span>
                      </div>
                      <span className="ms-cc-history-price">
                        {item.priceLabel}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {error ? <p className="ms-footer-error">{error}</p> : null}
      </div>

      <BottomSheet open={Boolean(fullNote)} onClose={() => setFullNote(null)}>
        <SheetSimpleHeader title={fullNote?.title ?? "Заметка"} />
        <div className="ms-cc-note-sheet">
          <p className="ms-cc-note-sheet-text">{fullNote?.body}</p>
          <p className="ms-cc-note-meta">
            {fullNote?.editedLabel ?? fullNote?.addedLabel}
          </p>
        </div>
      </BottomSheet>
    </div>
  );
}
