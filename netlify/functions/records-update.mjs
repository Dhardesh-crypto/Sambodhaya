// Changes one donation's status and admin note from the records page opened with the edit link (records#e=...).
// The page sends the edit key in the x-edit-key header; the database function sambodhaya_set_status checks it, and
// changes nothing else. The edit key lives only in the database (private.sambodhaya_settings.edit_key).
// Settings: SUPABASE_URL and SUPABASE_KEY, the same as records.mjs.

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
const STATUSES = ["Awaiting check", "Verified", "Problem"];

export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: JSON.stringify({ error: "POST only" }) };
  const key = event.headers["x-edit-key"] || "";
  if (!/^[0-9a-f]{32,128}$/.test(key)) return { statusCode: 401, headers, body: JSON.stringify({ error: "no key" }) };
  let b; try { b = JSON.parse(event.body || "{}"); } catch (e) { b = {}; }
  const submission = String(b.submission_id || ""), status = String(b.status || ""), note = String(b.admin_note || "").slice(0, 500);
  if (!submission || submission.length > 200 || !STATUSES.includes(status)) return { statusCode: 400, headers, body: JSON.stringify({ error: "bad request" }) };
  const { SUPABASE_URL: url, SUPABASE_KEY: apikey } = process.env;
  if (!url || !apikey) return { statusCode: 500, headers, body: JSON.stringify({ error: "settings missing" }) };
  const r = await fetch(`${url}/rest/v1/rpc/sambodhaya_set_status`, {
    method: "POST",
    headers: { apikey, "Content-Type": "application/json" },
    body: JSON.stringify({ edit_key: key, submission, new_status: status, new_note: note }),
  });
  if (r.status === 401 || r.status === 403) return { statusCode: 401, headers, body: JSON.stringify({ error: "wrong key" }) };
  if (!r.ok) { console.error("Supabase refused the change", r.status, (await r.text()).slice(0, 300)); return { statusCode: 502, headers, body: JSON.stringify({ error: "database" }) }; }
  return { statusCode: 200, headers, body: await r.text() };
}
