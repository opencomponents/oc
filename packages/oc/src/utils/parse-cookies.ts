const decode = (value: string) => {
  if (!value.includes('%')) return value;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const parseJsonCookie = (value: string): unknown => {
  if (!value.startsWith('j:')) return undefined;
  try {
    return JSON.parse(value.slice(2));
  } catch {
    return undefined;
  }
};

export default function parseCookies(
  header: string | undefined
): Record<string, unknown> {
  const cookies: Record<string, unknown> = Object.create(null);
  if (!header) return cookies;

  for (const pair of header.split(';')) {
    const eq = pair.indexOf('=');
    if (eq === -1) continue;

    const key = pair.slice(0, eq).trim();
    if (Object.hasOwn(cookies, key)) continue;

    let value = pair.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    value = decode(value);
    cookies[key] = parseJsonCookie(value) || value;
  }

  return cookies;
}
