// The Bodhi leaf tree's public list: every hung leaf (a verified donation that asked for one) with its metal, name,
// dedication and wish; never an amount, a slip or an email. Read by the tree page (index.html#tree) and the 3D temple.
// The database function sambodhaya_leaves() returns only those fields. Settings: SUPABASE_URL and SUPABASE_KEY, the same
// as records.mjs. Cached a minute, so a crowd on the tree page asks the database once a minute at most.

const headers = { "Content-Type": "application/json", "Cache-Control": "public, max-age=60" };

export async function handler() {
  const { SUPABASE_URL: url, SUPABASE_KEY: apikey } = process.env;
  if (!url || !apikey) return { statusCode: 500, headers: { ...headers, "Cache-Control": "no-store" }, body: JSON.stringify({ error: "settings missing" }) };
  const r = await fetch(`${url}/rest/v1/rpc/sambodhaya_leaves`, { method: "POST", headers: { apikey, "Content-Type": "application/json" }, body: "{}" });
  if (!r.ok) { console.error("Supabase refused the leaves", r.status, (await r.text()).slice(0, 300)); return { statusCode: 502, headers: { ...headers, "Cache-Control": "no-store" }, body: JSON.stringify({ error: "database" }) }; }
  return { statusCode: 200, headers, body: await r.text() };
}
