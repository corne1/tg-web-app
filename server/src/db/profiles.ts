import {
  parsePlaceJson,
  type MasterPlace,
} from "../lib/place.js";
import {
  normalizeWorkingHours,
  parseWorkingHoursJson,
  scheduleKindFromHours,
  type WorkingHours,
} from "../lib/workingHours.js";
import { withDb } from "./client.js";
import type {
  MasterProfileRow,
  MasterProfileStatus,
  ScheduleKind,
} from "./types.js";

function mapProfile(row: Record<string, unknown>): MasterProfileRow {
  const statusRaw = String(row.status ?? "draft");
  const status: MasterProfileStatus =
    statusRaw === "active" ? "active" : "draft";
  const workingHours = parseWorkingHoursJson(
    row.working_hours_json != null ? String(row.working_hours_json) : null,
  );
  const place = parsePlaceJson(
    row.place_json != null ? String(row.place_json) : null,
  );
  const dayBreakRaw = row.day_break_min;
  const dayBreakMin =
    dayBreakRaw == null || dayBreakRaw === ""
      ? null
      : Number(dayBreakRaw);
  return {
    user_id: Number(row.user_id),
    slug: String(row.slug),
    name: String(row.name ?? ""),
    service_type_code:
      row.service_type_code != null ? String(row.service_type_code) : null,
    city: String(row.city ?? "Москва"),
    schedule: String(row.schedule) as ScheduleKind,
    working_hours: workingHours,
    day_break_min:
      dayBreakMin != null && Number.isFinite(dayBreakMin) ? dayBreakMin : null,
    travel_buffer_min: (() => {
      const raw = row.travel_buffer_min;
      if (raw == null || raw === "") return null;
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? n : null;
    })(),
    place,
    timezone: String(row.timezone),
    cancel_hours: Number(row.cancel_hours),
    status,
    onboarding_step: Number(row.onboarding_step ?? 1),
    onboarding_completed_at:
      row.onboarding_completed_at != null
        ? String(row.onboarding_completed_at)
        : null,
    avatar_url: row.avatar_url != null ? String(row.avatar_url) : null,
    about_text: row.about_text != null ? String(row.about_text) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export function defaultSlug(userId: number): string {
  return `m${userId}`;
}

export type UpsertProfileInput = {
  userId: number;
  name?: string;
  schedule?: ScheduleKind;
  workingHours?: WorkingHours | null;
  dayBreakMin?: number | null;
  travelBufferMin?: number | null;
  place?: MasterPlace | null;
  timezone?: string;
  cancelHours?: number;
  serviceTypeCode?: string | null;
  city?: string;
  aboutText?: string | null;
  status?: MasterProfileStatus;
  onboardingStep?: number;
  onboardingComplete?: boolean;
};

/** Create draft master profile for this Telegram user if missing. */
export async function ensureMasterProfile(
  userId: number,
  fallbackName = "",
): Promise<MasterProfileRow> {
  const existing = await getProfile(userId);
  if (existing) return existing;
  return upsertProfile({
    userId,
    name: fallbackName || "Мастер",
    status: "draft",
    onboardingStep: 1,
  });
}

export async function getProfile(
  userId: number,
): Promise<MasterProfileRow | null> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: "SELECT * FROM master_profiles WHERE user_id = ?",
      args: [userId],
    });
    const row = result.rows[0];
    return row ? mapProfile(row as unknown as Record<string, unknown>) : null;
  });
}

export async function getProfileBySlug(
  slug: string,
): Promise<MasterProfileRow | null> {
  return withDb(async (db) => {
    const result = await db.execute({
      sql: "SELECT * FROM master_profiles WHERE slug = ?",
      args: [slug],
    });
    const row = result.rows[0];
    return row ? mapProfile(row as unknown as Record<string, unknown>) : null;
  });
}

export async function upsertProfile(
  input: UpsertProfileInput,
): Promise<MasterProfileRow> {
  return withDb(async (db) => {
    const now = new Date().toISOString();
    const existing = await db.execute({
      sql: "SELECT * FROM master_profiles WHERE user_id = ?",
      args: [input.userId],
    });
    const prev = existing.rows[0]
      ? mapProfile(existing.rows[0] as unknown as Record<string, unknown>)
      : null;

    const name = (input.name ?? prev?.name ?? "").trim() || "Мастер";
    const timezone = input.timezone ?? prev?.timezone ?? "Europe/Moscow";
    const cancelHours = input.cancelHours ?? prev?.cancel_hours ?? 24;

    let serviceTypeCode =
      input.serviceTypeCode !== undefined
        ? input.serviceTypeCode
        : (prev?.service_type_code ?? null);
    if (serviceTypeCode) {
      const st = await db.execute({
        sql: `SELECT code FROM service_types
          WHERE code = ? AND is_active = 1`,
        args: [serviceTypeCode],
      });
      if (!st.rows[0]) {
        throw new Error(`Unknown service type: ${serviceTypeCode}`);
      }
    }

    const city = input.city ?? prev?.city ?? "Москва";
    const slug = prev?.slug ?? defaultSlug(input.userId);

    let workingHours =
      input.workingHours !== undefined
        ? input.workingHours
        : (prev?.working_hours ?? null);
    if (workingHours) {
      workingHours = normalizeWorkingHours(workingHours);
    }

    let dayBreakMin =
      input.dayBreakMin !== undefined
        ? input.dayBreakMin
        : (prev?.day_break_min ?? null);
    if (dayBreakMin != null && (!Number.isFinite(dayBreakMin) || dayBreakMin < 0)) {
      dayBreakMin = null;
    }

    let travelBufferMin =
      input.travelBufferMin !== undefined
        ? input.travelBufferMin
        : (prev?.travel_buffer_min ?? null);
    if (
      travelBufferMin != null &&
      (!Number.isFinite(travelBufferMin) ||
        travelBufferMin < 0 ||
        travelBufferMin > 240)
    ) {
      travelBufferMin = null;
    }

    const place =
      input.place !== undefined ? input.place : (prev?.place ?? null);

    const aboutText =
      input.aboutText !== undefined
        ? input.aboutText?.trim() || null
        : (prev?.about_text ?? null);

    let schedule: ScheduleKind =
      input.schedule ?? prev?.schedule ?? "weekday";
    if (workingHours) {
      schedule = scheduleKindFromHours(workingHours) ?? schedule;
    }

    let status: MasterProfileStatus = input.status ?? prev?.status ?? "draft";
    let onboardingStep =
      input.onboardingStep ?? prev?.onboarding_step ?? 1;
    let onboardingCompletedAt = prev?.onboarding_completed_at ?? null;

    if (input.onboardingComplete === true) {
      status = "active";
      onboardingStep = Math.max(onboardingStep, 4);
      onboardingCompletedAt = onboardingCompletedAt ?? now;
    } else if (input.onboardingComplete === false) {
      status = "draft";
      onboardingCompletedAt = null;
    }

    if (prev?.status === "active" && prev.onboarding_completed_at) {
      status = "active";
      onboardingCompletedAt = prev.onboarding_completed_at;
      onboardingStep = Math.max(onboardingStep, 4);
    }

    const createdAt = prev?.created_at ?? now;
    const workingHoursJson = workingHours
      ? JSON.stringify(workingHours)
      : null;
    const placeJson = place ? JSON.stringify(place) : null;

    await db.execute({
      sql: `INSERT INTO master_profiles (
        user_id, slug, name, service_type_code, city, schedule,
        working_hours_json, day_break_min, travel_buffer_min, place_json,
        timezone, cancel_hours, status, onboarding_step, onboarding_completed_at,
        about_text, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        name = excluded.name,
        service_type_code = excluded.service_type_code,
        city = excluded.city,
        schedule = excluded.schedule,
        working_hours_json = excluded.working_hours_json,
        day_break_min = excluded.day_break_min,
        travel_buffer_min = excluded.travel_buffer_min,
        place_json = excluded.place_json,
        timezone = excluded.timezone,
        cancel_hours = excluded.cancel_hours,
        status = excluded.status,
        onboarding_step = excluded.onboarding_step,
        onboarding_completed_at = excluded.onboarding_completed_at,
        about_text = excluded.about_text,
        updated_at = excluded.updated_at`,
      args: [
        input.userId,
        slug,
        name,
        serviceTypeCode,
        city,
        schedule,
        workingHoursJson,
        dayBreakMin,
        travelBufferMin,
        placeJson,
        timezone,
        cancelHours,
        status,
        onboardingStep,
        onboardingCompletedAt,
        aboutText,
        createdAt,
        now,
      ],
    });

    return {
      user_id: input.userId,
      slug,
      name,
      service_type_code: serviceTypeCode,
      city,
      schedule,
      working_hours: workingHours,
      day_break_min: dayBreakMin,
      travel_buffer_min: travelBufferMin,
      place,
      timezone,
      cancel_hours: cancelHours,
      status,
      onboarding_step: onboardingStep,
      onboarding_completed_at: onboardingCompletedAt,
      avatar_url: prev?.avatar_url ?? null,
      about_text: aboutText,
      created_at: createdAt,
      updated_at: now,
    };
  });
}

const MAX_AVATAR_URL_LEN = 400_000;

export async function setMasterAvatarUrl(
  userId: number,
  avatarUrl: string | null,
): Promise<MasterProfileRow | null> {
  return withDb(async (db) => {
    const existing = await db.execute({
      sql: "SELECT * FROM master_profiles WHERE user_id = ?",
      args: [userId],
    });
    const row = existing.rows[0];
    if (!row) return null;
    const prev = mapProfile(row as unknown as Record<string, unknown>);
    if (avatarUrl != null && avatarUrl.length > MAX_AVATAR_URL_LEN) {
      throw new Error("Avatar too large");
    }
    const now = new Date().toISOString();
    await db.execute({
      sql: `UPDATE master_profiles SET avatar_url = ?, updated_at = ? WHERE user_id = ?`,
      args: [avatarUrl, now, userId],
    });
    return { ...prev, avatar_url: avatarUrl, updated_at: now };
  });
}

export async function setOnboardingStep(
  userId: number,
  step: number,
): Promise<MasterProfileRow | null> {
  return withDb(async (db) => {
    const existing = await getProfile(userId);
    if (!existing) return null;
    return upsertProfile({
      userId,
      onboardingStep: Math.max(1, Math.floor(step)),
    });
  });
}

export async function markOnboardingComplete(
  userId: number,
): Promise<MasterProfileRow | null> {
  const existing = await getProfile(userId);
  if (!existing) return null;
  return upsertProfile({
    userId,
    onboardingComplete: true,
  });
}
