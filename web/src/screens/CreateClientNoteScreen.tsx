import { useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createCabinetClientNote } from "../api";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import {
  BackIcon,
  Button,
  CloseIcon,
  Field,
  IconButton,
  Input,
  Textarea,
} from "../ui";

/** Figma 21370:23881 — «Создание заметки». */
export function CreateClientNoteScreen() {
  const navigate = useNavigate();
  const { clientId = "" } = useParams<{ clientId: string }>();
  const { webApp } = useTelegram();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goBack = useCallback(() => {
    if (clientId) {
      navigate(`/cabinet/clients/${clientId}`);
      return;
    }
    navigate("/cabinet/clients");
  }, [clientId, navigate]);

  const onSave = useCallback(async () => {
    if (!clientId || !body.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await createCabinetClientNote(clientId, {
        title: title.trim() || "Заметка",
        body: body.trim(),
      });
      webApp?.HapticFeedback?.notificationOccurred("success");
      navigate(`/cabinet/clients/${clientId}`, {
        replace: true,
        state: { noteToast: "added" as const },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
      webApp?.HapticFeedback?.notificationOccurred("error");
    } finally {
      setSaving(false);
    }
  }, [body, clientId, navigate, saving, title, webApp]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const valid = Boolean(body.trim());

  return (
    <div className="master-setup ms-cabinet ms-cn">
      <header className="ms-bd-toolbar">
        <IconButton label="Назад" onClick={goBack}>
          <BackIcon />
        </IconButton>
        <h1 className="ms-bd-toolbar-title">Создание заметки</h1>
        <IconButton label="Закрыть" onClick={goBack}>
          <CloseIcon />
        </IconButton>
      </header>

      <div className="ms-body ms-cn-body">
        <h2 className="ms-cn-title">Новая заметка</h2>

        <Field label="Заголовок" as="label">
          <Input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например, Предпочтения по форме"
            autoComplete="off"
          />
        </Field>

        <Field label="Текст заметки" as="label">
          <Textarea
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Запишите, что важно помнить об этом клиенте..."
          />
        </Field>

        {error ? <p className="ms-footer-error">{error}</p> : null}
      </div>

      <footer className="ms-footer ms-cn-footer">
        <div className="ms-footer-actions">
          <Button
            variant="primary"
            disabled={!valid || saving}
            onClick={() => void onSave()}
          >
            {saving ? "Сохранение…" : "Сохранить заметку"}
          </Button>
        </div>
      </footer>
    </div>
  );
}
