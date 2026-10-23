export type ActionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  rowErrors?: { row: number; message: string }[];
  created?: number;
  /** Başarılı kayıttan sonra yönlendirilecek adres */
  redirectTo?: string;
  stamp?: number;
  token?: string;
  prefix?: string;
  payload?: string;
  filename?: string;
};

export const EMPTY_STATE: ActionState = { ok: false };

export const SAVED_MESSAGE = "İşlem yapıldı.";

export function saved(redirectTo?: string, message = SAVED_MESSAGE): ActionState {
  return { ok: true, message, redirectTo, stamp: Date.now() };
}

export function isNextRedirect(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const digest = "digest" in error ? String((error as { digest?: unknown }).digest ?? "") : "";
  const message = error instanceof Error ? error.message : String(error);
  return (
    digest.startsWith("NEXT_REDIRECT") ||
    digest.startsWith("NEXT_HTTP_ERROR_FALLBACK") ||
    message.includes("NEXT_REDIRECT") ||
    message.includes("NEXT_HTTP_ERROR_FALLBACK")
  );
}

export function fail(error: unknown, fallback = "Kayıt hatası"): ActionState {
  if (isNextRedirect(error)) throw error;
  const message = error instanceof Error ? error.message : fallback;
  if (isNextRedirect({ message, digest: message })) throw error;
  const leaked = /prisma|sqlite|constraint|ECONN|ENOENT|SQLITE|Cannot read|undefined/i.test(message);
  return { ok: false, message: leaked ? fallback : message, stamp: Date.now() };
}
