import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { deleteMasterService, setMasterOnboardingStep } from "../api";
import { MasterSetupChrome } from "../components/master/MasterSetupChrome";
import { MsArrowRight } from "../components/master/MsArrowRight";
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
import actionCopyIcon from "../assets/onboarding/action-copy.svg";
import actionEditIcon from "../assets/onboarding/action-edit.svg";
import actionTrashIcon from "../assets/onboarding/action-trash.svg";
import modalTrashIcon from "../assets/onboarding/modal-trash.svg";
import plusCircleIcon from "../assets/onboarding/plus-circle.svg";
import servicesEmptyIllu from "../assets/onboarding/services-empty.svg";
import timerIcon from "../assets/onboarding/timer.svg";
import { Button, Modal } from "../ui";

function EmptyIllustration() {
  return (
    <img
      className="ms-empty-illu"
      src={servicesEmptyIllu}
      width={160}
      height={120}
      alt=""
      aria-hidden
    />
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
  const [toastTone, setToastTone] = useState<"success" | "danger">("success");

  const deleteService = deleteId
    ? services.find((s) => s.id === deleteId) ?? null
    : null;

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
    setToastTone("success");
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

  const handleContinue = useCallback(async () => {
    if (services.length === 0) return;
    const draft = loadMasterDraft();
    saveMasterDraft({ ...draft, services });
    try {
      await setMasterOnboardingStep(2);
      webApp?.HapticFeedback?.impactOccurred("light");
      navigate("/onboarding/hours");
    } catch (err) {
      setToastTone("danger");
      setToast(err instanceof Error ? err.message : "Не удалось продолжить");
      setTimeout(() => setToast(null), 2500);
    }
  }, [navigate, services, webApp]);

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

  const confirmDelete = useCallback(async () => {
    if (!deleteId) return;
    const id = deleteId;
    try {
      await deleteMasterService(id);
      removeService(id);
      setDeleteId(null);
      setMenuId(null);
      refresh();
      setToastTone("success");
      setToast("Услуга удалена");
      webApp?.HapticFeedback?.notificationOccurred("success");
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      setToastTone("danger");
      setToast(err instanceof Error ? err.message : "Не удалось удалить");
      setTimeout(() => setToast(null), 2500);
    }
  }, [deleteId, refresh, webApp]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const dismissToast = useCallback(() => setToast(null), []);
  const hasServices = services.length > 0;

  return (
    <MasterSetupChrome
      step={2}
      progressFilled={2}
      onBack={goBack}
      onClose={handleClose}
      toast={toast}
      toastTone={toastTone}
      onToastDismiss={dismissToast}
      footer={
        <>
          <p className="ms-next-hint">Следующий шаг — Рабочее время</p>
          <Button
            disabled={!hasServices}
            onClick={() => void handleContinue()}
          >
            Продолжить
            <MsArrowRight />
          </Button>
          <Button variant="secondary" onClick={() => void handleSaveExit()}>
            Сохранить и выйти
          </Button>
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
          <Button variant="outline" onClick={() => openForm("new")}>
            <img
              className="ms-btn-plus-icon"
              src={plusCircleIcon}
              width={20}
              height={20}
              alt=""
              aria-hidden
            />
            Добавить первую услугу
          </Button>
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
                    <span className="ms-service-duration">
                      <img
                        className="ms-service-timer"
                        src={timerIcon}
                        width={16}
                        height={16}
                        alt=""
                        aria-hidden
                      />
                      {formatDuration(s.durationMin)}
                    </span>
                    <span className="ms-service-sep" aria-hidden>
                      ·
                    </span>
                    <span>{formatPrice(s)}</span>
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
                    <circle cx="9" cy="4.5" r="1.35" fill="currentColor" />
                    <circle cx="9" cy="9" r="1.35" fill="currentColor" />
                    <circle cx="9" cy="13.5" r="1.35" fill="currentColor" />
                  </svg>
                </button>

                {menuId === s.id && (
                  <div className="ms-action-menu" role="menu">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => openForm("edit", s.id)}
                    >
                      <img
                        className="ms-action-menu-icon"
                        src={actionEditIcon}
                        width={16}
                        height={16}
                        alt=""
                        aria-hidden
                      />
                      <span>Редактировать</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => openForm("duplicate", s.id)}
                    >
                      <img
                        className="ms-action-menu-icon"
                        src={actionCopyIcon}
                        width={16}
                        height={16}
                        alt=""
                        aria-hidden
                      />
                      <span>Дублировать</span>
                    </button>
                    <div className="ms-action-menu-sep" role="separator" />
                    <button
                      type="button"
                      role="menuitem"
                      className="is-danger"
                      onClick={() => {
                        setMenuId(null);
                        setDeleteId(s.id);
                      }}
                    >
                      <img
                        className="ms-action-menu-icon"
                        src={actionTrashIcon}
                        width={16}
                        height={16}
                        alt=""
                        aria-hidden
                      />
                      <span>Удалить</span>
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Button variant="outline" onClick={() => openForm("new")}>
            <img
              className="ms-btn-plus-icon"
              src={plusCircleIcon}
              width={20}
              height={20}
              alt=""
              aria-hidden
            />
            Добавить услугу
          </Button>
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

      <Modal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        labelledBy="del-title"
      >
        <div className="ms-modal-warn" aria-hidden>
          <img
            className="ms-modal-warn-icon"
            src={modalTrashIcon}
            width={20}
            height={20}
            alt=""
          />
        </div>
        <h3 id="del-title">Удалить услугу?</h3>
        <p>
          «{deleteService?.title ?? "Услуга"}» перестанет быть доступна для новых
          записей.
        </p>
        <div className="ms-modal-actions">
          <Button variant="danger" onClick={() => void confirmDelete()}>
            Удалить
          </Button>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>
            Отмена
          </Button>
        </div>
      </Modal>
    </MasterSetupChrome>
  );
}
