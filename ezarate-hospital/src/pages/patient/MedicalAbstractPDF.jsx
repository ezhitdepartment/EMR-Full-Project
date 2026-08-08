// E. Zarate Hospital — Medical Abstract, laid out to match the hospital's
// pre-printed paper form field-for-field (Medical Record No., Admitting
// Physician/Nurse, the Signs & Symptoms checklist, Physical Examination on
// Admission per system, Ancillaries/Medication done, Course in the Ward,
// Final Diagnosis, Outcome of Treatment, Take Home Medicines,
// Certification) — same "faithful replica of the real form" approach as
// CF4PDF.jsx / ErDischargePDF.jsx / MedicalCertificatePDF.jsx, rather than
// the dashboard's teal/rounded house style.
//
// DATA SOURCE — a single, flat `form` object: the saved Medical Abstract
// document itself (patient_documents, doc_type "medabstract"), edited on
// MedicalAbstractPage.jsx and passed straight through to this component
// with no re-shaping — same "PDF renders exactly the saved form" pattern
// MedicalCertificatePDF.jsx already uses. See
// emptyMedicalAbstractForm()/buildMedicalAbstractSeed() in
// medicalAbstractHelpers.js for the full field list and where each one is
// first auto-filled from.

import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";
import logoImg from "../../assets/logo.jpg";
import { formatAge, ageInYears } from "../../utils/age";
import {
  SIGNS_AND_SYMPTOMS_OPTIONS,
  GENERAL_SURVEY_OPTIONS,
  HEENT_OPTIONS,
  PE_SYSTEMS,
} from "./ConsultationForm";
import { emptyMedicalAbstractForm } from "./medicalAbstractHelpers";

// Long bond paper: 8.5in x 13in, in points (1in = 72pt) — same size CF4PDF.jsx
// and the rest of the Patient Files PDFs use. This form was previously
// fixed at A4 and hard-split into two <Page>s regardless of how much
// content actually filled page 1, which is what produced the big dead
// gap before page 2 always started on a fresh physical sheet.
const ABSTRACT_SIZE = [612, 936];

const C = {
  black: "#0f172a",
  mid: "#334155",
  line: "#0f172a",
  rule: "#94a3b8",
  bg: "#f1f5f9",
};

const s = StyleSheet.create({
  page: {
    paddingTop: 20, paddingBottom: 26,
    paddingHorizontal: 34,
    fontSize: 9, fontFamily: "Helvetica", color: C.black,
  },
  headerRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    borderBottomWidth: 1.5, borderBottomColor: C.black,
    paddingBottom: 4, marginBottom: 4,
  },
  hospName: { fontSize: 16, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  hospSub: { fontSize: 7.5, color: C.mid, marginTop: 1.5 },
  sealCol: { alignItems: "center", width: 70 },
  seal: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: "#cbd5e1",
    overflow: "hidden",
  },
  sealImg: { width: 52, height: 52, objectFit: "cover" },

  mrnRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 2.5 },
  mrnLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  mrnValue: {
    fontSize: 9.5, minWidth: 110, textAlign: "center",
    borderBottomWidth: 0.75, borderBottomColor: C.line, marginLeft: 4,
  },

  title: {
    fontSize: 12.5, fontFamily: "Helvetica-Bold", textAlign: "center",
    textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 4,
  },

  fieldRow: { flexDirection: "row", marginBottom: 2.5, alignItems: "flex-end" },
  fLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold", marginRight: 4 },
  fValue: {
    flex: 1, fontSize: 9.5, borderBottomWidth: 0.75, borderBottomColor: C.line,
    paddingBottom: 1, minHeight: 11,
  },

  bar: {
    backgroundColor: C.black, paddingVertical: 2.5, paddingHorizontal: 6,
    marginTop: 4, marginBottom: 2.5,
  },
  barText: {
    color: "#ffffff", fontSize: 8.3, fontFamily: "Helvetica-Bold",
    textTransform: "uppercase", letterSpacing: 0.3,
  },

  blockWrap: { marginBottom: 2.5 },
  blockLabel: { fontSize: 8.3, fontFamily: "Helvetica-Bold", marginBottom: 1.5 },
  ruledBox: { borderWidth: 0.5, borderColor: C.rule },
  ruledLineText: {
    fontSize: 8.8, minHeight: 10.5, paddingHorizontal: 2, paddingTop: 1.5,
    borderBottomWidth: 0.5, borderBottomColor: C.rule,
  },

  checkGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 1.5, marginBottom: 2 },
  checkItem4: { flexDirection: "row", alignItems: "flex-start", width: "25%", marginBottom: 2, paddingRight: 3 },
  checkItem3: { flexDirection: "row", alignItems: "flex-start", width: "33.33%", marginBottom: 2, paddingRight: 3 },
  checkItem2: { flexDirection: "row", alignItems: "flex-start", width: "50%", marginBottom: 2, paddingRight: 3 },
  checkBox: {
    width: 8, height: 8, borderWidth: 1, borderColor: C.black,
    marginRight: 3, marginTop: 0.5, flexShrink: 0,
  },
  checkBoxChecked: { backgroundColor: C.black },
  checkLabel: { fontSize: 7.5, lineHeight: 1.2 },

  peSystem: { marginBottom: 1.5 },
  peSystemLabel: {
    fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase",
    marginBottom: 1, color: C.mid,
  },

  table: { borderWidth: 0.75, borderColor: C.rule, marginTop: 1.5, marginBottom: 3 },
  tHeadRow: { flexDirection: "row", backgroundColor: C.bg, borderBottomWidth: 0.75, borderBottomColor: C.rule },
  tRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.rule },
  tRowLast: { flexDirection: "row" },
  tCellDate: { width: 60, padding: 2.5, fontSize: 7.5, borderRightWidth: 0.5, borderRightColor: C.rule },
  tCellHeadDate: {
    width: 60, padding: 2.5, fontSize: 7, fontFamily: "Helvetica-Bold",
    textTransform: "uppercase", borderRightWidth: 0.5, borderRightColor: C.rule,
  },
  tCellWide: { flex: 1, padding: 2.5, fontSize: 8.3 },
  tCellHeadWide: { flex: 1, padding: 2.5, fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },

  outcomeRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 2, marginBottom: 4, minHeight: 16 },
  outcomeItem: { flexDirection: "row", alignItems: "center", marginRight: 16, marginBottom: 2 },

  sigRow: { marginTop: 8, flexDirection: "row", gap: 40 },
  sigCol: { flex: 1 },
  sigLine: { borderBottomWidth: 1, borderBottomColor: C.black, height: 16 },
  sigName: { fontSize: 9.2, fontFamily: "Helvetica-Bold", marginTop: 2 },
  sigLabel: { fontSize: 7.5, fontFamily: "Helvetica-Oblique", color: C.mid },
  certifyText: { fontSize: 8, fontFamily: "Helvetica-Oblique", marginTop: 2, marginBottom: 3, lineHeight: 1.3 },

  footer: {
    position: "absolute", bottom: 10, left: 34, right: 34,
    flexDirection: "row", justifyContent: "space-between",
    fontSize: 7, color: C.mid,
    borderTopWidth: 0.5, borderTopColor: C.rule, paddingTop: 2.5,
  },
});

const dash = (v) => (v && String(v).trim() ? String(v) : "");

function Bar({ title }) {
  return (
    <View style={s.bar}>
      <Text style={s.barText}>{title}</Text>
    </View>
  );
}

function FieldLine({ label, value, width }) {
  return (
    <View style={[s.fieldRow, width ? { width } : { flex: 1 }]}>
      <Text style={s.fLabel}>{label}:</Text>
      <Text style={s.fValue}>{dash(value)}</Text>
    </View>
  );
}

// Word-wraps free text into fixed ruled lines, same approach every sibling
// PDF (MedicalCertificatePDF, AdmissionDischargeRecordPDF, CF4PDF) uses so
// longer fields still read like they belong on a ruled pad instead of one
// run-on line.
function RuledBlock({ label, value, lines }) {
  const text = dash(value);
  const words = text.split(/\s+/).filter(Boolean);
  const rowsOut = [];
  let current = "";
  const maxCharsPerLine = 104;
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length > maxCharsPerLine) {
      rowsOut.push(current);
      current = w;
    } else {
      current = next;
    }
  }
  if (current) rowsOut.push(current);

  const rowCount = Math.max(lines, rowsOut.length);
  const filled = Array.from({ length: rowCount }, (_, i) => rowsOut[i] || "");

  return (
    <View style={s.blockWrap} wrap={false}>
      <Text style={s.blockLabel}>{label}:</Text>
      <View style={s.ruledBox}>
        {filled.map((line, i) => (
          <Text key={i} style={s.ruledLineText}>{line}</Text>
        ))}
      </View>
    </View>
  );
}

function Check({ checked, label, width = 4 }) {
  const style = width === 2 ? s.checkItem2 : width === 3 ? s.checkItem3 : s.checkItem4;
  return (
    <View style={style}>
      <View style={[s.checkBox, checked ? s.checkBoxChecked : null]} />
      <Text style={s.checkLabel}>{label}</Text>
    </View>
  );
}

// "2026-07-19" -> "07/19/2026"
function formatDate(d) {
  if (!d) return "";
  const dt = new Date(`${d}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return d;
  return `${String(dt.getMonth() + 1).padStart(2, "0")}/${String(dt.getDate()).padStart(2, "0")}/${dt.getFullYear()}`;
}

// "14:05" -> "02:05 PM"
function formatTime(t) {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  let h = parseInt(hStr, 10);
  if (Number.isNaN(h)) return "";
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${mStr} ${period}`;
}

// Whole admitted days, inclusive of both the admission and discharge date
// — "Duration" on the paper form is filled by hand the same way, so this
// is just the arithmetic a nurse would otherwise do themselves.
function computeDuration(dateAdmitted, dateDischarged) {
  if (!dateAdmitted || !dateDischarged) return "";
  const a = new Date(`${dateAdmitted}T00:00:00`);
  const d = new Date(`${dateDischarged}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(d.getTime())) return "";
  const days = Math.round((d - a) / 86400000) + 1;
  return days > 0 ? `${days} day${days === 1 ? "" : "s"}` : "";
}

export default function MedicalAbstractPDF({ form: formProp = {} }) {
  const form = { ...emptyMedicalAbstractForm(), ...formProp };

  const generatedOn = new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  const fullName = [form.lastName, form.firstName, form.middleName].filter(Boolean).join(", ");
  const isFemale = (form.sex || "").toLowerCase() === "female";
  const age = ageInYears(form.dateOfBirth);

  const signs = form.admissionSigns || [];
  const referred = form.referredFromOtherHCI;
  const courseInWard = (form.courseInWardEntries || []).filter((e) => e.date || e.orderAction);
  const takeHomeItems = (form.takeHomeMedicines || []).filter((i) => i.medicineName || i.instructions);

  const duration = computeDuration(form.dateAdmitted, form.dateDischarged);
  const vitals = form.vitalSigns || null;

  return (
    <Document title={`Medical Abstract - ${fullName || "Patient"}`} author="E. ZARATE HOSPITAL">
      {/* ── HCI Info / Patient's Data / Signs & Symptoms / Physical Exam / Ancillaries / Course in Ward / Diagnosis / Outcome / Take Home Meds / Certification — one continuous flowing page, like CF4PDF.jsx. react-pdf measures actual content height and only starts a new physical page when something genuinely doesn't fit, instead of a hard split at a fixed point that used to leave a dead gap whenever page 1's content didn't fill the whole sheet. ── */}
      <Page size={ABSTRACT_SIZE} style={s.page}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.hospName}>E. ZARATE HOSPITAL</Text>
            <Text style={s.hospSub}>16 J. Aguilar Avenue, Talon 1, Las Piñas City, Metro Manila, Philippines</Text>
            <Text style={s.hospSub}>Tel. Nos.: (02) 8871-1440 · (02) 8873-5593 · (02) 8874-6905</Text>
            <Text style={s.hospSub}>Mobile Nos.: Smart (0919) 991-4938 · Globe (0917) 538-2440</Text>
            <Text style={s.hospSub}>E-mails: zarateclinic@yahoo.com · zarateopd@gmail.com</Text>
          </View>
          <View style={s.sealCol}>
            <View style={s.seal}><Image src={logoImg} style={s.sealImg} /></View>
          </View>
        </View>

        <View style={s.mrnRow}>
          <Text style={s.mrnLabel}>Medical Record No.:</Text>
          <Text style={s.mrnValue}>{dash(form.hospitalNo)}</Text>
        </View>

        <Text style={s.title}>Medical Abstract</Text>

        <FieldLine label="Name" value={fullName} />
        <View style={s.fieldRow}>
          <FieldLine label="Age / Sex" value={age !== null ? `${age} / ${dash(form.sex)}` : dash(form.sex)} width={140} />
          <View style={{ width: 10 }} />
          <FieldLine label="DOB" value={formatDate(form.dateOfBirth)} width={140} />
        </View>
        <FieldLine label="Address" value={form.address} />
        <View style={s.fieldRow}>
          <FieldLine label="Admitting Physician" value={form.attendingPrintedName} />
          <View style={{ width: 10 }} />
          <FieldLine label="Admitting Nurse" value={form.admittingNurse} />
        </View>
        <FieldLine
          label="Date/Time Admitted"
          value={
            form.dateAdmitted
              ? `${formatDate(form.dateAdmitted)}${form.timeAdmitted ? `  ${formatTime(form.timeAdmitted)}` : ""}`
              : ""
          }
        />

        <RuledBlock label="Chief Complaint" value={form.chiefComplaint} lines={1} />
        <RuledBlock label="Admitting Impression" value={form.admittingDiagnosis} lines={1} />
        <RuledBlock label="Brief History of Present Illness" value={form.historyOfPresentIllness} lines={3} />
        <RuledBlock label="Pertinent Past Medical History" value={form.pastMedicalHistory} lines={1} />
        <View style={s.blockWrap}>
          <Text style={s.blockLabel}>OB/GYN History:</Text>
          <View style={s.ruledBox}>
            <Text style={s.ruledLineText}>
              {isFemale
                ? `G ${dash(form.noOfPregnancies)}   P ${dash(form.noOfDeliveries)}   ` +
                  `(${dash(form.fullTerm)} - ${dash(form.premature)} - ${dash(form.noOfAbortions)})   ` +
                  `LMP: ${dash(form.lastMenstrualPeriod)}`
                : "N/A"}
            </Text>
          </View>
        </View>

        <View wrap={false}>
          <Text style={s.blockLabel}>Pertinent signs and symptoms on admission (tick applicable box/es)</Text>
          <View style={s.checkGrid}>
            {SIGNS_AND_SYMPTOMS_OPTIONS.filter((o) => o !== "Pain" && o !== "Others").map((opt) => (
              <Check key={opt} checked={signs.includes(opt)} label={opt} />
            ))}
            <Check
              checked={signs.includes("Pain")}
              label={`Pain${form.admissionSignsPainSite ? ` (${form.admissionSignsPainSite})` : ""}`}
            />
            <Check
              checked={signs.includes("Others")}
              label={`Others${form.admissionSignsOthers ? `: ${form.admissionSignsOthers}` : ""}`}
            />
          </View>
        </View>

        <View style={s.fieldRow}>
          <Text style={s.blockLabel}>Referred from another health care institution (HCI)?  </Text>
        </View>
        <View style={s.checkGrid}>
          <Check checked={referred === "NO"} label="No" width={2} />
          <Check checked={referred === "YES"} label="Yes" width={2} />
        </View>
        <FieldLine label="Name of originating HCI" value={form.referringHCIName} />

        <Bar title="Physical Examination on Admission (Pertinent Findings per System)" />

        <View style={s.peSystem} wrap={false}>
          <Text style={s.peSystemLabel}>General Survey</Text>
          <View style={s.checkGrid}>
            {GENERAL_SURVEY_OPTIONS.map((opt) => (
              <Check
                key={opt}
                checked={(form.peGeneralSurvey || []).includes(opt)}
                label={
                  opt === "Altered sensorium" && form.peGeneralSurveyAlteredSensoriumSpecify
                    ? `${opt}: ${form.peGeneralSurveyAlteredSensoriumSpecify}`
                    : opt
                }
              />
            ))}
          </View>
          {vitals && (
            <View style={s.ruledBox}>
              <Text style={s.ruledLineText}>{vitals}</Text>
            </View>
          )}
        </View>

        <View style={s.peSystem} wrap={false}>
          <Text style={s.peSystemLabel}>SHEENT</Text>
          <View style={s.checkGrid}>
            {HEENT_OPTIONS.map((opt) => (
              <Check key={opt} checked={(form.peHeent || []).includes(opt)} label={opt} />
            ))}
            {form.peHeentOthers ? <Check checked label={`Others: ${form.peHeentOthers}`} width={2} /> : null}
          </View>
        </View>

        {PE_SYSTEMS.map((system) => (
          <View key={system.key} style={s.peSystem} wrap={false}>
            <Text style={s.peSystemLabel}>{system.label.toUpperCase()}</Text>
            <View style={s.checkGrid}>
              {system.options.map((opt) => (
                <Check key={opt} checked={(form[system.key] || []).includes(opt)} label={opt} />
              ))}
              {form[system.othersKey] ? (
                <Check checked label={`Others: ${form[system.othersKey]}`} width={2} />
              ) : null}
            </View>
          </View>
        ))}

        <RuledBlock label="Surgical Procedures (RVS CODE)" value={form.surgicalProcedureRvsCode} lines={1} />

        <RuledBlock label="Ancillaries Done" value={form.ancillariesDone} lines={1} />
        <RuledBlock label="Medication / Treatment Done" value={form.medicationTreatmentDone} lines={2} />

        <View wrap={false}>
          <Text style={s.blockLabel}>Course in the Ward:</Text>
          <View style={s.table}>
            <View style={s.tHeadRow}>
              <Text style={s.tCellHeadDate}>Date</Text>
              <Text style={s.tCellHeadWide}>Doctor's Order / Action</Text>
            </View>
            {courseInWard.length === 0 ? (
              <View style={s.tRowLast}>
                <Text style={s.tCellDate}> </Text>
                <Text style={[s.tCellWide, { color: C.rule }]}> </Text>
              </View>
            ) : (
              courseInWard.map((entry, i) => (
                <View key={entry.id || i} style={i === courseInWard.length - 1 ? s.tRowLast : s.tRow}>
                  <Text style={s.tCellDate}>{formatDate(entry.date)}</Text>
                  <Text style={s.tCellWide}>{dash(entry.orderAction)}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={s.fieldRow}>
          <FieldLine label="Final Diagnosis" value={form.dischargeDiagnosis} />
          <View style={{ width: 10 }} />
          <FieldLine label="ICD 10 Code / RVS" value={form.icd10OrRvsCode} width={140} />
        </View>
        <View style={s.fieldRow}>
          <FieldLine
            label="Date/Time of Discharge"
            value={
              form.dateDischarged
                ? `${formatDate(form.dateDischarged)}${form.timeDischarged ? `  ${formatTime(form.timeDischarged)}` : ""}`
                : "Still Admitted"
            }
          />
          <View style={{ width: 10 }} />
          <FieldLine label="Duration" value={duration} width={110} />
        </View>

        <View wrap={false}>
          <Text style={s.blockLabel}>Outcome of treatment:</Text>
          <View style={s.outcomeRow}>
            {["Improved", "HAMA", "Expired", "Absconded", "Transferred"].map((opt) => (
              <View key={opt} style={s.outcomeItem}>
                <View style={[s.checkBox, form.outcomeOfTreatment === opt ? s.checkBoxChecked : null]} />
                <Text style={s.checkLabel}>{opt.toUpperCase()}</Text>
              </View>
            ))}
          </View>
          <FieldLine label="Disposition" value={form.disposition} />
        </View>

        <RuledBlock
          label="Take Home Medicines"
          value={
            takeHomeItems.length
              ? takeHomeItems
                  .map((i) =>
                    [
                      `${i.medicineName || ""}${i.milligram ? ` (${i.milligram})` : ""}`.trim(),
                      i.quantity ? `x${i.quantity}` : "",
                      i.instructions,
                    ]
                      .filter(Boolean)
                      .join(" — ")
                  )
                  .join("; ")
              : ""
          }
          lines={2}
        />

        <View wrap={false}>
          <Text style={s.blockLabel}>Certification of Attending Health Care Professional</Text>
          <Text style={s.certifyText}>
            I certify that the above information given in this form, including all attachments, are true and correct.
          </Text>

          <View style={s.sigRow}>
            <View style={s.sigCol}>
              <View style={s.sigLine} />
              <Text style={s.sigName}>
                {dash(form.attendingPrintedName)}
                {form.attendingPrintedName ? ", M.D." : ""}
              </Text>
              <Text style={s.sigLabel}>Signature over Printed Name of Attending Physician</Text>
            </View>
            <View style={{ width: 110 }}>
              <View style={s.sigLine} />
              <Text style={s.sigName}>{formatDate(form.attendingCertifiedDate) || " "}</Text>
              <Text style={s.sigLabel}>Date Signed</Text>
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>E. ZARATE HOSPITAL  |  Medical Abstract</Text>
          <Text>Generated on {generatedOn}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}