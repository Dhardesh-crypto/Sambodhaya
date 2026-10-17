// Copies each verified form submission (donation slips and feedback) into Supabase.
// Netlify runs this function by itself whenever a Netlify Forms submission is accepted (spam is filtered out first).
// Settings (Netlify → Site configuration → Environment variables, never in the code):
//   SUPABASE_URL         the project's URL (https://<ref>.supabase.co)
//   SUPABASE_KEY         the project's publishable key (it can only call sambodhaya_submit, nothing else)
//   SAMBODHAYA_SECRET    the secret stored in private.sambodhaya_settings; sambodhaya_submit refuses calls without it
// The tables (sambodhaya_donations, sambodhaya_feedback) and the function are described in README "Form submissions in Supabase".
// Slips are kept 90 days (as the support page promises): the database sets each donation's "delete after" date and removes it then.

const FORMS = ["donation", "feedback"];

const fileUrl = (f) => (!f ? "" : typeof f === "string" ? f : f.url || "");

function fields(form, d, sub) {
  const when = new Date(sub.created_at || Date.now()).toISOString();
  if (form === "donation") {
    return {
      submitted: when,
      name: d.name,
      amount_thb: Number(String(d.amount || "").replace(/[^\d.]/g, "")) || null,
      method: d.method,
      note: d.note,
      email: d.email,
      thanks: d.thanks,
      language: d.lang,
      slip: fileUrl(d.attachment), // (Netlify's link to the file; open it from the Netlify dashboard if it has expired)
      submission_id: sub.id,
    };
  }
  return {
    submitted: when,
    type: d.type,
    message: d.message,
    page: d.page,
    language: d.lang,
    device: d.device,
    email: d.email,
    attachment: fileUrl(d.attachment),
    submission_id: sub.id,
  };
}

export async function handler(event) {
  const sub = JSON.parse(event.body || "{}").payload || {};
  const form = sub.form_name;
  if (!FORMS.includes(form)) return { statusCode: 200, body: "not a copied form" };
  const { SUPABASE_URL: url, SUPABASE_KEY: key, SAMBODHAYA_SECRET: secret } = process.env;
  if (!url || !key || !secret) { console.warn("Supabase settings are missing; submission kept in Netlify only"); return { statusCode: 200, body: "no settings" }; }
  const f = fields(form, sub.data || {}, sub);
  Object.keys(f).forEach((k) => (f[k] === "" || f[k] == null) && delete f[k]); // (empty fields stay empty in Supabase)
  const r = await fetch(`${url}/rest/v1/rpc/sambodhaya_submit`, {
    method: "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ form, fields: f, secret }),
  });
  if (!r.ok) console.error("Supabase refused the row", r.status, (await r.text()).slice(0, 500)); // (the submission itself is safe in Netlify)
  return { statusCode: 200, body: "ok" };
}
