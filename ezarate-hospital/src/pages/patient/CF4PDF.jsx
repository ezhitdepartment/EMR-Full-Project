// PhilHealth CF4 (Claim Form 4) — laid out to match the hospital's paper
// CF4 as closely as react-pdf's box model allows (section bars numbered
// I–VII, boxed fields, checkbox grids), instead of the hospital's own
// house style the other Patient Files PDFs use.
//
// This form is never filled out on its own screen — it's assembled
// entirely from data other roles already captured:
//   - `doctorEntry`  — the doctor's most recent consultation save. Owns
//     nearly every CF4 field: Chief Complaint, Admitting/Discharge
//     Diagnosis, Case Rate Codes, admission/discharge date & time,
//     Referral, Pertinent Signs & Symptoms, Physical Examination on
//     Admission, Course in the Ward, Surgical Procedure/RVS
//     Code, Outcome of Treatment, Drugs/Medicines, and the Certification
//     signature block.
//   - `erEntry` — the ER nurse's most recent consultation save (matched to
//     the same encounter as `doctorEntry` when possible). Owns Pertinent
//     Past Medical History and OB/GYN History — see NURSE_SECTIONS in
//     ConsultationForm.jsx.
//   - `patient` — name, sex, date of birth, Hospital No.
//   - `triage` — the encounter's vitals (BP/HR/RR/Temp), for the Vital
//     Signs line under Physical Examination on Admission.
//
// Nothing here is hand-typed by staff — if a field reads "—" it's because
// neither the doctor's nor the ER nurse's consultation entry has filled
// that field in yet, not because this form has its own blank to fill.
//
// LAYOUT — one continuous flowing page, not a hard-coded split
// -------------------------------------------------------------------------
// Every section (HCI Info -> Patient's Data -> Reason for Admission ->
// Signs & Symptoms -> Referral -> Physical Examination -> Course in the
// Ward -> Surgical Procedure -> Drugs/Medicines -> Outcome of Treatment ->
// Certification) lives inside ONE <Page>. react-pdf measures actual
// content height and only starts a new physical page when something
// genuinely doesn't fit anymore — so a short entry prints on 1 page with
// no forced trailing blank page, and a long one (a doctor writing a lot
// under History of Present Illness, Course in the Ward, etc.) grows onto
// a 3rd/4th page with sections still running right up against each other,
// instead of a permanently-empty gap sitting between a fixed Page 1 and
// Page 2 boundary. The page size itself also now matches every other PDF
// in the app (`LONG_SIZE` — 8.5in x 13in "long" bond paper) instead of the
// narrower US Letter this form was mistakenly using before, which was
// most of why everything had to be shrunk down to fit.

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { ageInYears } from "../../utils/age";
import {
  SIGNS_AND_SYMPTOMS_OPTIONS,
  GENERAL_SURVEY_OPTIONS,
  HEENT_OPTIONS,
  PE_SYSTEMS,
} from "./ConsultationForm";

// Long bond paper: 8.5in x 13in, in points (1in = 72pt) — same as the
// physical form and as DoctorConsultationPDF.jsx / NurseConsultationPDF.jsx.
// This form was previously (and mistakenly) rendered on US Letter, which
// is 2in shorter — a real contributor to how cramped it used to look.
const LONG_SIZE = [612, 936];

const C = {
  dark: "#1e293b",
  mid: "#64748b",
  light: "#94a3b8",
  border: "#94a3b8",
  bg: "#f1f5f9",
  barBg: "#334155",
  white: "#ffffff",
};

const s = StyleSheet.create({
  page: {
    paddingTop: 24, paddingBottom: 32, paddingHorizontal: 30,
    fontSize: 9, fontFamily: "Helvetica", color: C.dark,
  },

  // Header
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 },
  phName: { fontSize: 15, fontFamily: "Helvetica-Bold" },
  phSub: { fontSize: 7.5, color: C.mid, fontStyle: "italic" },
  formTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", textAlign: "right" },
  formSub: { fontSize: 7.5, color: C.mid, textAlign: "right" },
  reminders: { fontSize: 6.8, color: C.mid, lineHeight: 1.35, marginTop: 3, marginBottom: 3 },
  remindersBold: { fontFamily: "Helvetica-Bold" },

  // Section bars — "I. HEALTH CARE INSTITUTION (HCI) INFORMATION" etc.
  bar: { backgroundColor: C.barBg, paddingVertical: 3, paddingHorizontal: 6, marginTop: 5, marginBottom: 3 },
  barText: { color: C.white, fontSize: 8.3, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.3 },

  // Boxed grid — mimics the paper form's ruled boxes.
  grid: { borderWidth: 0.75, borderColor: C.border },
  gridRow: { flexDirection: "row" },
  gridRowBorder: { flexDirection: "row", borderTopWidth: 0.75, borderTopColor: C.border },
  cell: { flex: 1, padding: 4, borderRightWidth: 0.75, borderRightColor: C.border },
  cellLast: { flex: 1, padding: 4 },
  cellLabel: { fontSize: 6.5, color: C.mid, textTransform: "uppercase", marginBottom: 1 },
  cellVal: { fontSize: 9.5, fontFamily: "Helvetica-Bold", minHeight: 11 },
  cellValSm: { fontSize: 8.5, fontFamily: "Helvetica-Bold", minHeight: 10 },

  blk: { marginTop: 3, marginBottom: 2 },
  blkLabel: { fontSize: 7, color: C.mid, textTransform: "uppercase", marginBottom: 1, fontFamily: "Helvetica-Bold" },
  blkVal: { fontSize: 8.8, backgroundColor: C.bg, padding: 5, lineHeight: 1.4, minHeight: 20 },

  // Checkbox grids — 4-per-row, loosened from 5 now that the label text
  // itself is bigger (was tuned tight to help squeeze onto a fixed
  // 2-page layout; that constraint is gone now that the page flows).
  checkGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 2, marginBottom: 3 },
  checkItem: { flexDirection: "row", alignItems: "flex-start", width: "25%", marginBottom: 3, paddingRight: 3 },
  checkItemWide: { flexDirection: "row", alignItems: "flex-start", width: "50%", marginBottom: 3, paddingRight: 3 },
  checkBox: {
    width: 8, height: 8, borderWidth: 1, borderColor: C.dark,
    marginRight: 3, marginTop: 0.5, flexShrink: 0,
  },
  checkBoxChecked: { backgroundColor: C.dark },
  checkLabel: { fontSize: 7.5, lineHeight: 1.25 },

  sectionLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginTop: 3, marginBottom: 2 },

  // Tables — Course in the Ward / Drugs & Medicines
  table: { borderWidth: 0.75, borderColor: C.border, marginTop: 2, marginBottom: 4 },
  tHeadRow: { flexDirection: "row", backgroundColor: C.bg, borderBottomWidth: 0.75, borderBottomColor: C.border },
  tRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.border },
  tRowLast: { flexDirection: "row" },
  tCellDate: { width: 54, padding: 3, fontSize: 7.5, borderRightWidth: 0.5, borderRightColor: C.border },
  tCellHeadDate: { width: 54, padding: 3, fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", borderRightWidth: 0.5, borderRightColor: C.border },
  tCellWide: { flex: 1, padding: 3, fontSize: 8.3 },
  tCellHeadWide: { flex: 1, padding: 3, fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  tCell3: { flex: 1, padding: 3, fontSize: 7.5, borderRightWidth: 0.5, borderRightColor: C.border },
  tCell3Last: { flex: 1, padding: 3, fontSize: 7.5 },
  tCellHead3: { flex: 1, padding: 3, fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", borderRightWidth: 0.5, borderRightColor: C.border },
  tCellHead3Last: { flex: 1, padding: 3, fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },

  outcomeRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 3, marginBottom: 3 },
  outcomeItem: { flexDirection: "row", alignItems: "center", marginRight: 14, marginBottom: 3 },

  certifyText: { fontSize: 8, fontStyle: "italic", marginTop: 3, marginBottom: 8, lineHeight: 1.35 },
  sigRow: { flexDirection: "row", marginTop: 4, gap: 22 },
  sigBlock: { flex: 1 },
  sigLine: { borderBottomWidth: 0.75, borderBottomColor: C.dark, height: 18, marginBottom: 3 },
  sigCaption: { fontSize: 7, color: C.mid, textAlign: "center" },

  // Physical Exam system groups — one compact row per system instead of a
  // stacked heading + its own checkGrid margins.
  peSystem: { marginBottom: 2 },
  peSystemLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 1 },

  footer: {
    position: "absolute", bottom: 14, left: 30, right: 30,
    flexDirection: "row", justifyContent: "space-between",
    fontSize: 7, color: C.light,
    borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 3,
  },
});

const dash = (v) => (v === 0 ? "0" : v && String(v).trim() ? String(v) : "—");

function Bar({ title }) {
  return (
    <View style={s.bar}>
      <Text style={s.barText}>{title}</Text>
    </View>
  );
}

function Cell({ label, value, last, small }) {
  return (
    <View style={last ? s.cellLast : s.cell}>
      <Text style={s.cellLabel}>{label}</Text>
      <Text style={small ? s.cellValSm : s.cellVal}>{dash(value)}</Text>
    </View>
  );
}

function Blk({ label, value, rows = 2 }) {
  return (
    <View style={s.blk}>
      <Text style={s.blkLabel}>{label}</Text>
      <Text style={[s.blkVal, { minHeight: rows * 10 }]}>{dash(value)}</Text>
    </View>
  );
}

function Check({ checked, label, wide }) {
  return (
    <View style={wide ? s.checkItemWide : s.checkItem}>
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
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${mStr} ${period}`;
}

export default function CF4PDF({ patient = {}, doctorEntry = {}, erEntry = {}, triage = null }) {
  const generatedOn = new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  const fullName = `${patient.lastName || ""}, ${patient.firstName || ""} ${patient.middleName || ""}`.trim();
  const isFemale = (patient.sex || "").toLowerCase() === "female";
  const age = ageInYears(patient.dateOfBirth);

  const signs = doctorEntry.admissionSigns || [];
  const pastMedicalHistory = (erEntry.pastMedicalHistory || [])
    .map((item) => item.text)
    .filter(Boolean)
    .join("; ");
  const obGyneNA = !isFemale;
  const referred = doctorEntry.referredFromOtherHCI;
  const courseInWard = (doctorEntry.courseInWardEntries || []).filter((e) => e.date || e.orderAction);
  // CF4's "V. Drugs / Medicines" table is fed by Medicine Given at ER
  // (erMedicineItems) — NOT the take-home Rx pad (prescriptionItems),
  // which is a separate, distinct list captured elsewhere on the form.
  const erMedicineItems = (doctorEntry.erMedicineItems || []).filter(
    (i) => i.genericName || i.quantityDosageRoute || i.totalCost
  );

  // Appends a unit only when there's an actual value — avoids printing
  // "— cm" when a field was never recorded (dash() returns "—" for that).
  const withUnit = (v, unit) => {
    const d = dash(v);
    return d === "—" ? d : `${d}${unit}`;
  };

  const vitals = triage
    ? `BP: ${withUnit(
        triage.systolic && triage.diastolic ? `${triage.systolic}/${triage.diastolic}` : "",
        " mmHg"
      )}   HR: ${withUnit(triage.heartRate, " bpm")}   RR: ${withUnit(
        triage.respiratoryRate,
        " cpm"
      )}   Temp: ${withUnit(triage.temperature, " \u00b0C")}   Height: ${withUnit(
        triage.height,
        " cm"
      )}   Weight: ${withUnit(triage.weight, " kg")}`
    : null;

  return (
    <Document title={`CF4 - ${patient.hospitalNo || fullName}`} author="E. ZARATE HOSPITAL">
      {/* ── HCI Info / Patient's Data / Reason for Admission / Signs & Symptoms / Referral / Physical Exam / Course in Ward / Drugs / Outcome / Certification — one continuous flowing page ── */}
      <Page size={LONG_SIZE} style={s.page}>
        <View style={s.headerRow}>
          <View>
            <Text style={s.phName}>PhilHealth</Text>
            <Text style={s.phSub}>Your Partner in Health</Text>
          </View>
          <View>
            <Text style={s.formSub}>This form may be reproduced and is NOT FOR SALE</Text>
            <Text style={s.formTitle}>CF4</Text>
            <Text style={s.formSub}>(Claim Form 4)</Text>
          </View>
        </View>

        <Text style={s.reminders}>
          <Text style={s.remindersBold}>IMPORTANT REMINDERS: </Text>
          Please fill out appropriate fields. Write in capital letters and check the appropriate boxes. This form,
          together with other supporting documents, should be filed within sixty (60) calendar days from date of
          discharge. All information, fields and tick boxes in this form are necessary.
        </Text>

        <Bar title="I. Health Care Institution (HCI) Information" />
        <View style={s.grid}>
          <View style={s.gridRow}>
            <Cell label="Name of HCI" value="E. ZARATE HOSPITAL" />
            <Cell label="Accreditation Number" value="#92022797" last />
          </View>
          <View style={s.gridRowBorder}>
            <Cell label="Address of HCI" value="16 J. Aguilar Ave., Talon, Las Piñas City" last />
          </View>
        </View>

        <Bar title="II. Patient's Data" />
        <View style={s.grid}>
          <View style={s.gridRow}>
            <Cell label="Last Name" value={patient.lastName} />
            <Cell label="First Name" value={patient.firstName} />
            <Cell label="Middle Name" value={patient.middleName} />
            <Cell label="Hospital No. (PIN)" value={patient.hospitalNo} last small />
          </View>
          <View style={s.gridRowBorder}>
            <Cell label="Age" value={age !== null ? age : null} />
            <Cell
              label="Sex"
              value={patient.sex ? patient.sex.toUpperCase() : null}
              last
            />
          </View>
          <View style={s.gridRowBorder}>
            <Cell label="Chief Complaint" value={doctorEntry.chiefComplaint} last />
          </View>
          <View style={s.gridRowBorder}>
            <Cell label="Admitting Diagnosis" value={doctorEntry.admittingDiagnosis} />
            <Cell label="Discharge Diagnosis" value={doctorEntry.dischargeDiagnosis} last />
          </View>
          <View style={s.gridRowBorder}>
            <Cell label="1st Case Rate Code" value={doctorEntry.caseRateCode1} />
            <Cell label="2nd Case Rate Code" value={doctorEntry.caseRateCode2} last />
          </View>
          <View style={s.gridRowBorder}>
            <Cell label="Date Admitted" value={formatDate(doctorEntry.dateAdmitted)} />
            <Cell label="Time Admitted" value={formatTime(doctorEntry.timeAdmitted)} />
            <Cell label="Date Discharged" value={formatDate(doctorEntry.dateDischarged)} />
            <Cell label="Time Discharged" value={formatTime(doctorEntry.timeDischarged)} last />
          </View>
        </View>

        <Bar title="III. Reason for Admission" />
        <Blk label="History of Present Illness" value={doctorEntry.historyOfPresentIllness} rows={4} />
        <Blk label="Pertinent Past Medical History" value={pastMedicalHistory} rows={2} />

        <View style={s.blk}>
          <Text style={s.blkLabel}>OB/GYN History</Text>
          <Text style={s.blkVal}>
            {obGyneNA
              ? "N/A"
              : `G ${dash(erEntry.noOfPregnancies)}   P ${dash(erEntry.noOfDeliveries)}   ` +
                `(${dash(erEntry.fullTerm)} - ${dash(erEntry.premature)} - ${dash(erEntry.noOfAbortions)})   ` +
                `LMP: ${dash(erEntry.lastMenstrualPeriod)}`}
          </Text>
        </View>

        <Text style={s.sectionLabel}>Pertinent Signs and Symptoms on Admission</Text>
        <View style={s.checkGrid}>
          {SIGNS_AND_SYMPTOMS_OPTIONS.filter((o) => o !== "Pain" && o !== "Others").map((opt) => (
            <Check key={opt} checked={signs.includes(opt)} label={opt} />
          ))}
          <Check
            checked={signs.includes("Pain")}
            label={`Pain${doctorEntry.admissionSignsPainSite ? ` (${doctorEntry.admissionSignsPainSite})` : ""}`}
          />
          <Check
            checked={signs.includes("Others")}
            label={`Others${doctorEntry.admissionSignsOthers ? `: ${doctorEntry.admissionSignsOthers}` : ""}`}
          />
        </View>

        <Text style={s.sectionLabel}>Referred from another Health Care Institution (HCI)?</Text>
        <View style={s.checkGrid}>
          <Check checked={referred === "NO"} label="No" wide />
          <Check
            checked={referred === "YES"}
            label={`Yes — ${dash(doctorEntry.referringHCIName)}`}
            wide
          />
        </View>

        <Bar title="Physical Examination on Admission (Pertinent Findings per System)" />

        <View style={s.peSystem}>
          <Text style={s.peSystemLabel}>General Survey</Text>
          <View style={s.checkGrid}>
            {GENERAL_SURVEY_OPTIONS.map((opt) => (
              <Check
                key={opt}
                checked={(doctorEntry.peGeneralSurvey || []).includes(opt)}
                label={
                  opt === "Altered sensorium" && doctorEntry.peGeneralSurveyAlteredSensoriumSpecify
                    ? `${opt}: ${doctorEntry.peGeneralSurveyAlteredSensoriumSpecify}`
                    : opt
                }
                wide
              />
            ))}
          </View>
        </View>

        <View style={s.peSystem}>
          <Text style={s.peSystemLabel}>Vital Signs</Text>
          <Text style={[s.blkVal, { marginBottom: 2, marginTop: 0 }]}>{vitals || "—"}</Text>
        </View>

        <View style={s.peSystem}>
          <Text style={s.peSystemLabel}>HEENT</Text>
          <View style={s.checkGrid}>
            {HEENT_OPTIONS.map((opt) => (
              <Check key={opt} checked={(doctorEntry.peHeent || []).includes(opt)} label={opt} />
            ))}
            {doctorEntry.peHeentOthers ? <Check checked label={`Others: ${doctorEntry.peHeentOthers}`} wide /> : null}
          </View>
        </View>

        {PE_SYSTEMS.map((system) => (
          <View key={system.key} style={s.peSystem}>
            <Text style={s.peSystemLabel}>{system.label}</Text>
            <View style={s.checkGrid}>
              {system.options.map((opt) => (
                <Check key={opt} checked={(doctorEntry[system.key] || []).includes(opt)} label={opt} />
              ))}
              {doctorEntry[system.othersKey] ? (
                <Check checked label={`Others: ${doctorEntry[system.othersKey]}`} wide />
              ) : null}
            </View>
          </View>
        ))}

        <Bar title="IV. Course in the Ward (Doctor's Order/Action) / ED Management" />
        <View style={s.table}>
          <View style={s.tHeadRow}>
            <Text style={s.tCellHeadDate}>Date</Text>
            <Text style={s.tCellHeadWide}>Doctor's Order/Action</Text>
          </View>
          {courseInWard.length === 0 ? (
            <View style={s.tRowLast}>
              <Text style={s.tCellDate}> </Text>
              <Text style={[s.tCellWide, { color: C.light }]}>—</Text>
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

        <Text style={s.sectionLabel}>Surgical Procedure/RVS Code</Text>
        <View style={[s.blkVal, { marginBottom: 3 }]}>
          <Text>
            {dash(doctorEntry.surgicalProcedureRvsCode)}
            {doctorEntry.surgicalProcedureNotes ? ` — ${doctorEntry.surgicalProcedureNotes}` : ""}
          </Text>
        </View>

        <Bar title="V. Drugs / Medicines" />
        <View style={s.table}>
          <View style={s.tHeadRow}>
            <Text style={s.tCellHead3}>Generic Name</Text>
            <Text style={s.tCellHead3}>Quantity / Dosage / Route</Text>
            <Text style={s.tCellHead3Last}>Total Cost</Text>
          </View>
          {erMedicineItems.length === 0 ? (
            <View style={s.tRowLast}>
              <Text style={[s.tCell3, { color: C.light }]}>—</Text>
              <Text style={s.tCell3}> </Text>
              <Text style={s.tCell3Last}> </Text>
            </View>
          ) : (
            erMedicineItems.map((item, i) => (
              <View key={item.id || i} style={i === erMedicineItems.length - 1 ? s.tRowLast : s.tRow}>
                <Text style={s.tCell3}>{dash(item.genericName)}</Text>
                <Text style={s.tCell3}>{dash(item.quantityDosageRoute)}</Text>
                <Text style={s.tCell3Last}>{dash(item.totalCost)}</Text>
              </View>
            ))
          )}
        </View>

        <Bar title="VI. Outcome of Treatment" />
        <View style={s.outcomeRow}>
          {["Discharged", "Improved", "HAMA", "Expired", "Absconded", "Transferred"].map((opt) => (
            <View key={opt} style={s.outcomeItem}>
              <View style={[s.checkBox, doctorEntry.outcomeOfTreatment === opt ? s.checkBoxChecked : null]} />
              <Text style={s.checkLabel}>{opt.toUpperCase()}</Text>
            </View>
          ))}
        </View>
        {["Absconded", "Transferred", "Expired"].includes(doctorEntry.outcomeOfTreatment) && (
          <Text style={[s.blkVal, { marginBottom: 2 }]}>Reason: {dash(doctorEntry.outcomeOfTreatmentReason)}</Text>
        )}

        <Bar title="VII. Certification of Health Care Professional" />
        <Text style={s.certifyText}>
          I certify that the above information given in this form, including all attachments, are true and correct.
        </Text>
        <View style={s.sigRow}>
          <View style={s.sigBlock}>
            <View style={s.sigLine} />
            <Text style={[s.sigCaption, { fontFamily: "Helvetica-Bold", color: C.dark, fontSize: 8 }]}>
              {dash(doctorEntry.attendingPrintedName)}
            </Text>
            <Text style={s.sigCaption}>Signature over Printed Name of Attending Health Care Professional</Text>
            <Text style={s.sigCaption}>License No. / PTR: {dash(doctorEntry.attendingLicenseNumber)}</Text>
          </View>
          <View style={{ width: 90 }}>
            <View style={s.sigLine} />
            <Text style={[s.sigCaption, { fontFamily: "Helvetica-Bold", color: C.dark, fontSize: 8 }]}>
              {formatDate(doctorEntry.attendingCertifiedDate) || "—"}
            </Text>
            <Text style={s.sigCaption}>Date Signed</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>E. ZARATE HOSPITAL  |  PhilHealth CF4</Text>
          <Text>Generated on {generatedOn}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}