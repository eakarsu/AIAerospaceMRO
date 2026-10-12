export async function nativeRequest(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = localStorage.getItem('mro_token');
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const body = await response.clone().json().catch(() => ({}));
    throw new Error(body.error || body.message || `Request failed (${response.status}).`);
  }
  return response;
}
