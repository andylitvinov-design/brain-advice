export function normalizeInputUrl(raw: string) {
  const value = String(raw || "").trim();

  if (!value) {
    throw new Error("URL is required.");
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return new URL(value).toString();
  }

  if (value.startsWith("127.0.0.1") || value.startsWith("localhost")) {
    return new URL(`http://${value}`).toString();
  }

  return new URL(`https://${value}`).toString();
}
