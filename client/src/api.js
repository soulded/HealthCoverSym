// api.js — small fetch wrapper. The Vite dev server proxies /api to the
// Express backend (see vite.config.js), so paths are relative.
async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    const err = new Error(`Request failed (${res.status})`);
    err.errors = data?.errors || [`Request failed (${res.status}).`];
    throw err;
  }
  return data;
}

export const listQuotes = () => request('/api/quotes');
export const getQuote = (id) => request(`/api/quotes/${id}`);
export const createQuote = (quote) =>
  request('/api/quotes', { method: 'POST', body: JSON.stringify(quote) });
export const updateQuote = (id, quote) =>
  request(`/api/quotes/${id}`, { method: 'PUT', body: JSON.stringify(quote) });
export const deleteQuote = (id) =>
  request(`/api/quotes/${id}`, { method: 'DELETE' });

// SQLite stores created_at as UTC ("YYYY-MM-DD HH:MM:SS"); show it in
// Melbourne local time (AEST/AEDT)
export function formatCreatedAt(createdAt) {
  if (!createdAt) return '';
  const date = new Date(createdAt.replace(' ', 'T') + 'Z');
  if (Number.isNaN(date.getTime())) return createdAt;
  return date.toLocaleString('en-AU', {
    timeZone: 'Australia/Melbourne',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
