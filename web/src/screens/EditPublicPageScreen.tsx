import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMe, saveMasterProfile } from "../api";
import avatarDemo from "../assets/cabinet/profile/avatar-demo.jpg";
import { useBackButton } from "../hooks/useBackButton";
import { useMainButton } from "../hooks/useMainButton";
import { useTelegram } from "../hooks/useTelegram";
import {
  loadMasterDraft,
  saveMasterDraft,
  SPECIALTIES,
  type MasterSpecialty,
} from "../lib/masterDraft";
import { cacheProfile } from "../lib/profileStorage";
import { loadPublicAbout, savePublicAbout } from "../lib/publicProfile";
import {
  BackIcon,
  Button,
  Chip,
  ChipGroup,
  Field,
  IconButton,
  Input,
  Textarea,
} from "../ui";

const ABOUT_PLACEHOLDER =
  "Создаю аккуратный маникюр с вниманием к деталям и комфорту каждого клиента.";

function CameraBadge() {
  return (
    <span className="ms-edit-cam" aria-hidden>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path
          d="M4.2 4.2 5 3h4l.8 1.2H11a1 1 0 0 1 1 1V10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5.2a1 1 0 0 1 1-1h1.2Z"
          stroke="#fff"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <circle cx="7" cy="7.2" r="1.8" stroke="#fff" strokeWidth="1.2" />
      </svg>
    </span>
  );
}

/** Figma — «Редактировать страницу» to the right of Public profile. */
export function EditPublicPageScreen() {
  const navigate = useNavigate();
  const { webApp } = useTelegram();
  const draft = loadMasterDraft();
  const [name, setName] = useState(draft.name);
  const [specialty, setSpecialty] = useState<MasterSpecialty | null>(
    draft.specialty,
  );
  const [about, setAbout] = useState(() => loadPublicAbout());
  const [city, setCity] = useState(draft.city || "Москва");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMe()
      .then((me) => {
        if (cancelled || !me.profile) return;
        cacheProfile(me.profile);
        setName(me.profile.name || draft.name);
        setSpecialty(
          (me.profile.specialty as MasterSpecialty | null) ?? draft.specialty,
        );
        setCity(me.profile.city || draft.city || "Москва");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [draft.city, draft.name, draft.specialty]);

  const goBack = useCallback(
    () => navigate("/cabinet/profile/public"),
    [navigate],
  );

  const onCancel = useCallback(() => {
    goBack();
  }, [goBack]);

  const onSave = useCallback(async () => {
    if (!name.trim() || !specialty || saving) return;
    setSaving(true);
    setError(null);
    try {
      const profile = await saveMasterProfile({
        name: name.trim(),
        specialty,
        city,
      });
      cacheProfile(profile);
      saveMasterDraft({
        ...loadMasterDraft(),
        name: name.trim(),
        specialty,
        city,
      });
      savePublicAbout(about.trim());
      webApp?.HapticFeedback?.notificationOccurred("success");
      navigate("/cabinet/profile/public", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }, [about, city, name, navigate, saving, specialty, webApp]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  const valid = Boolean(name.trim() && specialty);

  return (
    <div className="master-setup ms-cabinet ms-edit">
      <header className="ms-bd-toolbar">
        <IconButton label="Назад" onClick={goBack}>
          <BackIcon />
        </IconButton>
        <h1 className="ms-bd-toolbar-title">Редактировать страницу</h1>
        <span className="ms-cc-toolbar-spacer" aria-hidden />
      </header>

      <div className="ms-body ms-edit-body">
        <div className="ms-edit-photo">
          <button
            type="button"
            className="ms-edit-avatar-btn"
            aria-label="Изменить фото"
          >
            <img
              className="ms-edit-avatar"
              src={avatarDemo}
              width={80}
              height={80}
              alt=""
            />
            <CameraBadge />
          </button>
          <div className="ms-edit-photo-copy">
            <p className="ms-edit-photo-title">Фото мастера</p>
            <p className="ms-edit-photo-sub">
              Отображается на публичной странице
            </p>
          </div>
        </div>

        <Field label="Имя" as="label">
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="given-name"
          />
        </Field>

        <Field
          label="Основное направление"
          as="fieldset"
          className="ms-field-chips"
        >
          <ChipGroup label="Основное направление">
            {SPECIALTIES.map((s) => (
              <Chip
                key={s.id}
                active={specialty === s.id}
                onClick={() => setSpecialty(s.id)}
              >
                {s.label}
              </Chip>
            ))}
          </ChipGroup>
        </Field>

        <Field label="О мастере" as="label">
          <Textarea
            rows={4}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            placeholder={ABOUT_PLACEHOLDER}
          />
        </Field>

        {error ? <p className="ms-footer-error">{error}</p> : null}
      </div>

      <footer className="ms-footer ms-edit-footer">
        <div className="ms-footer-actions">
          <Button
            variant="primary"
            disabled={!valid || saving}
            onClick={() => void onSave()}
          >
            {saving ? "Сохранение…" : "Сохранить изменения"}
          </Button>
          <Button variant="secondary" disabled={saving} onClick={onCancel}>
            Отмена
          </Button>
        </div>
      </footer>
    </div>
  );
}
