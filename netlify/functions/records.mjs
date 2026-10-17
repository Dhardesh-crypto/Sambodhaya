// Hands the donation and feedback rows to the read-only records page (records.html), only with the right view key.
// The page sends the key from its link (#k=...) in the x-view-key header; the database function sambodhaya_records checks it.
// Settings: SUPABASE_URL and SUPABASE_KEY, the same as submission-created.mjs. The view key itself lives only in the database
// (private.sambodhaya_settings.view_key); change it there and every old link stops working.

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

export async function handler(event) {
  const key = event.headers["x-view-key"] || "";
  if (!/^[0-9a-f]{32,128}$/.test(key)) return { statusCode: 401, headers, body: JSON.stringify({ error: "no key" }) };
  const { SUPABASE_URL: url, SUPABASE_KEY: apikey } = process.env;
  if (!url || !apikey) return { statusCode: 500, headers, body: JSON.stringify({ error: "settings missing" }) };
  const r = await fetch(`${url}/rest/v1/rpc/sambodhaya_records`, {
    method: "POST",
    headers: { apikey, "Content-Type": "application/json" },
    body: JSON.stringify({ view_key: key }),
  });
  if (r.status === 401 || r.status === 403) return { statusCode: 401, headers, body: JSON.stringify({ error: "wrong key" }) };
  if (!r.ok) { console.error("Supabase refused the records", r.status, (await r.text()).slice(0, 300)); return { statusCode: 502, headers, body: JSON.stringify({ error: "database" }) }; }
  return { statusCode: 200, headers, body: await r.text() };
}
