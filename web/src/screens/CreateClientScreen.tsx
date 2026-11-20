import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createCabinetClient } from "../api";
import { MasterSetupChrome } from "../components/master/MasterSetupChrome";
import { MsArrowRight } from "../components/master/MsArrowRight";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import { patchBookingDraft } from "../lib/bookingDraft";
import { loadMasterDraft } from "../lib/masterDraft";
import { bookingNeedsPlaceStep } from "./NewBookingPlaceScreen";
import { BackIcon, Button, Field, IconButton, Input } from "../ui";

/**
 * Figma — «Добавить клиента» / «Новый клиент».
 * Used from Clients tab and New Booking flow (#47/#48).
 */
export function CreateClientScreen() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fromBooking = params.get("from") === "booking";
  const { webApp } = useTelegram();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goBack = useCallback(() => {
    navigate(fromBooking ? "/cabinet/booking/new" : "/cabinet/clients");
  }, [fromBooking, navigate]);

  const goClose = useCallback(() => {
    navigate(fromBooking ? "/cabinet" : "/cabinet/clients");
  }, [fromBooking, navigate]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const valid = Boolean(name.trim());

  const onSave = useCallback(async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const data = await createCabinetClient({
        name: name.trim(),
      });
      webApp?.HapticFeedback?.notificationOccurred("success");
      if (fromBooking) {
        patchBookingDraft({
          clientId: data.client.id,
          client: data.client,
        });
        navigate("/cabinet/booking/new/service", { replace: true });
        return;
      }
      navigate(`/cabinet/clients/${data.client.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось создать");
      webApp?.HapticFeedback?.notificationOccurred("error");
    } finally {
      setSaving(false);
    }
  }, [fromBooking, name, navigate, saving, valid, webApp]);

  const body = (
    <div className="ms-nb ms-create-client">
      <div className="ms-nb-intro">
        <h2 className="ms-nb-title">Добавить клиента</h2>
        <p className="ms-nb-lead">
          Укажите имя клиента, чтобы сохранить клиента в своей базе.
        </p>
      </div>

      <Field label="Имя клиента" as="label">
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Анна Смирнова"
          autoComplete="name"
        />
      </Field>

      {error ? <p className="ms-footer-error">{error}</p> : null}
    </div>
  );

  if (fromBooking) {
    return (
      <MasterSetupChrome
        step={1}
        stepTotal={bookingNeedsPlaceStep(loadMasterDraft().placeMode) ? 5 : 4}
        progressFilled={1}
        topTitle="Новый клиент"
        onBack={goBack}
        onClose={goClose}
        footer={
          <div className="ms-nb-footer">
            <Button
              variant="primary"
              className="ms-nb-continue"
              disabled={!valid || saving}
              onClick={() => void onSave()}
            >
              <span>{saving ? "Сохранение…" : "Добавить клиента"}</span>
              {saving ? null : <MsArrowRight />}
            </Button>
          </div>
        }
      >
        {body}
      </MasterSetupChrome>
    );
  }

  return (
    <div className="master-setup ms-cabinet ms-create-client-page">
      <header className="ms-bd-toolbar">
        <IconButton label="Назад" onClick={goBack}>
          <BackIcon />
        </IconButton>
        <h1 className="ms-bd-toolbar-title">Новый клиент</h1>
        <span className="ms-cc-toolbar-spacer" aria-hidden />
      </header>
      <div className="ms-body ms-cn-body">{body}</div>
      <footer className="ms-footer">
        <div className="ms-footer-actions">
          <Button
            variant="primary"
            disabled={!valid || saving}
            onClick={() => void onSave()}
          >
            {saving ? "Сохранение…" : "Добавить клиента"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
