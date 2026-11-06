const DEFAULT_API_URL = "http://localhost:5000/api";

export function normalizeApiBaseUrl(configuredUrl) {
  const baseUrl =
    typeof configuredUrl === "string"
      ? configuredUrl.trim().replace(/\/+$/, "")
      : "";
  const resolvedUrl = baseUrl || DEFAULT_API_URL;

  return /\/api$/i.test(resolvedUrl) ? resolvedUrl : `${resolvedUrl}/api`;
}
