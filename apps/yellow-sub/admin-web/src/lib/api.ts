const base = '';

export async function adminFetch(
  path: string,
  token: string | null,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(`${base}${path}`, { ...init, headers });
}
