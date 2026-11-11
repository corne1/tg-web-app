import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ClientFlowShell } from "../../components/client/ClientFlowShell";
import { MsArrowRight } from "../../components/master/MsArrowRight";
import { useBackButton } from "../../hooks/useBackButton";
import { useMainButton } from "../../hooks/useMainButton";
import {
  needsClientPlaceStep,
  patchClientDraft,
  readClientDraft,
} from "../../lib/clientBookingDraft";
import { Field, Input, Textarea, cx } from "../../ui";

export function ClientAddressScreen() {
  const { masterId: masterKey = "" } = useParams();
  const navigate = useNavigate();
  const initial = readClientDraft();
  const [visitCity, setVisitCity] = useState(initial.visitCity);
  const [visitArea, setVisitArea] = useState(initial.visitArea);
  const [visitAddress, setVisitAddress] = useState(initial.visitAddress);
  const [visitApt, setVisitApt] = useState(initial.visitApt);
  const [visitEntrance, setVisitEntrance] = useState(initial.visitEntrance);
  const [visitFloor, setVisitFloor] = useState(initial.visitFloor);
  const [visitIntercom, setVisitIntercom] = useState(initial.visitIntercom);
  const [visitNote, setVisitNote] = useState(initial.visitNote);

  useEffect(() => {
    const d = readClientDraft();
    if (d.placeChoice !== "visit") {
      navigate(`/client/${encodeURIComponent(masterKey)}/services`, {
        replace: true,
      });
    }
  }, [masterKey, navigate]);

  const goBack = useCallback(() => {
    if (needsClientPlaceStep(readClientDraft().place)) {
      navigate(`/client/${encodeURIComponent(masterKey)}/place`);
      return;
    }
    navigate(`/client/${encodeURIComponent(masterKey)}/services`);
  }, [masterKey, navigate]);

  const canContinue = Boolean(
    visitCity.trim() && visitAddress.trim(),
  );

  const continueNext = useCallback(() => {
    if (!canContinue) return;
    patchClientDraft({
      visitCity: visitCity.trim(),
      visitArea: visitArea.trim(),
      visitAddress: visitAddress.trim(),
      visitApt: visitApt.trim(),
      visitEntrance: visitEntrance.trim(),
      visitFloor: visitFloor.trim(),
      visitIntercom: visitIntercom.trim(),
      visitNote: visitNote.trim(),
    });
    navigate(`/client/${encodeURIComponent(masterKey)}/time`);
  }, [
    canContinue,
    masterKey,
    navigate,
    visitAddress,
    visitApt,
    visitArea,
    visitCity,
    visitEntrance,
    visitFloor,
    visitIntercom,
    visitNote,
  ]);

  useBackButton(goBack);
  useMainButton({ text: "", visible: false, onClick: () => undefined });

  return (
    <ClientFlowShell
      title="Адрес клиента"
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
          <h2 className="ms-nb-title">Куда приехать?</h2>
          <p className="ms-nb-lead">
            Укажите адрес. Мастер увидит его после подтверждения записи
          </p>
        </div>
        <div className="ms-client-form">
          <Field label="Город" as="label">
            <Input
              value={visitCity}
              onChange={(e) => setVisitCity(e.target.value)}
              placeholder="Москва"
              autoComplete="address-level2"
            />
          </Field>
          <Field label="Улица и дом" as="label">
            <Input
              value={visitAddress}
              onChange={(e) => setVisitAddress(e.target.value)}
              placeholder="Тверская, 12"
              autoComplete="street-address"
            />
          </Field>
          <Field label="Район" as="label">
            <Input
              value={visitArea}
              onChange={(e) => setVisitArea(e.target.value)}
              placeholder="Тверской"
            />
          </Field>
          <div className="ms-client-form-row">
            <Field label="Квартира / офис" as="label">
              <Input
                value={visitApt}
                onChange={(e) => setVisitApt(e.target.value)}
                placeholder="42"
              />
            </Field>
            <Field label="Подъезд" as="label">
              <Input
                value={visitEntrance}
                onChange={(e) => setVisitEntrance(e.target.value)}
                placeholder="2"
              />
            </Field>
          </div>
          <div className="ms-client-form-row">
            <Field label="Этаж" as="label">
              <Input
                value={visitFloor}
                onChange={(e) => setVisitFloor(e.target.value)}
                placeholder="5"
              />
            </Field>
            <Field label="Домофон" as="label">
              <Input
                value={visitIntercom}
                onChange={(e) => setVisitIntercom(e.target.value)}
                placeholder="42"
              />
            </Field>
          </div>
          <Field label="Комментарий к адресу" as="label">
            <Textarea
              value={visitNote}
              onChange={(e) => setVisitNote(e.target.value)}
              placeholder="Как пройти, код калитки…"
              rows={3}
            />
          </Field>
        </div>
      </div>
    </ClientFlowShell>
  );
}
