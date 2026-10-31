/**
 * Master reception place (onboarding step 4).
 * Stored as JSON on master_profiles.place_json.
 */

export type PlaceMode = "studio" | "visit" | "both";

export type AddressVisibility = "public" | "after_booking";

export type StudioPlace = {
  city: string;
  address: string;
  comment: string;
  addressVisibility: AddressVisibility;
};

export type VisitPlace = {
  city: string;
  /** Districts / travel areas (Figma «Районы выезда»). */
  areas: string;
};

export type MasterPlace = {
  mode: PlaceMode;
  studio: StudioPlace;
  visit: VisitPlace;
};

const emptyStudio = (): StudioPlace => ({
  city: "",
  address: "",
  comment: "",
  addressVisibility: "public",
});

const emptyVisit = (): VisitPlace => ({
  city: "",
  areas: "",
});

export function emptyMasterPlace(mode: PlaceMode = "studio"): MasterPlace {
  return {
    mode,
    studio: emptyStudio(),
    visit: emptyVisit(),
  };
}

function asVisibility(raw: unknown): AddressVisibility {
  return raw === "after_booking" ? "after_booking" : "public";
}

function asMode(raw: unknown): PlaceMode | null {
  if (raw === "studio" || raw === "visit" || raw === "both") return raw;
  return null;
}

export function parsePlaceJson(raw: string | null | undefined): MasterPlace | null {
  if (raw == null || raw === "") return null;
  try {
    const parsed = JSON.parse(raw) as Partial<MasterPlace>;
    const mode = asMode(parsed.mode);
    if (!mode) return null;
    const studioRaw = (parsed.studio ?? {}) as Partial<StudioPlace>;
    const visitRaw = (parsed.visit ?? {}) as Partial<VisitPlace>;
    return {
      mode,
      studio: {
        city: String(studioRaw.city ?? "").trim(),
        address: String(studioRaw.address ?? "").trim(),
        comment: String(studioRaw.comment ?? "").trim(),
        addressVisibility: asVisibility(studioRaw.addressVisibility),
      },
      visit: {
        city: String(visitRaw.city ?? "").trim(),
        areas: String(visitRaw.areas ?? "").trim(),
      },
    };
  } catch {
    return null;
  }
}

export function normalizeMasterPlace(input: unknown): MasterPlace | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<MasterPlace> & {
    studioPlace?: Partial<StudioPlace>;
    visitPlace?: Partial<VisitPlace> & { comment?: string };
    placeMode?: unknown;
  };
  const mode = asMode(raw.mode ?? raw.placeMode);
  if (!mode) return null;

  const studioSrc = (raw.studio ?? raw.studioPlace ?? {}) as Partial<StudioPlace>;
  const visitSrc = (raw.visit ?? raw.visitPlace ?? {}) as Partial<VisitPlace> & {
    comment?: string;
  };

  return {
    mode,
    studio: {
      city: String(studioSrc.city ?? "").trim(),
      address: String(studioSrc.address ?? "").trim(),
      comment: String(studioSrc.comment ?? "").trim(),
      addressVisibility: asVisibility(studioSrc.addressVisibility),
    },
    visit: {
      city: String(visitSrc.city ?? "").trim(),
      areas: String(visitSrc.areas ?? visitSrc.comment ?? "").trim(),
    },
  };
}

export function needsStudio(mode: PlaceMode): boolean {
  return mode === "studio" || mode === "both";
}

export function needsVisit(mode: PlaceMode): boolean {
  return mode === "visit" || mode === "both";
}

export function isMasterPlaceValid(place: MasterPlace): boolean {
  if (needsStudio(place.mode)) {
    if (!place.studio.city || !place.studio.address) return false;
  }
  if (needsVisit(place.mode)) {
    if (!place.visit.city) return false;
  }
  return true;
}

/** Primary city for profile.city / client-facing summary. */
export function primaryCityFromPlace(place: MasterPlace): string | null {
  if (needsStudio(place.mode) && place.studio.city) return place.studio.city;
  if (needsVisit(place.mode) && place.visit.city) return place.visit.city;
  return null;
}
