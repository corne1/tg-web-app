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
  return {
    user_id: Number(row.user_id),
    slug: String(row.slug),
    name: String(row.name ?? ""),
    specialty: row.specialty != null ? String(row.specialty) : null,
    city: String(row.city ?? "Москва"),
    duration: Number(row.duration) as 50 | 60,
    price: Number(row.price),
    schedule: String(row.schedule) as ScheduleKind,
    timezone: String(row.timezone),
    cancel_hours: Number(row.cancel_hours),
    status,
    onboarding_step: Number(row.onboarding_step ?? 1),
    onboarding_completed_at:
      row.onboarding_completed_at != null
        ? String(row.onboarding_completed_at)
        : null,
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
  duration?: 50 | 60;
  price?: number;
  schedule?: ScheduleKind;
  timezone?: string;
  cancelHours?: number;
  specialty?: string | null;
  city?: string;
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
    const duration = input.duration ?? prev?.duration ?? 60;
    const price = input.price ?? prev?.price ?? 0;
    const schedule = input.schedule ?? prev?.schedule ?? "weekday";
    const timezone = input.timezone ?? prev?.timezone ?? "Europe/Moscow";
    const cancelHours = input.cancelHours ?? prev?.cancel_hours ?? 24;
    const specialty =
      input.specialty !== undefined ? input.specialty : (prev?.specialty ?? null);
    const city = input.city ?? prev?.city ?? "Москва";
    const slug = prev?.slug ?? defaultSlug(input.userId);

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

    // Never reopen completed onboarding into a fresh draft by accident.
    if (prev?.status === "active" && prev.onboarding_completed_at) {
      status = "active";
      onboardingCompletedAt = prev.onboarding_completed_at;
      onboardingStep = Math.max(onboardingStep, 4);
    }

    const createdAt = prev?.created_at ?? now;

    await db.execute({
      sql: `INSERT INTO master_profiles (
        user_id, slug, name, specialty, city, duration, price, schedule,
        timezone, cancel_hours, status, onboarding_step, onboarding_completed_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        name = excluded.name,
        specialty = excluded.specialty,
        city = excluded.city,
        duration = excluded.duration,
        price = excluded.price,
        schedule = excluded.schedule,
        timezone = excluded.timezone,
        cancel_hours = excluded.cancel_hours,
        status = excluded.status,
        onboarding_step = excluded.onboarding_step,
        onboarding_completed_at = excluded.onboarding_completed_at,
        updated_at = excluded.updated_at`,
      args: [
        input.userId,
        slug,
        name,
        specialty,
        city,
        duration,
        price,
        schedule,
        timezone,
        cancelHours,
        status,
        onboardingStep,
        onboardingCompletedAt,
        createdAt,
        now,
      ],
    });

    return {
      user_id: input.userId,
      slug,
      name,
      specialty,
      city,
      duration,
      price,
      schedule,
      timezone,
      cancel_hours: cancelHours,
      status,
      onboarding_step: onboardingStep,
      onboarding_completed_at: onboardingCompletedAt,
      created_at: createdAt,
      updated_at: now,
    };
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
      sql: "SELECT * FROM master_profiles WHERE slug = ? AND status = 'active'",
      args: [slug],
    });
    const row = result.rows[0];
    return row ? mapProfile(row as unknown as Record<string, unknown>) : null;
  });
}

export async function markOnboardingComplete(
  userId: number,
): Promise<MasterProfileRow | null> {
  const profile = await getProfile(userId);
  if (!profile) return null;
  return upsertProfile({
    userId,
    name: profile.name,
    onboardingComplete: true,
    onboardingStep: 4,
    status: "active",
  });
}

export async function setOnboardingStep(
  userId: number,
  step: number,
): Promise<MasterProfileRow | null> {
  const profile = await getProfile(userId);
  if (!profile) return null;
  if (profile.status === "active" && profile.onboarding_completed_at) {
    return profile;
  }
  return upsertProfile({
    userId,
    name: profile.name,
    onboardingStep: Math.min(4, Math.max(1, step)),
    status: "draft",
  });
}
