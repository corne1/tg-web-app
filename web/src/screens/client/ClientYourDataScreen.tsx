import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClientFlowShell } from "../../components/client/ClientFlowShell";
import { MsArrowRight } from "../../components/master/MsArrowRight";
import { useBackButton } from "../../hooks/useBackButton";
import { useMainButton } from "../../hooks/useMainButton";
import { useTelegram } from "../../hooks/useTelegram";
import { patchClientDraft, readClientDraft } from "../../lib/clientBookingDraft";
import { Field, Input, Textarea, cx } from "../../ui";

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
      title="Ваши данные"
      onBack={goBack}
      footer={
        <button
          type="button"
          className={cx("ms-btn", "ms-btn-primary", "ms-nb-continue")}
          disabled={!canContinue}
          onClick={continueNext}
        >
          <span>Продолжить</span>
          <MsArrowRight />
        </button>
      }
    >
      <div className="ms-nb">
        <div className="ms-nb-intro">
          <h2 className="ms-nb-title">Как к вам обращаться?</h2>
          <p className="ms-nb-lead">
            Имя можно изменить. Телефон и email не запрашиваем
          </p>
        </div>
        <div className="ms-client-form">
          <Field label="Имя" as="label">
            <Input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Анна"
              autoComplete="name"
            />
          </Field>
          <Field label="Комментарий к записи" as="label">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Пожелания, детали…"
              rows={3}
            />
          </Field>
        </div>
      </div>
    </ClientFlowShell>
  );
}
