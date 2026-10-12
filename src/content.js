/* Sambodhaya content.
 *
 * Teaching text is copied verbatim from the Sambodhaya Notion pages:
 *   - APP CONTENT v1 — U01–U08 Child Output Records (units: simple, question, life, sources, boundary, uncertainty, safety, status)
 *   - U01–U08 EXERCISE SET v1 — Publication Draft (exercises)
 *   - ภาษาหน้าบ้านเด็ก 10+ — CHILD-FACING LANGUAGE, ENTRANCE, CENTRAL COURTYARD, LEARN • PRACTICE • OBSERVE,
 *     QUIET REST AREA, TEMPLE CARETAKER, หอพระไตรปิฎก (zone copy)
 * Do not edit the Thai teaching text here; correct it in the Library first.
 * English (`en`) is a draft translation made by AI and is shown as unreviewed.
 */
const T = (th, en) => ({ th, en });

// Canonical reference identifiers used by the units (identification only, not quotations).
const SOURCES = {
  MN26: { id: "MN 26", pali: "Ariyapariyesanā Sutta", th: "มัชฌิมนิกาย 26 · อริยปริเยสนสูตร" },
  MN36: { id: "MN 36", pali: "Mahāsaccaka Sutta", th: "มัชฌิมนิกาย 36 · มหาสัจจกสูตร" },
  SN56_11: { id: "SN 56.11", pali: "Dhammacakkappavattana Sutta", th: "สังยุตตนิกาย 56.11 · ธัมมจักกัปปวัตตนสูตร" },
  DN16: { id: "DN 16", pali: "Mahāparinibbāna Sutta", th: "ทีฆนิกาย 16 · มหาปรินิพพานสูตร" },
  SN45_8: { id: "SN 45.8", pali: "Vibhaṅga Sutta", th: "สังยุตตนิกาย 45.8 · วิภังคสูตร" },
  SN22_59: { id: "SN 22.59", pali: "Anattalakkhaṇa Sutta", th: "สังยุตตนิกาย 22.59 · อนัตตลักขณสูตร" },
  SN12_23: { id: "SN 12.23", pali: "Upanisa Sutta", th: "สังยุตตนิกาย 12.23 · อุปนิสสูตร" },
  ANAPANA: { id: "Ānāpānasati", pali: "Ānāpānasati evidence", th: "หลักฐานเรื่องอานาปานสติ" },
  JHANA: { id: "Jhāna", pali: "P1 Jhāna records", th: "หลักฐานเรื่องฌาน (P1 Jhāna records)" },
  M1_M7: { id: "M1–M7", pali: "P1 M1–M7", th: "Source Records M1–M7 ของห้องสมุด" },
};

const UNITS = [
  { code: "U01", title: T("ออกแสวงหา", "Going forth to seek"),
    question: T("ถ้าเรายังไม่รู้คำตอบ เราตรวจสอบอย่างไรโดยไม่รีบเชื่อ?", "If we don't know the answer yet, how can we check without rushing to believe?"),
    simple: T("พระโพธิสัตว์ออกจากชีวิตเดิมเพื่อค้นหาสิ่งที่ดีและความสงบสูงสุดด้วยตนเอง.", "The Bodhisatta left his old life to search, himself, for what is good and for the highest peace."),
    life: T("แยกสิ่งที่เราได้ยินออกจากสิ่งที่เราตรวจสอบแล้ว.", "Separate what we have heard from what we have checked."),
    sources: [{ key: "MN26", use: "MN26 Source Record · P1 linguistic gate" }],
    boundary: T("ไม่เติมชีวประวัติภายหลังเป็นคำใน MN26.", "Later biography is not added as if it were in MN26."),
    status: "CHILD COPY v1 READY / HUMAN COMPREHENSION TEST OPEN",
    exercises: [
      { q: "ข้อใดเป็นวิธีที่ปลอดภัยที่สุดเมื่อเราอยากรู้ว่าเรื่องหนึ่งอยู่ใน MN26 จริงหรือไม่?",
        o: ["เชื่อคำเล่าที่จำได้", "เปิด Source Record และดูขอบเขตข้อความ", "ให้ AI แต่งเหตุการณ์ต่อ"], a: 1,
        feedback: "หลักฐานต้นทางมาก่อนคำเล่าหรือคำอธิบาย.", evidence: "MN26 Source Record" },
      { q: "ถ้าคำอธิบายเด็กมีรายละเอียดที่ Source ไม่ได้บันทึก ควรทำอย่างไร?",
        o: ["เรียกเป็นพระพุทธพจน์", "ติดป้ายว่าเป็นคำอธิบายและไม่เติมลง Source", "ซ่อนที่มา"], a: 1 },
    ] },
  { code: "U02", title: T("อาฬาระและอุทกะ", "Āḷāra and Uddaka"),
    question: T("เรียนเก่งแล้ว เรายังตรวจผลของสิ่งที่เรียนได้ไหม?", "Even after learning something well, can we still check what it leads to?"),
    simple: T("พระโพธิสัตว์เรียนสิ่งที่ครูสอนจนเข้าถึงสิ่งนั้น แล้วตรวจต่อว่านี่ถึงจุดหมายที่กำลังค้นหาหรือยัง เมื่อเห็นว่ายังไม่ถึง จึงเดินทางต่อ.", "The Bodhisatta learned what his teachers taught until he reached it, then checked further whether this was the goal he was looking for. Seeing that it was not yet, he travelled on."),
    sources: [{ key: "MN26", use: "MN26 Āḷāra / Uddaka-Rāma records" }],
    uncertainty: T("Uddaka/Rāma attribution and name variants visible in Study view.", "The Uddaka/Rāma attribution and name variants are shown in the Study view."),
    status: "READY WITH VARIANT NOTE",
    exercises: [
      { q: "การเรียนสิ่งที่ครูสอนจนเข้าถึงสิ่งนั้น หมายความโดยอัตโนมัติหรือไม่ว่าเป็นจุดหมายสุดท้าย?",
        o: ["ใช่เสมอ", "ไม่ใช่ ต้องดูการตรวจผลใน Source"], a: 1, evidence: "MN26 bounded records" },
      { q: "ถ้าชื่อ/การอ้างถึง Uddaka–Rāma มี variant เราควร?",
        o: ["เลือกหนึ่งแบบแล้วซ่อน variant", "แสดง variant/ข้อจำกัดตามหลักฐาน"], a: 1 },
    ] },
  { code: "U03", title: T("ทดลองทางที่หนักเกินไป", "Trying a path that was too harsh"),
    question: T("เมื่อวิธีหนึ่งไม่พาไปถึงเป้าหมาย เราตรวจผลแล้วเปลี่ยนวิธีได้ไหม?", "When one method doesn't lead to the goal, can we check the result and change method?"),
    simple: T("พระโพธิสัตว์เคยทดลองวิธีที่ทำให้ร่างกายลำบากมาก แล้วทรงเห็นว่าวิธีนั้นยังไม่พาไปถึงสิ่งที่กำลังค้นหา จึงไม่ยึดวิธีนั้นต่อ.", "The Bodhisatta once tried methods that made his body suffer greatly, then saw that they did not lead to what he was seeking, so he did not hold on to them."),
    sources: [{ key: "MN36", use: "MN36" }],
    safety: T("HISTORY ONLY. No reproduction details; no fasting, breath restriction, pain-endurance exercise.", "History only. No details for copying it; no fasting, breath-holding or pain-endurance exercises."),
    status: "READY / SAFETY LOCKED",
    exercises: [
      { q: "จุดสำคัญที่เด็กควรเข้าใจคือ?",
        o: ["ยิ่งทรมานกายยิ่งดี", "มีการทดลองวิธีหนักและตรวจพบว่ายังไม่ถึงสิ่งที่แสวงหา"], a: 1, note: "Safety: HISTORY_ONLY" },
      { q: "เราควรทดลองเลียนแบบวิธีรุนแรงในเรื่องนี้หรือไม่?", rule: "No practice reproduction; route to history/evidence only. No procedural details." },
    ] },
  { code: "U04", title: T("พบทางที่ต่างออกไป", "Finding a different path"),
    question: T("เราดูผลของวิธีที่ใช้ แทนการคิดว่ายิ่งลำบากยิ่งดีได้ไหม?", "Can we look at what a method actually does, instead of thinking that harder is always better?"),
    simple: T("พระองค์ระลึกถึงปฐมฌานและทรงเห็นว่า ‘นี่เป็นทางเพื่อความรู้แจ้ง’ จากนั้นทรงกลับมารับอาหารให้ร่างกายมีกำลัง และเรื่องในพระสูตรดำเนินต่อไปสู่ฌานและความรู้ที่เกี่ยวกับการตรัสรู้.", "He recalled the first jhāna and saw that ‘this is the path to awakening’. Then he took food again so his body had strength, and the account in the sutta continues to the jhānas and the knowledge connected with awakening."),
    sources: [{ key: "MN36", use: "MN36" }, { key: "JHANA", use: "P1 Jhāna records, kept independent" }],
    boundary: T("Child explanation ≠ Buddha quotation. No attainment scoring.", "The child explanation is not a Buddha quotation. No scoring of attainment."),
    status: "READY",
    exercises: [
      { q: "การอ่านเรื่องฌานในแอปบอกได้หรือไม่ว่าผู้เรียน “ได้ฌานแล้ว”?", o: ["ได้", "ไม่ได้"], a: 1 },
      { q: "เมื่อดูเส้นเหตุการณ์ MN36 กับ Jhāna reference ควร?", o: ["รวมเป็นข้อความเดียว", "รักษาแหล่งและหน้าที่ของแต่ละ record แยกกัน"], a: 1 },
    ] },
  { code: "U05", title: T("เริ่มสอน", "Beginning to teach"),
    question: T("ก่อนสรุปคำสอน เราเปิดดูพระสูตรที่บันทึกคำสอนนั้นได้ไหม?", "Before summing up a teaching, can we open the sutta that records it?"),
    simple: T("หลังตรัสรู้ พระพุทธองค์เสด็จไปหากลุ่มห้ารูปที่อิสิปตนะ และเริ่มสอนธรรม. SN56.11 บันทึกอริยสัจสี่และหน้าที่ที่ต่างกันของแต่ละข้อ.", "After awakening, the Buddha went to the group of five at Isipatana and began to teach. SN 56.11 records the four noble truths and the different task belonging to each."),
    sources: [{ key: "MN26", use: "MN26 narrative" }, { key: "SN56_11", use: "SN56.11 teaching" }],
    boundary: T("MN26 narrative and SN56.11 teaching remain separate records.", "The MN26 narrative and the SN56.11 teaching stay separate records."),
    status: "READY",
    exercises: [
      { q: "MN26 narrative และ SN56.11 teaching ควรแสดงอย่างไร?", o: ["รวมเป็น quote เดียว", "แยก Source Record และเปิดหลักฐานแต่ละแหล่ง"], a: 1 },
      { q: "เปิด Evidence ของ SN56.11 แล้วตรวจ speaker/source ก่อนอ่านคำอธิบาย.", challenge: "SN56_11" },
    ] },
  { code: "U06", title: T("เรียนรู้คำสอนสำคัญ", "Learning key teachings"),
    question: T("ใครเป็นคนพูด และข้อความต้นทางอยู่ที่ไหน?", "Who is speaking, and where is the source text?"),
    simple: T("เลือกคำถามก่อน แล้วดูว่าพระสูตรหรือพระวินัยใดตอบเรื่องนั้นจริง.", "Choose a question first, then see which sutta or Vinaya text really answers it."),
    sources: [{ key: "M1_M7", use: "P1 M1–M7" }, { key: "SN56_11", use: "SN56.11" }, { key: "SN45_8", use: "SN45.8" }, { key: "SN22_59", use: "SN22.59" }, { key: "SN12_23", use: "SN12.23" }, { key: "ANAPANA", use: "Ānāpānasati" }, { key: "JHANA", use: "Jhāna evidence" }],
    evidenceNote: T("Every topic opens Evidence Passport.", "Every topic opens an Evidence Passport."),
    boundary: T("no invented year-by-year chronology; disciple speech labeled.", "No invented year-by-year chronology; disciples' speech is labelled."),
    status: "READY AS SOURCE BROWSER / CORPUS EXTENSIBLE",
    media: true,
    exercises: [
      { q: "ก่อนเรียกข้อความว่า Buddha-word ต้องตรวจอะไร?", o: ["ความไพเราะ", "speaker + source boundary", "จำนวนคนกดชอบ"], a: 1 },
      { q: "ถ้าพระสาวกเป็นผู้กล่าว?", o: ["เปลี่ยนเป็น Buddha-word", "แสดงชื่อ/ประเภทผู้พูดและใช้เป็น support ตาม record"], a: 1 },
      { q: "เลือกหนึ่งหัวข้อ → เปิด Source Record → ระบุ source + speaker.", challenge: "any", note: "No memorization-only requirement." },
    ] },
  { code: "U07", title: T("ช่วงสุดท้าย", "The final period"),
    question: T("ถ้ามีคนบอกว่า ‘พระพุทธเจ้าสอนไว้’ เราจะตรวจอย่างไร?", "If someone says ‘the Buddha taught this’, how do we check?"),
    simple: T("ช่วงสุดท้ายให้เราอ่านตามลำดับของ DN16 เอง และตรวจคำสอนด้วยพระสูตรและพระวินัย ไม่ใช่เชื่อเพียงเพราะมีคนบอกว่าได้ยินมา.", "For the final period, we read in DN 16's own order, and check teachings against the suttas and the Vinaya, not believing something only because someone says they heard it."),
    sources: [{ key: "DN16", use: "DN16 Mahāpadesa + Dhamma-Vinaya records" }],
    status: "READY",
    exercises: [
      { q: "เมื่อตามช่วงสุดท้าย ควรใช้?", o: ["ลำดับ DN16 ที่ตรวจได้", "เติมเหตุการณ์จากความจำให้ครบ"], a: 0 },
      { q: "คำที่ยังมีข้อถกเถียง/variant ควร?", o: ["แสดงความไม่แน่นอน", "ทำให้แน่นอนเพื่อให้อ่านง่าย"], a: 0 },
    ] },
  { code: "U08", title: T("ปรินิพพาน", "Parinibbāna"),
    question: null,
    simple: T("ก่อนปรินิพพาน พระพุทธองค์เปิดโอกาสให้ภิกษุถามสิ่งที่ยังสงสัย และ DN16 เก็บพระพุทธพจน์สุดท้ายไว้. เส้นเรื่องชีวิตในแอปหยุดที่ปรินิพพาน.", "Before the parinibbāna, the Buddha gave the monks the chance to ask about anything they still doubted, and DN 16 keeps his final words. The life story in this app ends at the parinibbāna."),
    sources: [{ key: "DN16", use: "DN16" }],
    phrase: "vayadhammā saṅkhārā; appamādena sampādetha",
    translationNote: T("use controlled P1 translation with source/translation visibly separated.", "Use the controlled P1 translation, with source and translation visibly separated."),
    boundary: T("funeral/relic/council material is post-endpoint scope.", "Funeral, relic and council material lies beyond the endpoint."),
    status: "READY / FINAL TRANSLATION PUBLICATION REVIEW OPEN",
    exercises: [
      { q: "เราต้องแยกอะไรในตอนสุดท้าย?", o: ["final Buddha-word กับ narrator text", "ไม่ต้องแยก"], a: 0 },
      { q: "Source phrase, controlled translation และ simple explanation เป็นชั้นเดียวกันหรือไม่?", o: ["ใช่", "ไม่ใช่ ต้องแยกให้เห็น"], a: 1 },
      { q: "Main Buddha-life Journey หลัง Parinibbāna ควร?", o: ["สร้าง Stage 09", "จบ Journey และให้เนื้อหาหลังจากนั้นเป็น reference/support"], a: 1 },
    ] },
];

// Library: AMBER items that must remain visible (SAMBODHAYA LIBRARY, Library Audit Closure 3 Oct 2026).
const AMBER = [
  "genuine manuscript/edition variants",
  "exact identification of sūkaramaddava",
  "narrow/universal glosses that source evidence does not justify",
  "token-level morphology not yet individually audited",
  "exhaustive Middle Ministry / whole-Canon catalog",
];

// The Sambodhaya wheel diagram (image supplied by the project, shown unchanged).
const WHEEL_IMAGE = {
  src: "img/sambodhaya-wheel.png", w: 1312, h: 1199,
  alt: T("ภาพวงล้อสัมโพธายะ: วงนอกคือปฏิจจสมุปบาท 12 องค์ วงกลางคือขันธ์ 5 ตรงกลางคือเป้าหมายและนิพพาน มีกล่องความเชื่อมโยงสำคัญและทางออก สามเณรน้อยต้อนรับทางซ้าย และหมาวัดชวนสำรวจทางขวา",
    "The Sambodhaya wheel: the outer ring shows the 12 links of dependent origination, the middle ring the five aggregates, and the centre the goal and Nibbāna, with boxes for the key connections and the way out. A young novice welcomes visitors on the left and the temple dog invites exploring on the right."),
  related: ["SN22_59", "SN12_23"],
};

/* Donation & development fund settings.
 * Leave a value as null until the team provides the real one; the page then shows
 * "awaiting details" and the donation form stays disabled. Never put sample or
 * made-up account details here.
 */
// Details provided by the temple team (Arnon, 12 Oct 2026), from the SCB account certificate.
const SUPPORT = {
  recipient: { th: "นาย วัฒพงษ์ น้อยเวียง (บัญชีบุคคล สำหรับพัฒนาและสร้างวัด)", en: "Mr. Watthapong Noiwiang (an individual's account, for the temple's development and construction)" },
  promptpayQr: null,    // path to the team's real PromptPay QR image, e.g. "img/promptpay-qr.png"
  promptpayId: null,    // PromptPay phone or tax ID as text, shown with a copy button
  bank: {
    bank: { th: "ธนาคารไทยพาณิชย์ (SCB) สาขาชลบุรี · บัญชีออมทรัพย์ (ออนไลน์)", en: "Siam Commercial Bank (SCB), Chonburi branch · savings account (online)" },
    name: { th: "นาย วัฒพงษ์ น้อยเวียง", en: "Mr. Watthapong Noiwiang (นาย วัฒพงษ์ น้อยเวียง)" },
    number: "505-413777-8",
  },
  taxNote: { th: "ไม่สามารถนำไปลดหย่อนภาษีได้ เนื่องจากเป็นบัญชีบุคคลสำหรับพัฒนาและสร้างวัด จึงออกใบเสร็จเพื่อลดหย่อนภาษีไม่ได้", en: "Not tax-deductible: this is an individual's account for the project's development and construction, so official tax-deductible receipts can't be issued." },
  retentionDays: 90,    // slips are kept 90 days for accounting and audit verification, then deleted
  contact: null,        // e.g. "email@example.org" for privacy or deletion requests (not yet provided)
};
