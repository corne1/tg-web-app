import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMe } from "../api";
import { BookingClientSummary } from "../components/booking/BookingClientSummary";
import { MasterSetupChrome } from "../components/master/MasterSetupChrome";
import { MsArrowRight } from "../components/master/MsArrowRight";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import clockPurpleIcon from "../assets/cabinet/clock-purple.svg";
import plusCircleIcon from "../assets/onboarding/plus-circle.svg";
import servicesEmptyIllu from "../assets/onboarding/services-empty.svg";
import {
  bookingTotals,
  formatDuration,
  formatPrice,
  patchBookingDraft,
  readBookingDraft,
  resolveBookingClient,
  selectedServicesLabel,
  serviceLetter,
} from "../lib/bookingDraft";
import { clientInitial } from "../lib/bookingClients";
import {
  loadMasterDraft,
  saveMasterDraft,
  type MasterService,
} from "../lib/masterDraft";
import { cx } from "../ui";

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

export function NewBookingServiceScreen() {
  const navigate = useNavigate();
  const initial = useMemo(() => readBookingDraft(), []);
  const client = resolveBookingClient(initial.clientId, initial);
  const [catalog, setCatalog] = useState<MasterService[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    () => initial.serviceIds,
  );
  const [notesOpen, setNotesOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setCatalogLoading(true);
      try {
        const me = await fetchMe();
        const services: MasterService[] = (me.services ?? []).map((s) => ({
          id: s.id,
          title: s.title,
          durationMin: s.durationMin,
          price: s.price,
          priceMode: s.priceMode,
          breakAfterMin: s.breakAfterMin,
          description: s.description,
        }));
        if (!cancelled) {
          setCatalog(services);
          saveMasterDraft({ ...loadMasterDraft(), services });
        }
      } catch {
        if (!cancelled) setCatalog([]);
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () =>
      selectedIds
        .map((id) => catalog.find((s) => s.id === id))
        .filter((s): s is MasterService => Boolean(s)),
    [catalog, selectedIds],
  );
  const totals = useMemo(() => bookingTotals(selected), [selected]);
  const canContinue = selectedIds.length > 0 && catalog.length > 0;
  const showEmpty = !catalogLoading && catalog.length === 0;

  const goBack = useCallback(
    () => navigate("/cabinet/booking/new"),
    [navigate],
  );
  const goCabinet = useCallback(() => navigate("/cabinet"), [navigate]);
  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  useEffect(() => {
    if (!client) navigate("/cabinet/booking/new", { replace: true });
  }, [client, navigate]);

  if (!client) return null;

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <>
      <MasterSetupChrome
        step={2}
        progressFilled={2}
        topTitle="Новая запись"
        onBack={goBack}
        onClose={goCabinet}
        footer={
          <div className="ms-nb-footer">
            {canContinue ? (
              <div className="ms-nb-foot-sum">
                <div className="ms-nb-foot-sum-row">
                  <span className="ms-nb-foot-sum-label">
                    {selectedServicesLabel(selectedIds.length)}
                  </span>
                  <span className="ms-nb-foot-sum-price">{totals.priceLabel}</span>
                </div>
                <p className="ms-nb-foot-sum-dur">
                  <img
                    src={clockPurpleIcon}
                    width={16}
                    height={16}
                    alt=""
                    aria-hidden
                  />
                  <span>Длительность: {formatDuration(totals.totalMin)}</span>
                </p>
              </div>
            ) : null}
            <button
              type="button"
              className={cx("ms-btn", "ms-btn-primary", "ms-nb-continue")}
              disabled={!canContinue}
              onClick={() => {
                patchBookingDraft({
                  serviceIds: selectedIds,
                  dateISO: null,
                  time: null,
                });
                navigate("/cabinet/booking/new/time");
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
            <h2 className="ms-nb-title">Какие услуги нужны?</h2>
            <p className="ms-nb-lead">
              Выберите одну или несколько услуг для клиента
            </p>
          </div>

          <BookingClientSummary
            client={client}
            selected
            onNotesClick={
              client.notes.length > 0 ? () => setNotesOpen(true) : undefined
            }
          />

          <div className="ms-nb-svc-block">
            <h3 className="ms-nb-svc-heading">Услуги</h3>

            {showEmpty ? (
              <div className="ms-nb-svc-empty">
                <img
                  className="ms-nb-svc-empty-illu"
                  src={servicesEmptyIllu}
                  width={160}
                  height={120}
                  alt=""
                  aria-hidden
                />
                <p className="ms-nb-svc-empty-title">
                  Пока нет добавленных услуг
                </p>
                <p className="ms-nb-svc-empty-text">
                  Добавьте первую услугу, чтобы записать клиента
                </p>
                <button
                  type="button"
                  className="ms-btn ms-btn-primary ms-nb-svc-empty-cta"
                  onClick={() => navigate("/onboarding/services/new")}
                >
                  <img
                    src={plusCircleIcon}
                    width={20}
                    height={20}
                    alt=""
                    aria-hidden
                  />
                  <span>Добавить услугу</span>
                </button>
              </div>
            ) : (
              <div className="ms-nb-svc-list" role="group" aria-label="Услуги">
                {catalog.map((svc) => {
                  const on = selectedIds.includes(svc.id);
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      className={cx("ms-nb-svc", on && "is-on")}
                      onClick={() => toggle(svc.id)}
                    >
                      <span className="ms-nb-svc-avatar" aria-hidden>
                        {serviceLetter(svc.title)}
                      </span>
                      <span className="ms-nb-svc-copy">
                        <span className="ms-nb-svc-title">{svc.title}</span>
                        <span className="ms-nb-svc-meta">
                          {formatDuration(svc.durationMin)}
                          <span aria-hidden> · </span>
                          {formatPrice(svc)}
                        </span>
                      </span>
                      <span
                        className={cx("ms-nb-check", on && "is-on")}
                        aria-hidden
                      >
                        {on ? (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                          >
                            <path
                              d="M3 7.2 5.8 10 11 4"
                              stroke="#fff"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </MasterSetupChrome>

      {notesOpen ? (
        <div
          className="ms-nb-sheet-root"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ms-nb-svc-notes-title"
        >
          <button
            type="button"
            className="ms-nb-sheet-backdrop"
            aria-label="Закрыть"
            onClick={() => setNotesOpen(false)}
          />
          <div className="ms-nb-sheet">
            <div className="ms-nb-sheet-handle" aria-hidden />
            <h2 id="ms-nb-svc-notes-title" className="ms-nb-sheet-title">
              Важно помнить
            </h2>
            <div className="ms-nb-sheet-client">
              <span
                className={cx("ms-nb-avatar", `tone-${client.avatarTone}`)}
                aria-hidden
              >
                {clientInitial(client.name)}
              </span>
              <div className="ms-nb-sheet-client-copy">
                <p className="ms-nb-sheet-client-name">{client.name}</p>
                <p className="ms-nb-sheet-client-sub">
                  Важная заметка к следующему визиту
                </p>
              </div>
            </div>
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
    </>
  );
}
