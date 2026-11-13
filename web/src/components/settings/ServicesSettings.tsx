import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { deleteMasterService, setMasterOnboardingStep } from "../../api";
import actionCopyIcon from "../../assets/onboarding/action-copy.svg";
import actionEditIcon from "../../assets/onboarding/action-edit.svg";
import actionTrashIcon from "../../assets/onboarding/action-trash.svg";
import modalTrashIcon from "../../assets/onboarding/modal-trash.svg";
import plusCircleIcon from "../../assets/onboarding/plus-circle.svg";
import serviceSparkIcon from "../../assets/onboarding/service-spark.svg";
import servicesEmptyIllu from "../../assets/onboarding/services-empty.svg";
import timerIcon from "../../assets/onboarding/timer.svg";
import { useBackButton } from "../../hooks/useBackButton";
import { useMainButton } from "../../hooks/useMainButton";
import { useTelegram } from "../../hooks/useTelegram";
import {
  formatDuration,
  formatPrice,
  loadMasterDraft,
  removeService,
  saveMasterDraft,
  type MasterService,
} from "../../lib/masterDraft";
import { Button, Modal } from "../../ui";
import { MasterSetupChrome } from "../master/MasterSetupChrome";
import { MsArrowRight } from "../master/MsArrowRight";
import { SettingsPageShell } from "./SettingsPageShell";
import type { SettingsMode } from "./settingsMode";

export type { SettingsMode };

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

type LocState = {
  toast?: "added" | "deleted" | "saved";
  serviceTitle?: string;
} | null;

const SERVICES_BASE: Record<SettingsMode, string> = {
  onboarding: "/onboarding/services",
  settings: "/cabinet/profile/services",
};

/** Shared services UI for onboarding step and cabinet settings. */
export function ServicesSettings({ mode }: { mode: SettingsMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = SERVICES_BASE[mode];
  const isSettings = mode === "settings";
  const { webApp } = useTelegram();
  const [services, setServices] = useState<MasterService[]>(
    () => loadMasterDraft().services,
  );
  const [menuId, setMenuId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastDescription, setToastDescription] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "danger">("success");

  const deleteService = deleteId
    ? (services.find((s) => s.id === deleteId) ?? null)
    : null;

  const showToast = useCallback(
    (
      message: string,
      opts?: { description?: string | null; tone?: "success" | "danger" },
    ) => {
      setToastTone(opts?.tone ?? "success");
      setToastDescription(opts?.description ?? null);
      setToast(message);
      window.setTimeout(() => {
        setToast(null);
        setToastDescription(null);
      }, 2500);
    },
    [],
  );

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
    showToast(map[state.toast], {
      description: state.serviceTitle?.trim() || null,
      tone: "success",
    });
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate, showToast]);

  const goBack = useCallback(() => {
    navigate(isSettings ? "/cabinet/profile" : "/onboarding");
  }, [isSettings, navigate]);

  const handleClose = useCallback(() => {
    if (isSettings) {
      navigate("/cabinet/profile");
      return;
    }
    webApp?.close?.();
    navigate("/");
  }, [isSettings, navigate, webApp]);

  const persistLocal = useCallback(() => {
    const draft = loadMasterDraft();
    saveMasterDraft({ ...draft, services });
  }, [services]);

  const handleSaveExit = useCallback(() => {
    persistLocal();
    webApp?.HapticFeedback?.notificationOccurred("success");
    navigate(isSettings ? "/cabinet/profile" : "/");
  }, [isSettings, navigate, persistLocal, webApp]);

  const handlePrimary = useCallback(async () => {
    if (services.length === 0) return;
    persistLocal();
    if (isSettings) {
      webApp?.HapticFeedback?.notificationOccurred("success");
      navigate("/cabinet/profile");
      return;
    }
    try {
      await setMasterOnboardingStep(2);
      webApp?.HapticFeedback?.impactOccurred("light");
      navigate("/onboarding/hours");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Не удалось продолжить", {
        tone: "danger",
      });
    }
  }, [isSettings, navigate, persistLocal, services.length, showToast, webApp]);

  const openForm = useCallback(
    (formMode: "new" | "edit" | "duplicate", id?: string) => {
      setMenuId(null);
      if (formMode === "new") navigate(`${basePath}/new`);
      else if (formMode === "edit" && id) navigate(`${basePath}/${id}/edit`);
      else if (formMode === "duplicate" && id)
        navigate(`${basePath}/${id}/duplicate`);
    },
    [basePath, navigate],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteId) return;
    const id = deleteId;
    const title =
      services.find((s) => s.id === id)?.title.trim() ||
      deleteService?.title.trim() ||
      null;
    try {
      await deleteMasterService(id);
      removeService(id);
      setDeleteId(null);
      setMenuId(null);
      refresh();
      showToast("Услуга удалена", { description: title, tone: "success" });
      webApp?.HapticFeedback?.notificationOccurred("success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Не удалось удалить", {
        tone: "danger",
      });
    }
  }, [deleteId, deleteService, refresh, services, showToast, webApp]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const dismissToast = useCallback(() => {
    setToast(null);
    setToastDescription(null);
  }, []);
  const hasServices = services.length > 0;

  const body = (
    <>
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
                  <img
                    className="ms-service-spark"
                    src={serviceSparkIcon}
                    width={20}
                    height={20}
                    alt=""
                  />
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

      {menuId ? (
        <button
          type="button"
          className="ms-menu-backdrop"
          aria-label="Закрыть меню"
          onClick={() => setMenuId(null)}
        />
      ) : null}

      <Modal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        labelledBy="del-title"
        className="ms-modal-dialog"
      >
        <div className="ms-modal-header">
          <div className="ms-modal-warn" aria-hidden>
            <img
              className="ms-modal-warn-icon"
              src={modalTrashIcon}
              width={20}
              height={20}
              alt=""
            />
          </div>
          <div className="ms-modal-copy">
            <h3 id="del-title">Удалить услугу?</h3>
            <p>
              «{deleteService?.title ?? "Услуга"}» перестанет быть доступна для
              новых записей.
            </p>
          </div>
        </div>
        <div className="ms-modal-actions">
          <Button variant="danger" onClick={() => void confirmDelete()}>
            Удалить
          </Button>
          <Button variant="ghost" onClick={() => setDeleteId(null)}>
            Отмена
          </Button>
        </div>
      </Modal>
    </>
  );

  const footer = isSettings ? (
    <Button disabled={!hasServices} onClick={() => void handlePrimary()}>
      Сохранить
    </Button>
  ) : (
    <>
      <p className="ms-next-hint">Следующий шаг — Рабочее время</p>
      <Button disabled={!hasServices} onClick={() => void handlePrimary()}>
        Продолжить
        <MsArrowRight />
      </Button>
      <Button variant="secondary" onClick={() => void handleSaveExit()}>
        Сохранить и выйти
      </Button>
    </>
  );

  if (isSettings) {
    return (
      <SettingsPageShell
        title="Мои услуги"
        onBack={goBack}
        onClose={handleClose}
        toast={toast}
        toastDescription={toastDescription}
        toastTone={toastTone}
        onToastDismiss={dismissToast}
        footer={footer}
      >
        {body}
      </SettingsPageShell>
    );
  }

  return (
    <MasterSetupChrome
      step={2}
      progressFilled={2}
      onBack={goBack}
      onClose={handleClose}
      toast={toast}
      toastDescription={toastDescription}
      toastTone={toastTone}
      onToastDismiss={dismissToast}
      footer={footer}
    >
      {body}
    </MasterSetupChrome>
  );
}
