import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import infoIcon from "../../assets/cabinet/profile/info.svg";
import { ClientFlowShell } from "../../components/client/ClientFlowShell";
import { MsArrowRight } from "../../components/master/MsArrowRight";
import { useBackButton } from "../../hooks/useBackButton";
import { useMainButton } from "../../hooks/useMainButton";
import { useTelegram } from "../../hooks/useTelegram";
import { patchClientDraft, readClientDraft } from "../../lib/clientBookingDraft";
import { Field, Input, Textarea, TEXTAREA_MAX_LEN, cx } from "../../ui";

export function ClientYourDataScreen() {
  const { masterId: masterKey = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useTelegram();
  const draft = readClientDraft();

  const defaultName =
    draft.clientName ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    "";

  const [clientName, setClientName] = useState(defaultName);
  const [comment, setComment] = useState(draft.comment);

  useEffect(() => {
    const d = readClientDraft();
    if (!d.startsAt || d.serviceIds.length === 0) {
      navigate(`/client/${encodeURIComponent(masterKey)}/services`, {
        replace: true,
      });
    }
  }, [masterKey, navigate]);

  const goBack = useCallback(
    () => navigate(`/client/${encodeURIComponent(masterKey)}/time`),
    [masterKey, navigate],
  );

  const canContinue = Boolean(clientName.trim());

  const continueNext = useCallback(() => {
    if (!canContinue) return;
    patchClientDraft({
      clientName: clientName.trim(),
      comment: comment.trim(),
    });
    navigate(`/client/${encodeURIComponent(masterKey)}/confirm`);
  }, [canContinue, clientName, comment, masterKey, navigate]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <ClientFlowShell
      title="Проверьте свои данные"
      onBack={goBack}
      progressFilled={4}
      footer={
        <div className="ms-nb-footer">
          {!canContinue ? (
            <p className="ms-nb-footer-hint">Укажите имя</p>
          ) : null}
          <button
            type="button"
            className={cx("ms-btn", "ms-btn-primary", "ms-nb-continue")}
            disabled={!canContinue}
            onClick={continueNext}
          >
            <span>Продолжить</span>
            <MsArrowRight />
          </button>
        </div>
      }
    >
      <div className="ms-nb">
        <div className="ms-nb-intro">
          <h2 className="ms-nb-title">Как к вам обращаться?</h2>
          <p className="ms-nb-lead">
            Укажите имя, чтобы мастер знал, кого ждать
          </p>
        </div>
        {/* Figma 21467:30694 */}
        <div className="ms-client-form">
          <Field label="Ваше имя" as="label">
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Настя"
              autoComplete="name"
            />
            <span className="ms-field-hint">
              <img
                src={infoIcon}
                alt=""
                className="ms-field-hint-icon"
                width={16}
                height={16}
              />
              Имя из Telegram. Можно изменить.
            </span>
          </Field>
          <Field label="Комментарий мастеру" as="label">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Например, пожелания или важные уточнения"
              rows={3}
              maxLength={TEXTAREA_MAX_LEN}
              showCount={false}
            />
            <div className="ms-field-under">
              <span className="ms-field-hint">
                <img
                  src={infoIcon}
                  alt=""
                  className="ms-field-hint-icon"
                  width={16}
                  height={16}
                />
                Необязательно
              </span>
              <span className="ms-char-count" aria-live="polite">
                {Math.min(comment.length, TEXTAREA_MAX_LEN)}/{TEXTAREA_MAX_LEN}
              </span>
            </div>
          </Field>
        </div>
      </div>
    </ClientFlowShell>
  );
}
