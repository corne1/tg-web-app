import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MasterSetupChrome } from "../components/master/MasterSetupChrome";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import {
  formatDuration,
  formatPrice,
  loadMasterDraft,
  removeService,
  saveMasterDraft,
  serviceInitials,
  type MasterService,
} from "../lib/masterDraft";

function EmptyIllustration() {
  return (
    <svg
      className="ms-empty-illu"
      viewBox="0 0 220 140"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="28" y="18" width="164" height="96" rx="18" fill="#EDE7FF" />
      <rect
        x="40"
        y="32"
        width="140"
        height="88"
        rx="16"
        fill="#fff"
        stroke="#E5E5EA"
        strokeWidth="1.5"
      />
      <circle cx="72" cy="76" r="22" fill="#EDE7FF" />
      <rect x="58" y="68" width="28" height="20" rx="3" stroke="#6B4EFF" strokeWidth="1.6" />
      <circle cx="72" cy="74" r="5" stroke="#6B4EFF" strokeWidth="1.6" />
      <path d="M60 84l8-6 5 4 7-8 10 10H60z" fill="#6B4EFF" opacity="0.35" />
      <rect x="106" y="58" width="56" height="8" rx="4" fill="#E5E5EA" />
      <rect x="106" y="74" width="44" height="8" rx="4" fill="#E5E5EA" />
      <rect x="106" y="90" width="36" height="8" rx="4" fill="#EDE7FF" />
    </svg>
  );
}

type LocState = { toast?: "added" | "deleted" | "saved" } | null;

export function ServicesStepScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { webApp } = useTelegram();
  const [services, setServices] = useState<MasterService[]>(
    () => loadMasterDraft().services,
  );
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setServices(loadMasterDraft().services);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, location.key]);

  useEffect(() => {
    const state = location.state as LocState;
    if (!state?.toast) return;
    const map = {
      added: "Услуга добавлена",
      deleted: "Услуга удалена",
      saved: "Изменения сохранены",
    } as const;
    setToast(map[state.toast]);
    navigate(location.pathname, { replace: true, state: null });
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [location.pathname, location.state, navigate]);

  const goBack = useCallback(() => navigate("/onboarding"), [navigate]);
  const handleClose = useCallback(() => {
    webApp?.close?.();
    navigate("/");
  }, [navigate, webApp]);

  const handleSaveExit = useCallback(() => {
    const draft = loadMasterDraft();
    saveMasterDraft({ ...draft, services });
    webApp?.HapticFeedback?.notificationOccurred("success");
    navigate("/");
  }, [navigate, services, webApp]);

  const handleContinue = useCallback(() => {
    if (services.length === 0) return;
    webApp?.HapticFeedback?.impactOccurred("light");
    navigate("/onboarding/hours");
  }, [navigate, services.length, webApp]);

  const openForm = useCallback(
    (mode: "new" | "edit" | "duplicate", id?: string) => {
      setMenuId(null);
      if (mode === "new") navigate("/onboarding/services/new");
      else if (mode === "edit" && id) navigate(`/onboarding/services/${id}/edit`);
      else if (mode === "duplicate" && id)
        navigate(`/onboarding/services/${id}/duplicate`);
    },
    [navigate],
  );

  const confirmDelete = useCallback(() => {
    if (!deleteId) return;
    removeService(deleteId);
    setDeleteId(null);
    setMenuId(null);
    refresh();
    setToast("Услуга удалена");
    webApp?.HapticFeedback?.notificationOccurred("success");
    setTimeout(() => setToast(null), 2500);
  }, [deleteId, refresh, webApp]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const hasServices = services.length > 0;

  return (
    <MasterSetupChrome
      step={2}
      progressFilled={2}
      onBack={goBack}
      onClose={handleClose}
      toast={toast}
      toastTone="success"
      footer={
        <>
          <p className="ms-next-hint">Следующий шаг — Рабочее время</p>
          <button
            type="button"
            className="ms-btn-primary"
            disabled={!hasServices}
            onClick={handleContinue}
          >
            Продолжить
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
              <path
                d="M6.5 3.5 12 9l-5.5 5.5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button type="button" className="ms-btn-secondary" onClick={handleSaveExit}>
            Сохранить и выйти
          </button>
        </>
      }
    >
      <section className="ms-hero">
        <h2 className="ms-question">Какие услуги вы предлагаете?</h2>
        <p className="ms-lead">
          Добавьте услуги, чтобы клиенты могли выбирать подходящую при записи.
        </p>
      </section>

      {!hasServices ? (
        <div className="ms-empty">
          <EmptyIllustration />
          <p className="ms-empty-title">Здесь появятся ваши услуги</p>
          <p className="ms-empty-text">
            Начните с одной основной услуги. Остальные можно добавить позже.
          </p>
          <button
            type="button"
            className="ms-btn-outline"
            onClick={() => openForm("new")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M8 3v10M3 8h10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            Добавить первую услугу
          </button>
        </div>
      ) : (
        <div className="ms-services">
          <p className="ms-services-count">Ваши услуги: {services.length}</p>
          <ul className="ms-service-list">
            {services.map((s) => (
              <li key={s.id} className="ms-service-card">
                <div className="ms-service-avatar" aria-hidden>
                  {serviceInitials(s.title)}
                </div>
                <div className="ms-service-meta">
                  <p className="ms-service-title">{s.title}</p>
                  <p className="ms-service-sub">
                    {formatDuration(s.durationMin)} · {formatPrice(s)}
                  </p>
                </div>
                <button
                  type="button"
                  className="ms-service-more"
                  aria-label="Действия"
                  aria-expanded={menuId === s.id}
                  onClick={() => setMenuId((id) => (id === s.id ? null : s.id))}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                    <circle cx="9" cy="4" r="1.4" fill="currentColor" />
                    <circle cx="9" cy="9" r="1.4" fill="currentColor" />
                    <circle cx="9" cy="14" r="1.4" fill="currentColor" />
                  </svg>
                </button>

                {menuId === s.id && (
                  <div className="ms-action-menu" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => openForm("edit", s.id)}
                    >
                      <span>Редактировать</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => openForm("duplicate", s.id)}
                    >
                      <span>Дублировать</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="is-danger"
                      onClick={() => {
                        setMenuId(null);
                        setDeleteId(s.id);
                      }}
                    >
                      <span>Удалить</span>
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="ms-btn-outline"
            onClick={() => openForm("new")}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path
                d="M8 3v10M3 8h10"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            Добавить услугу
          </button>
        </div>
      )}

      {menuId && (
        <button
          type="button"
          className="ms-menu-backdrop"
          aria-label="Закрыть меню"
          onClick={() => setMenuId(null)}
        />
      )}

      {deleteId && (
        <div className="ms-modal-root" role="presentation">
          <button
            type="button"
            className="ms-modal-backdrop"
            aria-label="Закрыть"
            onClick={() => setDeleteId(null)}
          />
          <div className="ms-modal" role="dialog" aria-modal="true" aria-labelledby="del-title">
            <div className="ms-modal-warn" aria-hidden>
              !
            </div>
            <h3 id="del-title">Удалить услугу?</h3>
            <p>
              Услуга перестанет быть доступной для онлайн-записи. Это действие можно отменить,
              добавив услугу снова.
            </p>
            <button type="button" className="ms-btn-danger" onClick={confirmDelete}>
              Удалить
            </button>
            <button
              type="button"
              className="ms-btn-ghost-text"
              onClick={() => setDeleteId(null)}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </MasterSetupChrome>
  );
}
