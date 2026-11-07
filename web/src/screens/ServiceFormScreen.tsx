import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { saveMasterService } from "../api";
import { MasterSetupChrome } from "../components/master/MasterSetupChrome";
import {
  ServiceFormFields,
  ServicePickerSheet,
  type PickerKind,
} from "../components/master/serviceForm";
import { SettingsPageShell } from "../components/settings/SettingsPageShell";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import { getService, upsertService } from "../lib/masterDraft";
import {
  emptyServiceForm,
  formFromService,
  formToMasterService,
  type ServiceFormState,
} from "../lib/serviceFormState";
import {
  validateServiceForm,
  type ServiceFormErrors,
} from "../lib/serviceFormValidation";
import { Button } from "../ui";

type Mode = "new" | "edit" | "duplicate";

export function ServiceFormScreen({
  mode,
  listPath = "/onboarding/services",
}: {
  mode: Mode;
  listPath?: string;
}) {
  const navigate = useNavigate();
  const { serviceId } = useParams();
  const { webApp } = useTelegram();
  const isSettings = listPath.startsWith("/cabinet/profile");

  const source = serviceId ? getService(serviceId) : null;
  const [form, setForm] = useState<ServiceFormState>(() => {
    if ((mode === "edit" || mode === "duplicate") && source) {
      return formFromService(source, mode === "duplicate");
    }
    return emptyServiceForm();
  });
  const [errors, setErrors] = useState<ServiceFormErrors>({});
  const [sheet, setSheet] = useState<PickerKind | null>(null);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const headings = useMemo(() => {
    if (mode === "edit") {
      return { title: "Редактирование услуги", cta: "Сохранить изменения" };
    }
    if (mode === "duplicate") {
      return { title: "Дублирование услуги", cta: "Создать услугу" };
    }
    return { title: "Новая услуга", cta: "Создать услугу" };
  }, [mode]);

  const goBack = useCallback(() => navigate(listPath), [listPath, navigate]);

  const handleClose = useCallback(() => {
    if (isSettings) {
      navigate("/cabinet/profile");
      return;
    }
    webApp?.close?.();
    navigate("/");
  }, [isSettings, navigate, webApp]);

  const patchForm = useCallback((patch: Partial<ServiceFormState>) => {
    setForm((f) => ({ ...f, ...patch }));
  }, []);

  const validate = useCallback(
    (): ServiceFormErrors => validateServiceForm(form),
    [form],
  );

  const submit = useCallback(async () => {
    if (saving) return;
    setTried(true);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      webApp?.HapticFeedback?.notificationOccurred("error");
      return;
    }

    const service = formToMasterService(form, {
      mode,
      sourceId: source?.id,
    });

    setSaving(true);
    setSubmitError(null);
    try {
      const saved = await saveMasterService(service);
      upsertService({
        ...service,
        id: saved.id,
        title: saved.title,
        durationMin: saved.durationMin,
        price: saved.price,
        priceTo: service.priceTo ?? null,
        priceMode: saved.priceMode,
        breakAfterMin: saved.breakAfterMin,
        description: saved.description,
      });
      webApp?.HapticFeedback?.notificationOccurred("success");
      navigate(listPath, {
        state: {
          toast: mode === "edit" ? "saved" : "added",
          serviceTitle: saved.title,
        },
      });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Не удалось сохранить");
      webApp?.HapticFeedback?.notificationOccurred("error");
    } finally {
      setSaving(false);
    }
  }, [form, listPath, mode, navigate, saving, source, validate, webApp]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  if ((mode === "edit" || mode === "duplicate") && !source) {
    return (
      <div className="master-setup">
        <div className="ms-body">
          <p className="ms-lead">Услуга не найдена</p>
          <Button variant="secondary" onClick={goBack}>
            К списку
          </Button>
        </div>
      </div>
    );
  }

  const showError = (key: keyof ServiceFormErrors) =>
    tried ? errors[key] : undefined;

  const footer = (
    <div className="ms-footer-actions">
      {submitError ? (
        <p className="ms-field-error ms-footer-error">{submitError}</p>
      ) : null}
      <Button disabled={saving} onClick={() => void submit()}>
        {saving ? "Сохранение…" : headings.cta}
      </Button>
      <Button variant="secondary" disabled={saving} onClick={goBack}>
        Отмена
      </Button>
    </div>
  );

  const fields = (
    <ServiceFormFields
      form={form}
      showError={showError}
      onChange={patchForm}
      onOpenDuration={() => setSheet("duration")}
      onOpenBreak={() => setSheet("break")}
    />
  );

  return (
    <>
      {isSettings ? (
        <SettingsPageShell
          title={headings.title}
          onBack={goBack}
          onClose={handleClose}
          footer={footer}
        >
          {fields}
        </SettingsPageShell>
      ) : (
        <MasterSetupChrome
          step={2}
          progressFilled={2}
          topTitle={headings.title}
          onBack={goBack}
          onClose={handleClose}
          footer={footer}
        >
          {fields}
        </MasterSetupChrome>
      )}

      <ServicePickerSheet
        kind={sheet}
        form={form}
        breakErrorText={showError("breakAfterMin")}
        onClose={() => setSheet(null)}
        onApplyDuration={patchForm}
        onApplyBreak={patchForm}
        onValidationError={(field, message) => {
          setTried(true);
          setErrors((e) => ({ ...e, [field]: message }));
        }}
      />
    </>
  );
}
