import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { useNavigate } from "react-router-dom";
import { createCabinetClient, fetchCabinetClients } from "../api";
import { ClientsListSkeleton } from "../components/calendar/Skeleton";
import { MasterSetupChrome } from "../components/master/MasterSetupChrome";
import { MsArrowRight } from "../components/master/MsArrowRight";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import {
  clientInitial,
  clientVisitsLabel,
  filterBookingClients,
  readBookingDraft,
  sortClientsRecent,
  type BookingClient,
} from "../lib/bookingClients";
import { patchBookingDraft } from "../lib/bookingDraft";
import { cx } from "../ui";

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="5.75" stroke="#9196A1" strokeWidth="1.5" />
      <path
        d="M13.5 13.5 17 17"
        stroke="#9196A1"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="8" cy="7" r="3" stroke="#623DF5" strokeWidth="1.5" />
      <path
        d="M3.5 15.5c.7-2.2 2.4-3.25 4.5-3.25s3.8 1.05 4.5 3.25"
        stroke="#623DF5"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14.5 7v5M12 9.5h5"
        stroke="#623DF5"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon({ color = "#9196A1" }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M7.5 4.5 13 10l-5.5 5.5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ClockSmallIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="5.75" stroke="#623DF5" strokeWidth="1.3" />
      <path
        d="M8 5.25V8l2 1.5"
        stroke="#623DF5"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

export function NewBookingClientScreen() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [recentOnly, setRecentOnly] = useState(true);
  const [allClients, setAllClients] = useState<BookingClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    () => readBookingDraft().clientId,
  );
  const [notesClient, setNotesClient] = useState<BookingClient | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCabinetClients();
        if (!cancelled) setAllClients(data.clients);
      } catch (err) {
        if (!cancelled) {
          setAllClients([]);
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
  }, []);

  const clients = useMemo(() => {
    const filtered = filterBookingClients(allClients, query);
    return recentOnly ? sortClientsRecent(filtered) : filtered;
  }, [allClients, query, recentOnly]);

  const canContinue = Boolean(selectedId);

  const goCabinet = useCallback(() => navigate("/cabinet"), [navigate]);
  useBackButton(goCabinet);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const selectClient = useCallback((client: BookingClient) => {
    setSelectedId(client.id);
    patchBookingDraft({ clientId: client.id, client });
  }, []);

  const openNotes = useCallback((client: BookingClient, e: MouseEvent) => {
    e.stopPropagation();
    setNotesClient(client);
  }, []);

  const onNoteKey = useCallback(
    (client: BookingClient, e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        setNotesClient(client);
      }
    },
    [],
  );

  async function onAddClient() {
    if (creating) return;
    const name = window.prompt("Имя клиента");
    if (!name?.trim()) return;
    const phone = window.prompt("Телефон (необязательно)") ?? "";
    setCreating(true);
    setError(null);
    try {
      const data = await createCabinetClient({
        name: name.trim(),
        phone: phone.trim(),
      });
      setAllClients((prev) => [data.client, ...prev]);
      selectClient(data.client);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <MasterSetupChrome
        step={1}
        progressFilled={1}
        topTitle="Новая запись"
        onBack={goCabinet}
        onClose={goCabinet}
        footer={
          <div className="ms-nb-footer">
            {!canContinue && (
              <p className="ms-nb-footer-hint">
                Кнопка «Продолжить» активируется после выбора клиента
              </p>
            )}
            <button
              type="button"
              className={cx("ms-btn", "ms-btn-primary", "ms-nb-continue")}
              disabled={!canContinue}
              onClick={() => {
                if (!selectedId) return;
                const selected =
                  allClients.find((c) => c.id === selectedId) ??
                  readBookingDraft().client;
                patchBookingDraft({
                  clientId: selectedId,
                  client: selected,
                });
                navigate("/cabinet/booking/new/service");
              }}
            >
              <span>Продолжить</span>
              <MsArrowRight />
            </button>
          </div>
        }
      >
        <div className="ms-nb">
          <div className="ms-nb-intro">
            <h2 className="ms-nb-title">Кого записываем?</h2>
            <p className="ms-nb-lead">
              Выберите клиента из вашей базы или добавьте нового
            </p>
          </div>

          <label className="ms-field">
            <span className="ms-label">Клиент</span>
            <span className="ms-nb-search">
              <SearchIcon />
              <input
                className="ms-input ms-nb-search-input"
                type="search"
                placeholder="Имя или номер телефона"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
            </span>
          </label>

          <button
            type="button"
            className="ms-nb-add"
            disabled={creating}
            onClick={() => void onAddClient()}
          >
            <span className="ms-nb-add-icon">
              <UserPlusIcon />
            </span>
            <span className="ms-nb-add-copy">
              <span className="ms-nb-add-title">Добавить нового клиента</span>
              <span className="ms-nb-add-sub">Создать карточку клиента</span>
            </span>
            <ChevronIcon />
          </button>

          <div className="ms-nb-list-head">
            <h3 className="ms-nb-list-title">Ваши клиенты</h3>
            <button
              type="button"
              className={cx("ms-nb-recent", recentOnly && "is-on")}
              onClick={() => setRecentOnly((v) => !v)}
            >
              <ClockSmallIcon />
              <span>Последние клиенты</span>
            </button>
          </div>

          {loading ? (
            <ClientsListSkeleton rows={5} />
          ) : error ? (
            <p className="ms-footer-error">{error}</p>
          ) : clients.length === 0 ? (
            <div className="ms-cab-empty-card">
              <div className="ms-cab-empty-copy">
                <p className="ms-cab-empty-title">Пока нет клиентов</p>
                <p className="ms-cab-empty-sub">
                  Добавьте клиента или дождитесь первой записи
                </p>
              </div>
            </div>
          ) : null}

          <ul className="ms-nb-list">
            {clients.map((client) => {
              const active = client.id === selectedId;
              const hasNotes = client.notes.length > 0;
              return (
                <li key={client.id}>
                  <div
                    className={cx("ms-nb-card", active && "is-selected")}
                    role="button"
                    tabIndex={0}
                    aria-pressed={active}
                    onClick={() => selectClient(client)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        selectClient(client);
                      }
                    }}
                  >
                    <span
                      className={cx("ms-nb-avatar", `tone-${client.avatarTone}`)}
                      aria-hidden
                    >
                      {clientInitial(client.name)}
                    </span>
                    <span className="ms-nb-card-main">
                      <span className="ms-nb-card-name">{client.name}</span>
                      <span className="ms-nb-card-phone">{client.phone}</span>
                      <span className="ms-nb-card-meta">
                        {clientVisitsLabel(client)}
                      </span>
                      {hasNotes ? (
                        <button
                          type="button"
                          className="ms-nb-note-chip"
                          onClick={(e) => openNotes(client, e)}
                          onKeyDown={(e) => onNoteKey(client, e)}
                        >
                          <InfoIcon />
                          <span>Есть важная заметка</span>
                          <ChevronIcon color="#067FF9" />
                        </button>
                      ) : null}
                    </span>
                    <span
                      className={cx("ms-nb-radio", active && "is-on")}
                      aria-hidden
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </MasterSetupChrome>

      {notesClient ? (
        <div
          className="ms-nb-sheet-root"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ms-nb-sheet-title"
        >
          <button
            type="button"
            className="ms-nb-sheet-backdrop"
            aria-label="Закрыть"
            onClick={() => setNotesClient(null)}
          />
          <div className="ms-nb-sheet">
            <h2 id="ms-nb-sheet-title" className="ms-nb-sheet-title">
              Важно помнить
            </h2>
            <div className="ms-nb-sheet-handle" aria-hidden />
            <div className="ms-nb-sheet-client">
              <span
                className={cx(
                  "ms-nb-avatar",
                  `tone-${notesClient.avatarTone}`,
                )}
                aria-hidden
              >
                {clientInitial(notesClient.name)}
              </span>
              <div className="ms-nb-sheet-client-copy">
                <p className="ms-nb-sheet-client-name">{notesClient.name}</p>
                <p className="ms-nb-sheet-client-sub">
                  Важная заметка к следующему визиту
                </p>
              </div>
            </div>
            <ul className="ms-nb-sheet-notes">
              {notesClient.notes.map((note) => (
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
              onClick={() => setNotesClient(null)}
            >
              Понятно
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
