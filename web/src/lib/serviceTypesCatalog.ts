import { fetchServiceTypes, type ServiceTypeDto } from "../api";

let cached: ServiceTypeDto[] | null = null;
let inflight: Promise<ServiceTypeDto[]> | null = null;

export function getCachedServiceTypes(): ServiceTypeDto[] {
  return cached ?? [];
}

export function specialtyMetaFromCatalog(
  code: string | null | undefined,
  catalog: ServiceTypeDto[] = getCachedServiceTypes(),
): ServiceTypeDto | null {
  if (!code) return null;
  return catalog.find((s) => s.code === code) ?? null;
}

export async function loadServiceTypes(
  force = false,
): Promise<ServiceTypeDto[]> {
  if (!force && cached) return cached;
  if (!force && inflight) return inflight;
  inflight = fetchServiceTypes()
    .then((list) => {
      cached = list;
      return cached;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}
