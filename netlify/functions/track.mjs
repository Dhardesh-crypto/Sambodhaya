// Anonymous visit counts: how far visitors get (the 3D temple loaded, first steps, the welcome, the Bodhi tree, the
// support page) and how long they stay; never who they are. The page sends a random id for its browser tab (nothing
// links one visit to the next), the page (site or 3d), phone/tablet/desktop, the graphics quality, the language and a
// few [event, seconds since the page opened] pairs. No names, IPs or cookies are kept; the database keeps 180 days.
// The database function sambodhaya_track checks the secret and every value. Settings: SUPABASE_URL, SUPABASE_KEY and
// SAMBODHAYA_SECRET, the same as submission-created.mjs. Summary: the records page (sambodhaya_visit_summary).

const ok = { statusCode: 204, headers: { "Cache-Control": "no-store" }, body: "" };

export async function handler(event) {
  if (event.httpMethod !== "POST" || (event.body || "").length > 4000) return ok; // (never an error a visitor would see)
  let b; try { b = JSON.parse(event.body); } catch (e) { return ok; }
  if (!/^[a-z0-9]{8,24}$/.test(b.v || "") || !["site", "3d"].includes(b.p) || !Array.isArray(b.e) || !b.e.length) return ok;
  const { SUPABASE_URL: url, SUPABASE_KEY: key, SAMBODHAYA_SECRET: secret } = process.env;
  if (!url || !key || !secret) return ok;
  const r = await fetch(`${url}/rest/v1/rpc/sambodhaya_track`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ visit: b.v, page: b.p, device: String(b.d || ""), quality: String(b.q || ""), lang: String(b.l || ""), events: b.e.slice(0, 40), secret }),
  });
  if (!r.ok) console.error("Supabase refused the events", r.status, (await r.text()).slice(0, 200));
  return ok;
}
