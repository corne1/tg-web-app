import { fetchMaster } from "../api";
import type { PublicMaster } from "../types";
import {
  hydrateFromPublicMaster,
  readClientDraft,
  writeClientDraft,
  type ClientBookingDraft,
} from "./clientBookingDraft";

export async function loadClientMaster(
  masterKey: string,
): Promise<{ master: PublicMaster; draft: ClientBookingDraft }> {
  const master = await fetchMaster(masterKey);
  const draft = hydrateFromPublicMaster(masterKey, master, readClientDraft());
  writeClientDraft(draft);
  return { master, draft };
}
