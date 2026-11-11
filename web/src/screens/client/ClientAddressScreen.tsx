import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { suggestAddresses, type AddressHit } from "../../api";
import { ClientFlowShell } from "../../components/client/ClientFlowShell";
import { MsArrowRight } from "../../components/master/MsArrowRight";
import { useBackButton } from "../../hooks/useBackButton";
import { useCitySearch } from "../../hooks/useCitySearch";
import { useMainButton } from "../../hooks/useMainButton";
import {
  needsClientPlaceStep,
  patchClientDraft,
  readClientDraft,
} from "../../lib/clientBookingDraft";
import { Field, Input, Textarea, cx } from "../../ui";

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

export function ClientAddressScreen() {
  const { masterId: masterKey = "" } = useParams();
  const navigate = useNavigate();
  const initial = readClientDraft();
  const visitZones = initial.place?.visit?.areas ?? "";
  const [visitCity, setVisitCity] = useState(
    () => initial.visitCity || initial.place?.visit?.city || "",
  );
  const [visitArea, setVisitArea] = useState(initial.visitArea);
  const [visitAddress, setVisitAddress] = useState(initial.visitAddress);
  const [visitApt, setVisitApt] = useState(initial.visitApt);
  const [visitEntrance, setVisitEntrance] = useState(initial.visitEntrance);
  const [visitFloor, setVisitFloor] = useState(initial.visitFloor);
  const [visitIntercom, setVisitIntercom] = useState(initial.visitIntercom);
  const [visitNote, setVisitNote] = useState(initial.visitNote);
  const [cityOpen, setCityOpen] = useState(false);
  const [addrOpen, setAddrOpen] = useState(false);
  const [addrHits, setAddrHits] = useState<AddressHit[]>([]);
  const [zoneError, setZoneError] = useState<string | null>(null);

  const { suggestions: cityHits, commitQuery } = useCitySearch(
    cityOpen,
    visitCity,
    8,
  );

  useEffect(() => {
    const d = readClientDraft();
    if (d.placeChoice !== "visit") {
      navigate(`/client/${encodeURIComponent(masterKey)}/services`, {
        replace: true,
      });
    }
  }, [masterKey, navigate]);

  useEffect(() => {
    if (!addrOpen) {
      setAddrHits([]);
      return;
    }
    const q = [visitCity, visitAddress].filter(Boolean).join(", ").trim();
    if (q.length < 3) {
      setAddrHits([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void suggestAddresses(q, 6).then((hits) => {
        if (!cancelled) setAddrHits(hits);
      });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [addrOpen, visitAddress, visitCity]);

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
    visitCity.trim() && visitAddress.trim() && inZone,
  );

  useEffect(() => {
    if (!visitCity.trim() && !visitArea.trim()) {
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
  }, [inZone, visitArea, visitCity, visitZones]);

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
              onChange={(e) => {
                setVisitCity(e.target.value);
                setCityOpen(true);
              }}
              onFocus={() => setCityOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setCityOpen(false), 150);
                void commitQuery(visitCity).then((city) => {
                  if (city) setVisitCity(city);
                });
              }}
              placeholder="Москва"
              autoComplete="address-level2"
            />
          </Field>
          {cityOpen && cityHits.length > 0 ? (
            <ul className="ms-city-suggest" role="listbox">
              {cityHits.map((hit) => (
                <li key={`${hit.name}-${hit.region ?? ""}`}>
                  <button
                    type="button"
                    className="ms-city-suggest-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setVisitCity(hit.name);
                      setCityOpen(false);
                    }}
                  >
                    <span className="ms-city-suggest-text">
                      <span className="ms-city-suggest-name">{hit.name}</span>
                      {hit.region ? (
                        <span className="ms-city-suggest-region">
                          {hit.region}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <Field label="Улица и дом" as="label">
            <Input
              value={visitAddress}
              onChange={(e) => {
                setVisitAddress(e.target.value);
                setAddrOpen(true);
              }}
              onFocus={() => setAddrOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setAddrOpen(false), 150);
              }}
              placeholder="Тверская, 12"
              autoComplete="street-address"
            />
          </Field>
          {addrOpen && addrHits.length > 0 ? (
            <ul className="ms-city-suggest" role="listbox">
              {addrHits.map((hit) => (
                <li key={hit.label}>
                  <button
                    type="button"
                    className="ms-city-suggest-item"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      if (hit.city) setVisitCity(hit.city);
                      const line = [hit.street, hit.house]
                        .filter(Boolean)
                        .join(", ");
                      setVisitAddress(line || hit.label);
                      setAddrOpen(false);
                    }}
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
          {visitZones ? (
            <p className="ms-client-muted ms-client-zone-note">
              Зона выезда: {visitZones}
            </p>
          ) : null}

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
