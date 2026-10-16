// Copies each verified form submission (donation slips and feedback) into Airtable.
// Netlify runs this function by itself whenever a Netlify Forms submission is accepted (spam is filtered out first).
// Settings (Netlify → Site configuration → Environment variables, never in the code):
//   AIRTABLE_TOKEN    a personal access token with data.records:write on the base
//   AIRTABLE_BASE_ID  the base's ID (starts with "app")
// The base needs two tables with these fields (names exactly as below): see README "Form submissions in Airtable".
// Slips are kept 90 days (as the support page promises), so each donation row gets a "Delete after" date.

const TABLES = { donation: "Donations", feedback: "Feedback" };
const KEEP_DAYS = 90;

const day = (d) => d.toISOString().slice(0, 10);
const fileUrl = (f) => (!f ? "" : typeof f === "string" ? f : f.url || "");

function fields(form, d, sub) {
  const when = new Date(sub.created_at || Date.now());
  if (form === "donation") {
    return {
      "Submitted": when.toISOString(),
      "Name": d.name || "",
      "Amount (THB)": Number(String(d.amount || "").replace(/[^\d.]/g, "")) || null,
      "Method": d.method || "",
      "Note": d.note || "",
      "Email": d.email || "",
      "Thanks": d.thanks || "",
      "Language": d.lang || "",
      "Slip": fileUrl(d.attachment), // (Netlify's link to the file; open it from the Netlify dashboard if it has expired)
      "Submission ID": sub.id || "",
      "Delete after": day(new Date(when.getTime() + KEEP_DAYS * 86400000)),
      "Status": "Awaiting check",
    };
  }
  return {
    "Submitted": when.toISOString(),
    "Type": d.type || "",
    "Message": d.message || "",
    "Page": d.page || "",
    "Language": d.lang || "",
    "Device": d.device || "",
    "Email": d.email || "",
    "Attachment": fileUrl(d.attachment),
    "Submission ID": sub.id || "",
  };
}

export async function handler(event) {
  const sub = JSON.parse(event.body || "{}").payload || {};
  const table = TABLES[sub.form_name];
  if (!table) return { statusCode: 200, body: "not a copied form" };
  const { AIRTABLE_TOKEN: token, AIRTABLE_BASE_ID: base } = process.env;
  if (!token || !base) { console.warn("Airtable settings are missing; submission kept in Netlify only"); return { statusCode: 200, body: "no settings" }; }
  const f = fields(sub.form_name, sub.data || {}, sub);
  Object.keys(f).forEach((k) => (f[k] === "" || f[k] == null) && delete f[k]); // (empty fields stay empty in Airtable)
  const r = await fetch(`https://api.airtable.com/v0/${base}/${encodeURIComponent(table)}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ records: [{ fields: f }], typecast: true }),
  });
  if (!r.ok) console.error("Airtable refused the row", r.status, (await r.text()).slice(0, 500)); // (the submission itself is safe in Netlify)
  return { statusCode: 200, body: "ok" };
}
