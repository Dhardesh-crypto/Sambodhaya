/* Sambodhaya content.
 *
 * Teaching text is copied verbatim from the Sambodhaya Notion pages:
 *   - APP CONTENT v1 — U01–U08 Child Output Records (units: simple, question, life, sources, boundary, uncertainty, safety, status)
 *   - U01–U08 EXERCISE SET v1 — Publication Draft (exercises)
 *   - ภาษาหน้าบ้านเด็ก 10+ — CHILD-FACING LANGUAGE, ENTRANCE, CENTRAL COURTYARD, LEARN • PRACTICE • OBSERVE,
 *     QUIET REST AREA, TEMPLE CARETAKER, หอพระไตรปิฎก (zone copy)
 * The Thai teaching text should match the Library: correct it there first, then in /admin (content/lessons/).
 * English (`en`) is a draft translation made by AI and is shown as unreviewed.
 */
const T = (th, en) => ({ th, en });

// The teaching content (the lessons U01–U08, the source identifiers, the Library's AMBER notes and the wheel image's
// description) lives in content/ as JSON, edited through /admin; src/build.py puts it in front of this file as
// SOURCES, UNITS, AMBER and WHEEL_IMAGE. What stays here is kept out of the editors' reach on purpose.

/* Donation & development fund settings.
 * Leave a value as null until the team provides the real one; the page then shows
 * "awaiting details" and the donation form stays disabled. Never put sample or
 * made-up account details here.
 */
// Details provided by the temple team (Arnon, 12 Oct 2026), from the SCB account certificate.
const SUPPORT = {
  recipient: { th: "นาย วัฒพงษ์ น้อยเวียง (บัญชีบุคคล สำหรับพัฒนาและสร้างวัด)", en: "Mr. Watthapong Noiwiang (an individual's account, for the temple's development and construction)" },
  promptpayQr: "img/promptpay-qr.png", // PromptPay QR (static, any amount) for the number below (16 Oct 2026)
  promptpayId: "088-953-5999",          // PromptPay mobile number, account holder นาย วัฒพงษ์ น้อยเวียง (confirmed by the user, 16 Oct 2026)
  bank: {
    bank: { th: "ธนาคารไทยพาณิชย์ (SCB) สาขาชลบุรี · บัญชีออมทรัพย์ (ออนไลน์)", en: "Siam Commercial Bank (SCB), Chonburi branch · savings account (online)" },
    name: { th: "นาย วัฒพงษ์ น้อยเวียง", en: "Mr. Watthapong Noiwiang (นาย วัฒพงษ์ น้อยเวียง)" },
    number: "505-413777-8",
  },
  taxNote: { th: "ไม่สามารถนำไปลดหย่อนภาษีได้ เนื่องจากเป็นบัญชีบุคคลสำหรับพัฒนาและสร้างวัด จึงออกใบเสร็จเพื่อลดหย่อนภาษีไม่ได้", en: "Not tax-deductible: this is an individual's account for the project's development and construction, so official tax-deductible receipts can't be issued." },
  retentionDays: 90,    // slips are kept 90 days for accounting and audit verification, then deleted
  contact: "defidhardesh@gmail.com", // for privacy or deletion requests (a backup address for now, 12 Oct 2026)
};
