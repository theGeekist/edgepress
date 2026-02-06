export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
  };
};

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (!v.error || typeof v.error !== "object") return false;
  const e = v.error as Record<string, unknown>;
  return typeof e.code === "string" && typeof e.message === "string";
}
