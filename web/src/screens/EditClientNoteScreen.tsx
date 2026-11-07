import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  deleteCabinetClientNote,
  fetchCabinetClient,
  updateCabinetClientNote,
} from "../api";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import modalTrashIcon from "../assets/onboarding/modal-trash.svg";
import {
  BackIcon,
  Button,
  CloseIcon,
  Field,
  IconButton,
  Input,
  Modal,
  Textarea,
} from "../ui";

/** Figma — «Редактирование заметки» next to create-note. */
export function EditClientNoteScreen() {
  const navigate = useNavigate();
  const { clientId = "", noteId = "" } = useParams<{
    clientId: string;
    noteId: string;
  }>();
  const { webApp } = useTelegram();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goBack = useCallback(() => {
    if (clientId) {
      navigate(`/cabinet/clients/${clientId}`);
      return;
    }
    navigate("/cabinet/clients");
  }, [clientId, navigate]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!clientId || !noteId) {
        setLoading(false);
        setError("Заметка не найдена");
        return;
      }
      setLoading(true);
      try {
        const data = await fetchCabinetClient(clientId);
        const note = data.client.notes.find((n) => n.id === noteId);
        if (cancelled) return;
        if (!note) {
          setError("Заметка не найдена");
          return;
        }
        setTitle(note.title);
        setBody(note.body);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Не удалось загрузить");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [clientId, noteId]);

  const onSave = useCallback(async () => {
    if (!clientId || !noteId || !body.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateCabinetClientNote(clientId, noteId, {
        title: title.trim() || "Заметка",
        body: body.trim(),
      });
      webApp?.HapticFeedback?.notificationOccurred("success");
      navigate(`/cabinet/clients/${clientId}`, {
        replace: true,
        state: { noteToast: "updated" as const },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
      webApp?.HapticFeedback?.notificationOccurred("error");
    } finally {
      setSaving(false);
    }
  }, [body, clientId, navigate, noteId, saving, title, webApp]);

  const confirmDelete = useCallback(async () => {
    if (!clientId || !noteId || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteCabinetClientNote(clientId, noteId);
      webApp?.HapticFeedback?.notificationOccurred("success");
      navigate(`/cabinet/clients/${clientId}`, {
        replace: true,
        state: { noteToast: "deleted" as const },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось удалить");
      webApp?.HapticFeedback?.notificationOccurred("error");
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  }, [clientId, deleting, navigate, noteId, webApp]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const valid = Boolean(body.trim());
  const busy = saving || deleting;

  return (
    <div className="master-setup ms-cabinet ms-cn">
      <header className="ms-bd-toolbar">
        <IconButton label="Назад" onClick={goBack}>
          <BackIcon />
        </IconButton>
        <h1 className="ms-bd-toolbar-title">Редактирование заметки</h1>
        <IconButton label="Закрыть" onClick={goBack}>
          <CloseIcon />
        </IconButton>
      </header>

      <div className="ms-body ms-cn-body">
        <h2 className="ms-cn-title">Редактирование</h2>

        {loading ? (
          <p className="ms-cc-empty-line">Загрузка…</p>
        ) : (
          <>
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
          </>
        )}

        {error ? <p className="ms-footer-error">{error}</p> : null}
      </div>

      <footer className="ms-footer ms-cn-footer">
        <div className="ms-footer-actions">
          <Button
            variant="primary"
            disabled={!valid || busy || loading}
            onClick={() => void onSave()}
          >
            {saving ? "Сохранение…" : "Сохранить изменения"}
          </Button>
          <Button variant="secondary" disabled={busy || loading} onClick={goBack}>
            Отмена
          </Button>
          <Button
            variant="secondary"
            className="ms-cn-delete"
            disabled={busy || loading}
            onClick={() => setDeleteOpen(true)}
          >
            Удалить заметку
          </Button>
        </div>
      </footer>

      <Modal
        open={deleteOpen}
        onClose={() => {
          if (!deleting) setDeleteOpen(false);
        }}
        labelledBy="del-note-title"
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
            <h3 id="del-note-title">Удалить заметку?</h3>
            <p>Заметка исчезнет из карточки клиента без возможности восстановления.</p>
          </div>
        </div>
        <div className="ms-modal-actions">
          <Button
            variant="danger"
            disabled={deleting}
            onClick={() => void confirmDelete()}
          >
            {deleting ? "Удаление…" : "Удалить"}
          </Button>
          <Button
            variant="ghost"
            disabled={deleting}
            onClick={() => setDeleteOpen(false)}
          >
            Отмена
          </Button>
        </div>
      </Modal>
    </div>
  );
}
