import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

const SUPABASE_URL = `https://${projectId}.supabase.co`;

/* ─── Singleton Supabase client ─── */
let _instance: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_instance) _instance = createClient(SUPABASE_URL, publicAnonKey);
  return _instance;
}
export const supabase = getSupabase();

export const API_BASE = `${SUPABASE_URL}/functions/v1/make-server-36da3eb1`;

/* ─── Fire-and-forget warm-up ping ─── */
let warmupPromise: Promise<void> | null = null;

export function warmApiConnection(): Promise<void> {
  if (!warmupPromise) {
    warmupPromise = fetch(`${API_BASE}/health`, {
      method: "GET",
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    }).then(() => undefined).catch(() => undefined);
  }

  return warmupPromise;
}

/* ─── Session / token cache ─── */
let _cachedToken: string | null = null;
let _sessionReady = false;

const _sessionPromise = new Promise<void>((resolve) => {
  supabase.auth.onAuthStateChange((_event, session) => {
    _cachedToken = session?.access_token ?? null;
    if (!_sessionReady) { _sessionReady = true; resolve(); }
  });
  setTimeout(() => { if (!_sessionReady) { _sessionReady = true; resolve(); } }, 2000);
});

export async function getAccessToken(): Promise<string | null> {
  if (!_sessionReady) await _sessionPromise;
  if (_cachedToken) return _cachedToken;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) { _cachedToken = session.access_token; return _cachedToken; }
  } catch {}
  return null;
}

/* ─── Global 401 / session-expired event ─── */
const AUTH_EXPIRED_EVENT = "capstoneph:auth-expired";

export function onAuthExpired(callback: () => void): () => void {
  window.addEventListener(AUTH_EXPIRED_EVENT, callback);
  return () => window.removeEventListener(AUTH_EXPIRED_EVENT, callback);
}

function fireAuthExpired() {
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
}

/* ─── Simple fetch helper ─── */
export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const token = accessToken ?? (await getAccessToken());

  // When body is FormData, don't set Content-Type — browser sets multipart boundary automatically
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers as Record<string, string> || {}),
    Authorization: `Bearer ${publicAnonKey}`,
  };
  if (token) headers["X-User-Token"] = token;

  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
      clearTimeout(tid);

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await res.text();
        if (!res.ok) throw new Error(`[${res.status}] ${path}: ${text.slice(0, 200)}`);
        return text as unknown as T;
      }

      const data = await res.json();

      if (!res.ok) {
        // 401 → refresh token once then retry
        if (res.status === 401 && attempt === 0 && !accessToken) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token && session.access_token !== token) {
              _cachedToken = session.access_token;
              headers["X-User-Token"] = session.access_token;
              continue;
            }
          } catch {}
        }
        // 401 after refresh attempt → session is truly expired
        if (res.status === 401 && attempt > 0) {
          _cachedToken = null;
          fireAuthExpired();
          throw new Error("Session expired. Please sign in again.");
        }
        // 4xx (except 408/429) — don't retry
        if (res.status >= 400 && res.status < 500 && res.status !== 408 && res.status !== 429) {
          if (res.status === 401) {
            _cachedToken = null;
            fireAuthExpired();
            throw new Error("Session expired. Please sign in again.");
          }
          throw new Error(data.error || `Request failed [${res.status}]`);
        }
        lastError = new Error(data.error || `Request failed [${res.status}]`);
      } else {
        return data as T;
      }
    } catch (err: any) {
      lastError = err;
      // Non-retryable client errors
      if (err?.name !== "AbortError" && err?.message?.includes("Request failed")) throw err;
      if (err?.message?.includes("Session expired")) throw err;
    }

    // Silent backoff before retry
    if (attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  throw lastError;
}

/* ─── Bootstrap helper ─── */
export interface BootstrapData {
  context: {
    profile: any;
    myGroup: any;
    myDefense: any;
    assignedGroups: any[];
    advisedGroups: any[];
  };
  announcements: any[];
  deadlines: any[];
  notifications: any[];
  timeline: any[];
}

export async function fetchBootstrap(): Promise<BootstrapData> {
  return apiFetch<BootstrapData>("/me/bootstrap");
}
