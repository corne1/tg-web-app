import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import infoIcon from "../../assets/onboarding/info.svg";
import { suggestAddresses, type AddressHit } from "../../api";
import { ClientFlowShell } from "../../components/client/ClientFlowShell";
import { MsArrowRight } from "../../components/master/MsArrowRight";
import { IconSearch } from "../../components/settings/PlaceSettingsParts";
import { useBackButton } from "../../hooks/useBackButton";
import { useMainButton } from "../../hooks/useMainButton";
import {
  needsClientPlaceStep,
  patchClientDraft,
  readClientDraft,
} from "../../lib/clientBookingDraft";
import { Field, Input, Textarea, TEXTAREA_MAX_LEN, cx } from "../../ui";

function areaAllowsVisit(
  areas: string,
  city: string,
  area: string,
): boolean {
  const hay = areas.trim().toLowerCase();
  if (!hay) return true;
  const needles = [city, area]
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (needles.length === 0) return true;
  return needles.some(
    (n) => hay.includes(n) || n.includes(hay.split(",")[0]!.trim()),
  );
}

function hitToQuery(hit: AddressHit): string {
  const streetHouse = [hit.street, hit.house].filter(Boolean).join(", ");
  if (hit.city && streetHouse) return `${hit.city}, ${streetHouse}`;
  return hit.label;
}

export function ClientAddressScreen() {
  const { masterId: masterKey = "" } = useParams();
  const navigate = useNavigate();
  const initial = readClientDraft();
  const visitZones = initial.place?.visit?.areas ?? "";

  const initialQuery = [initial.visitCity, initial.visitAddress]
    .filter(Boolean)
    .join(", ");

  const [query, setQuery] = useState(initialQuery);
  const [visitCity, setVisitCity] = useState(
    () => initial.visitCity || initial.place?.visit?.city || "",
  );
  const [visitArea] = useState(initial.visitArea);
  const [visitAddress, setVisitAddress] = useState(initial.visitAddress);
  const [visitApt, setVisitApt] = useState(initial.visitApt);
  const [visitEntrance, setVisitEntrance] = useState(initial.visitEntrance);
  const [visitFloor, setVisitFloor] = useState(initial.visitFloor);
  const [visitIntercom, setVisitIntercom] = useState(initial.visitIntercom);
  const [visitNote, setVisitNote] = useState(initial.visitNote);
  const [confirmed, setConfirmed] = useState(
    () => Boolean(initial.visitCity.trim() && initial.visitAddress.trim()),
  );
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [hits, setHits] = useState<AddressHit[]>([]);
  const [zoneError, setZoneError] = useState<string | null>(null);

  useEffect(() => {
    const d = readClientDraft();
    if (d.placeChoice !== "visit") {
      navigate(`/client/${encodeURIComponent(masterKey)}/services`, {
        replace: true,
      });
    }
  }, [masterKey, navigate]);

  useEffect(() => {
    if (!suggestOpen) {
      setHits([]);
      return;
    }
    const q = query.trim();
    if (q.length < 3) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void suggestAddresses(q, 6).then((list) => {
        if (!cancelled) setHits(list);
      });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [query, suggestOpen]);

  const goBack = useCallback(() => {
    if (needsClientPlaceStep(readClientDraft().place)) {
      navigate(`/client/${encodeURIComponent(masterKey)}/place`);
      return;
    }
    navigate(`/client/${encodeURIComponent(masterKey)}/services`);
  }, [masterKey, navigate]);

  const inZone = useMemo(
    () => areaAllowsVisit(visitZones, visitCity, visitArea),
    [visitArea, visitCity, visitZones],
  );

  const canContinue = Boolean(
    confirmed && visitCity.trim() && visitAddress.trim() && inZone,
  );

  useEffect(() => {
    if (!confirmed) {
      setZoneError(null);
      return;
    }
    setZoneError(
      inZone
        ? null
        : visitZones
          ? `Адрес вне зоны выезда мастера (${visitZones})`
          : null,
    );
  }, [confirmed, inZone, visitZones]);

  const applyHit = (hit: AddressHit) => {
    const city = hit.city?.trim() || visitCity;
    const line = [hit.street, hit.house].filter(Boolean).join(", ") || hit.label;
    setVisitCity(city);
    setVisitAddress(line);
    setQuery(hitToQuery({ ...hit, city, street: hit.street, house: hit.house }));
    setConfirmed(true);
    setSuggestOpen(false);
  };

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
      title="Адрес — выезд к клиенту"
      onBack={goBack}
      progressFilled={2}
      footer={
        <div className="ms-nb-footer">
          {!canContinue ? (
            <p className="ms-nb-footer-hint">
              {!confirmed
                ? "Выберите адрес из подсказок"
                : zoneError
                  ? zoneError
                  : "Укажите адрес в зоне выезда"}
            </p>
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
          <h2 className="ms-nb-title">Куда приедет мастер?</h2>
          <p className="ms-nb-lead">
            Выберите, где встретиться с мастером
          </p>
        </div>

        <div className="ms-info" role="note">
          <img
            src={infoIcon}
            alt=""
            className="ms-info-icon"
            width={20}
            height={20}
          />
          <div className="ms-info-copy">
            <p>
              Адрес будет доступен только мастеру. Он не отображается на
              публичной странице мастера.
            </p>
          </div>
        </div>

        <div className="ms-client-form">
          <Field label="Адрес" as="label">
            <div
              className={cx(
                "ms-input-affix",
                "ms-input-affix-prefix",
                "ms-city-input-wrap",
                suggestOpen && "is-open",
              )}
            >
              <span className="ms-affix ms-affix-icon" aria-hidden>
                <IconSearch />
              </span>
              <Input
                className="ms-input-search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setConfirmed(false);
                  setSuggestOpen(true);
                }}
                onFocus={() => setSuggestOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setSuggestOpen(false), 150);
                }}
                placeholder="Город, улица и дом"
                autoComplete="street-address"
              />
            </div>
          </Field>
          {suggestOpen && hits.length > 0 ? (
            <ul className="ms-city-suggest" role="listbox">
              {hits.map((hit) => (
                <li key={hit.label}>
                  <button
                    type="button"
                    className="ms-city-suggest-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyHit(hit)}
                  >
                    <span className="ms-city-suggest-text">
                      <span className="ms-city-suggest-name">{hit.label}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {zoneError ? <p className="ms-client-error">{zoneError}</p> : null}

          <p className="ms-client-form-section">Дополнительная информация</p>

          <Field label="Квартира / офис" as="label">
            <Input
              value={visitApt}
              onChange={(e) => setVisitApt(e.target.value)}
              placeholder="Например, 42"
            />
          </Field>
          <div className="ms-client-form-row">
            <Field label="Подъезд" as="label">
              <Input
                value={visitEntrance}
                onChange={(e) => setVisitEntrance(e.target.value)}
                placeholder="Например, 2"
              />
            </Field>
            <Field label="Этаж" as="label">
              <Input
                value={visitFloor}
                onChange={(e) => setVisitFloor(e.target.value)}
                placeholder="Например, 5"
              />
            </Field>
          </div>
          <Field label="Домофон" as="label">
            <Input
              value={visitIntercom}
              onChange={(e) => setVisitIntercom(e.target.value)}
              placeholder="Например, 42K"
            />
          </Field>
          <Field label="Дополнительные уточнения" as="label">
            <Textarea
              value={visitNote}
              onChange={(e) => setVisitNote(e.target.value)}
              placeholder="Как найти вход, ориентиры..."
              rows={3}
              maxLength={TEXTAREA_MAX_LEN}
            />
          </Field>
        </div>
      </div>
    </ClientFlowShell>
  );
}
