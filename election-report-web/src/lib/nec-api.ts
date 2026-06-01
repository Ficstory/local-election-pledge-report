type NecApiUrlOptions = {
  baseUrl: string;
  operation: string;
  serviceKey: string;
  params?: Record<string, string | number | boolean | undefined>;
};

export function getRequiredEnv(
  env: Record<string, string | undefined>,
  key: string
): string {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

export function buildNecApiUrl({
  baseUrl,
  operation,
  serviceKey,
  params = {}
}: NecApiUrlOptions): URL {
  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const url = new URL(operation, normalizedBaseUrl);

  url.searchParams.set("ServiceKey", serviceKey);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
}

export function maskServiceKey(value: string): string {
  return value.replace(/([?&]ServiceKey=)[^&]+/i, "$1***");
}
