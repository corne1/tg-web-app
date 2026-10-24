export type AppUser = {
  id: number;
  first_name: string;
  last_name?: string | null;
  username?: string | null;
  language_code?: string | null;
  is_premium?: boolean;
  photo_url?: string | null;
  created_at?: string;
  updated_at?: string;
  last_seen_at?: string;
};

const TOKEN_KEY = "tg_session";

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  const token = getStoredToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(path, { ...init, headers, credentials: "include" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function authenticate(initData: string): Promise<{
  token: string;
  user: AppUser;
}> {
  const data = await request<{ token: string; user: AppUser }>("/api/auth/telegram", {
    method: "POST",
    body: JSON.stringify({ initData }),
  });
  localStorage.setItem(TOKEN_KEY, data.token);
  return data;
}

export async function fetchMe(): Promise<AppUser> {
  const data = await request<{ user: AppUser }>("/api/me");
  return data.user;
}
