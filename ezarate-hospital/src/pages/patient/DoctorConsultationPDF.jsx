// Doctor Consultation Record — PAGE 1 is a deliberate, field-for-field
// replica of the hospital's existing PAPER "OPD Consultation Record" form
// (Hospital Record No. -> Patient's Name/Age/Gender/DOB -> Visit Details ->
// Vital Signs -> Patient's Subjective/Chief Complaints -> Pertinent P.E./
// Objective Findings -> Diagnostic, Ancillaries and Results -> Physician's
// Impression/Diagnosis -> Treatment Done & Medication Given -> Disposition
// -> Referred To / Follow-up Examination -> OPD Nurse / Physician
// signatures), printed on LONG bond paper (8.5" x 13", same as the
// physical form), exactly the same paper-size convention
// NurseConsultationPDF.jsx already uses for the nurse's own paper form.
//
// Everything the doctor captures in the Consultation Form that ISN'T on
// that paper form — History of Present Illness, ICD-10 diagnosis codes,
// the structured Diagnostics/Signs-and-Symptoms/Physical-Examination
// checklists, the full itemized Medicine Prescription (Sig included),
// Course in the Ward, PhilHealth CF4 admission/discharge fields, and the
// Certification block — goes on PAGE 2 instead, in the app's usual
// bar-header report style (not a paper replica, since there's no paper
// equivalent to match). This mirrors NurseConsultationPDF's page 1 / page
// 2 split exactly.
//
// Only doctor/admin-authored entries use this component — see
// handleViewConsultationEntryPdf() in PatientProfile.jsx for the
// role-based switch (nurse entries use NurseConsultationPDF instead).
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import logoImg from "../../assets/logo.jpg";
import { ageInYears } from "../../utils/age";
import { PE_SYSTEMS } from "./ConsultationForm";

// Long bond paper: 8.5in x 13in, in points (1in = 72pt) — same as the
// physical form and as NurseConsultationPDF.jsx.
const LONG_SIZE = [612, 936];

const C = {
  ink: "#0f172a",
  mid: "#334155",
  faint: "#64748b",
  barBg: "#e2e8f0",
  bg: "#f8fafc",
  border: "#cbd5e1",
  teal: "#0f766e",
  white: "#ffffff",
};

const s = StyleSheet.create({
  // ── Shared ──────────────────────────────────────────────────────────
  page: {
    paddingTop: 24,
    paddingBottom: 30,
    paddingHorizontal: 26,
    fontSize: 7.6,
    fontFamily: "Helvetica",
    color: C.ink,
  },
  footer: {
    position: "absolute",
    bottom: 12,
    left: 26,
    right: 26,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 5.5,
    color: C.faint,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 3,
  },

  // ── Page 1: paper-form replica ─────────────────────────────────────
  outerBox: { borderWidth: 1.2, borderColor: C.ink },

  headerRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.ink },
  headerLeft: { width: "45%", padding: 8, borderRightWidth: 1, borderRightColor: C.ink },
  headerRight: { flex: 1 },
  hospTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 },
  seal: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.ink,
    overflow: "hidden",
  },
  sealImg: { width: 26, height: 26, objectFit: "cover" },
  hospName: { fontSize: 15, fontFamily: "Helvetica-Bold", letterSpacing: 0.2 },
  hospSub: { fontSize: 5.8, color: C.mid, marginTop: 1 },
  clauseTitle: { fontFamily: "Helvetica-Bold", fontSize: 5.8 },
  clause: { fontSize: 5.8, color: C.mid, lineHeight: 1.4, marginTop: 6 },

  hrRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.ink, alignItems: "stretch" },
  hrLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", paddingVertical: 5, paddingHorizontal: 8, width: 128 },
  hrValueBox: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: C.ink,
    paddingVertical: 5,
    paddingHorizontal: 8,
    justifyContent: "center",
  },
  hrValue: { fontSize: 11, fontFamily: "Helvetica-Bold" },

  nameBlock: { padding: 8, borderBottomWidth: 1, borderBottomColor: C.ink },
  nameHeading: { fontSize: 7, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  nameLine: { flexDirection: "row", marginBottom: 4, alignItems: "flex-end" },
  nameLabel: { fontSize: 6.5, width: 74 },
  nameUnderline: { flex: 1, borderBottomWidth: 0.7, borderBottomColor: C.ink, paddingBottom: 1 },
  nameValue: { fontSize: 8.5, fontFamily: "Helvetica-Bold" },

  bottomHeaderRow: { flexDirection: "row" },
  ageBox: { width: 84, padding: 8, borderRightWidth: 1, borderRightColor: C.ink },
  genderBox: { width: 120, padding: 8, borderRightWidth: 1, borderRightColor: C.ink },
  dobBox: { flex: 1, padding: 8 },
  smallLabel: { fontSize: 6.3, fontFamily: "Helvetica-Bold", marginBottom: 3, textTransform: "uppercase" },

  checkRow: { flexDirection: "row", alignItems: "center", marginBottom: 2 },
  checkbox: { width: 7.5, height: 7.5, borderWidth: 1, borderColor: C.ink },
  checkboxChecked: { backgroundColor: C.ink },
  checkLabel: { fontSize: 6.8, marginLeft: 3 },

  sectionBar: {
    backgroundColor: C.barBg,
    borderTopWidth: 1,
    borderTopColor: C.ink,
    borderBottomWidth: 1,
    borderBottomColor: C.ink,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  sectionBarText: { fontSize: 7.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.3, textTransform: "uppercase" },

  // Visit Details (left) + Vital Signs (right, table)
  visitRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.ink },
  visitLeft: { width: 150, padding: 8, borderRightWidth: 1, borderRightColor: C.ink },
  visitLine: { marginBottom: 5 },
  visitLabel: { fontSize: 6.3, color: C.mid },
  visitUnderline: { borderBottomWidth: 0.7, borderBottomColor: C.ink, paddingBottom: 1, minHeight: 10 },
  visitValue: { fontSize: 7.6, fontFamily: "Helvetica-Bold" },

  vitalsWrap: { flex: 1 },
  vitalsHeading: { fontSize: 7, fontFamily: "Helvetica-Bold", padding: 6, borderBottomWidth: 1, borderBottomColor: C.ink },
  vitalsTableRow: { flexDirection: "row" },
  vitalsCell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: C.ink,
    padding: 6,
  },
  vitalsCellLast: { flex: 1, padding: 6 },
  vitalsLabel: { fontSize: 6, color: C.mid, textTransform: "uppercase", marginBottom: 3 },
  vitalsValue: { fontSize: 8.5, fontFamily: "Helvetica-Bold" },

  boxArea: { minHeight: 42, padding: 8 },
  boxLineText: { fontSize: 7.6, lineHeight: 1.5 },

  twoColBox: { flexDirection: "row" },
  twoColCell: { flex: 1, padding: 8, borderRightWidth: 1, borderRightColor: C.ink, minHeight: 60 },
  twoColCellLast: { flex: 1, padding: 8, minHeight: 60 },
  twoColHeading: { fontSize: 6, fontFamily: "Helvetica-Bold", color: C.mid, marginBottom: 3, textTransform: "uppercase" },
  bulletItem: { flexDirection: "row", marginBottom: 2 },
  bulletDot: { width: 7, fontSize: 7.6 },
  bulletText: { flex: 1, fontSize: 7.6, lineHeight: 1.4 },

  fRow: { flexDirection: "row", padding: 8, borderBottomWidth: 1, borderBottomColor: C.ink },
  fCell: { flexDirection: "row", alignItems: "flex-end", flex: 1, marginRight: 10 },
  fLabel: { fontSize: 6.8, marginRight: 4 },
  fUnderline: { flex: 1, borderBottomWidth: 0.7, borderBottomColor: C.ink, paddingBottom: 1, minHeight: 9 },
  fValue: { fontSize: 7.8, fontFamily: "Helvetica-Bold" },

  signRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: C.ink },
  signCell: { flex: 1, padding: 8, borderRightWidth: 1, borderRightColor: C.ink },
  signCellLast: { flex: 1, padding: 8 },
  signLine: { borderBottomWidth: 0.7, borderBottomColor: C.ink, minHeight: 16, marginBottom: 3 },
  signCaption: { fontSize: 5.8, color: C.mid, textAlign: "center" },

  // ── Page 2: additional doctor-captured clinical data (report style) ─
  headerRow2: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: C.teal,
    paddingBottom: 6,
    marginBottom: 8,
  },
  hospName2: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  hospSub2: { fontSize: 7, color: C.faint, marginTop: 1 },
  docLabel2: { fontSize: 6.5, color: C.faint, textAlign: "right" },
  docTitle2: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.teal, textAlign: "right" },

  bar2: {
    backgroundColor: C.ink,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 2,
  },
  bar2Text: {
    color: C.white,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  row2: { flexDirection: "row", marginBottom: 4 },
  col2: { flex: 1, paddingRight: 10 },
  blk2: { backgroundColor: C.bg, padding: 5, borderRadius: 2, lineHeight: 1.4, marginBottom: 4, fontSize: 7.5 },
  emptyText2: { fontSize: 7, color: C.faint, fontFamily: "Helvetica-Oblique", marginBottom: 3 },

  lr2: { flexDirection: "row", marginBottom: 2.5 },
  ll2: { width: 150, fontSize: 7, color: C.faint },
  lv2: { flex: 1, fontSize: 7, fontFamily: "Helvetica-Bold" },

  icdChip2: {
    fontSize: 6.5,
    marginRight: 4,
    marginBottom: 3,
    backgroundColor: "#f0fdfa",
    borderWidth: 0.5,
    borderColor: "#99f6e4",
    borderRadius: 2,
    paddingVertical: 1.5,
    paddingHorizontal: 4,
  },
  chipRow2: { flexDirection: "row", flexWrap: "wrap" },

  presTable2: { borderWidth: 0.5, borderColor: C.border, borderRadius: 2 },
  presHeadRow2: { flexDirection: "row", backgroundColor: C.bg, paddingVertical: 3, paddingHorizontal: 5 },
  presRow2: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
  presMed2: { flex: 2, fontSize: 7 },
  presQty2: { width: 34, fontSize: 7, textAlign: "center" },
  presInst2: { flex: 3, fontSize: 7 },
  presHead2: { fontSize: 6, fontFamily: "Helvetica-Bold", color: C.mid, textTransform: "uppercase" },
});

// ── Page 1 helpers ──────────────────────────────────────────────────────
function CheckBox({ checked }) {
  return <View style={[s.checkbox, checked && s.checkboxChecked]} />;
}

function SectionBar({ children }) {
  return (
    <View style={s.sectionBar}>
      <Text style={s.sectionBarText}>{children}</Text>
    </View>
  );
}

function VisitLine({ label, value }) {
  return (
    <View style={s.visitLine}>
      <Text style={s.visitLabel}>{label}</Text>
      <View style={s.visitUnderline}>
        <Text style={s.visitValue}>{value || ""}</Text>
      </View>
    </View>
  );
}

function VitalCell({ label, value, last = false }) {
  return (
    <View style={last ? s.vitalsCellLast : s.vitalsCell}>
      <Text style={s.vitalsLabel}>{label}</Text>
      <Text style={s.vitalsValue}>{value || "—"}</Text>
    </View>
  );
}

function BulletList({ items }) {
  if (!items?.length) return <Text style={s.boxLineText}>—</Text>;
  return items.map((item, i) => (
    <View key={i} style={s.bulletItem}>
      <Text style={s.bulletDot}>•</Text>
      <Text style={s.bulletText}>{item}</Text>
    </View>
  ));
}

function formatVisitDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function splitDOB(dob) {
  if (!dob) return { m: "", d: "", y: "" };
  const [y, m, d] = dob.split("-");
  return { m: m || "", d: d || "", y: y || "" };
}

// ── Page 2 helpers ──────────────────────────────────────────────────────
function Bar2({ children }) {
  return (
    <View style={s.bar2}>
      <Text style={s.bar2Text}>{children}</Text>
    </View>
  );
}

function InfoRow2({ label, value }) {
  return (
    <View style={s.lr2}>
      <Text style={s.ll2}>{label}</Text>
      <Text style={s.lv2}>{value || "—"}</Text>
    </View>
  );
}

function ChipRow2({ label, items, emptyText = "None recorded." }) {
  return (
    <View style={{ marginBottom: 4 }}>
      {label && <Text style={s.ll2}>{label}</Text>}
      {items?.length > 0 ? (
        <View style={s.chipRow2}>
          {items.map((name) => (
            <Text key={name} style={s.icdChip2}>
              {name}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={s.emptyText2}>{emptyText}</Text>
      )}
    </View>
  );
}

export default function DoctorConsultationPDF({ patient = {}, form = {}, triage = null, generatedBy = "" }) {
  const fullName = [patient.firstName, patient.middleName, patient.lastName, patient.suffix]
    .filter(Boolean)
    .join(" ");
  const genderValue = form.gender || patient.sex || "";
  const dob = splitDOB(form.dateOfBirth || patient.dateOfBirth);
  const age = ageInYears(form.dateOfBirth || patient.dateOfBirth);
  const bloodPressure =
    triage?.systolic && triage?.diastolic ? `${triage.systolic}/${triage.diastolic} mmHg` : "";

  const diagnosticTests = form.diagnosticsSelected || [];
  const items = (form.prescriptionItems || []).filter((i) => i.medicineName?.trim());

  const hasCf4Admission =
    form.admittingDiagnosis ||
    form.dischargeDiagnosis ||
    form.caseRateCode1 ||
    form.caseRateCode2 ||
    form.dateAdmitted ||
    form.dateDischarged;

  const hasPeChecklists =
    form.peGeneralSurvey?.length > 0 ||
    form.peHeent?.length > 0 ||
    PE_SYSTEMS.some((sys) => form[sys.key]?.length > 0);

  return (
    <Document title={`Consultation Record - ${fullName}`} author="E. ZARATE HOSPITAL">
      {/* ══════════════════ PAGE 1 — paper form replica ══════════════════ */}
      <Page size={LONG_SIZE} style={s.page}>
        <View style={s.outerBox}>
          {/* Header: hospital info + confidentiality clause / record no. + name + age/gender/dob */}
          <View style={s.headerRow}>
            <View style={s.headerLeft}>
              <View style={s.hospTitleRow}>
                <View style={s.seal}>
                  <Image src={logoImg} style={s.sealImg} />
                </View>
                <View>
                  <Text style={s.hospName}>E. ZARATE HOSPITAL</Text>
                  <Text style={s.hospSub}>DOH-LICENSED &amp; PHA-MEMBER LEVEL I HOSPITAL</Text>
                </View>
              </View>
              <Text style={s.clause}>
                <Text style={s.clauseTitle}>CONFIDENTIALITY CLAUSE:  </Text>
                All information that may permit identification of an individual, practice, or an
                establishment will be held confidential, and shall be used only by persons engaged in
                and for the purpose of the patient's medical treatment. All information will not be
                disclosed, released, or used for any other purpose without the consent of the patient
                or other authorized persons.
              </Text>
            </View>

            <View style={s.headerRight}>
              <View style={s.hrRow}>
                <Text style={s.hrLabel}>HOSPITAL RECORD NO.:</Text>
                <View style={s.hrValueBox}>
                  <Text style={s.hrValue}>{patient.hospitalNo || "—"}</Text>
                </View>
              </View>

              <View style={s.nameBlock}>
                <Text style={s.nameHeading}>PATIENTS NAME:</Text>
                <View style={s.nameLine}>
                  <Text style={s.nameLabel}>LAST NAME:</Text>
                  <View style={s.nameUnderline}>
                    <Text style={s.nameValue}>{form.lastName || patient.lastName || ""}</Text>
                  </View>
                </View>
                <View style={s.nameLine}>
                  <Text style={s.nameLabel}>FIRST NAME:</Text>
                  <View style={s.nameUnderline}>
                    <Text style={s.nameValue}>{form.firstName || patient.firstName || ""}</Text>
                  </View>
                </View>
                <View style={[s.nameLine, { marginBottom: 0 }]}>
                  <Text style={s.nameLabel}>MIDDLE NAME:</Text>
                  <View style={s.nameUnderline}>
                    <Text style={s.nameValue}>{form.middleName || patient.middleName || ""}</Text>
                  </View>
                </View>
              </View>

              <View style={s.bottomHeaderRow}>
                <View style={s.ageBox}>
                  <Text style={s.smallLabel}>Age:</Text>
                  <Text style={s.fValue}>{age ?? "—"}</Text>
                </View>
                <View style={s.genderBox}>
                  <Text style={s.smallLabel}>Gender:</Text>
                  <View style={s.checkRow}>
                    <CheckBox checked={genderValue === "Female"} />
                    <Text style={s.checkLabel}>Female</Text>
                  </View>
                  <View style={s.checkRow}>
                    <CheckBox checked={genderValue === "Male"} />
                    <Text style={s.checkLabel}>Male</Text>
                  </View>
                </View>
                <View style={s.dobBox}>
                  <Text style={s.smallLabel}>Date of Birth (Month/Day/Year):</Text>
                  <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
                    <Text style={s.fValue}>{dob.m || "__"}</Text>
                    <Text style={s.fValue}> / </Text>
                    <Text style={s.fValue}>{dob.d || "__"}</Text>
                    <Text style={s.fValue}> / </Text>
                    <Text style={s.fValue}>{dob.y || "____"}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* VISIT DETAILS + VITAL SIGNS */}
          <SectionBar>Visit Details</SectionBar>
          <View style={s.visitRow}>
            <View style={s.visitLeft}>
              <VisitLine label="Date of Visit" value={formatVisitDate(form.createdAt)} />
              <VisitLine label="Time" value={form.visitTime} />
              <VisitLine label="Nurse-on-Duty" value={form.nurseOnDuty} />
              <VisitLine label="Resident-on-Duty" value={form.residentOnDuty} />
              <VisitLine label="Classification" value={form.classification} />
            </View>
            <View style={s.vitalsWrap}>
              <Text style={s.vitalsHeading}>VITAL SIGNS</Text>
              <View style={s.vitalsTableRow}>
                <VitalCell label="Temperature" value={triage?.temperature ? `${triage.temperature} °C` : ""} />
                <VitalCell label="Cardiac Rate" value={triage?.heartRate ? `${triage.heartRate} bpm` : ""} />
                <VitalCell label="Respiratory Rate" value={triage?.respiratoryRate ? `${triage.respiratoryRate} rpm` : ""} />
                <VitalCell label="Blood Pressure" value={bloodPressure} />
                <VitalCell label="Weight" value={triage?.weight ? `${triage.weight} kg` : ""} />
                <VitalCell label="O2 Sat" value={form.o2Sat} last />
              </View>
            </View>
          </View>

          {/* SUBJECTIVE / CHIEF COMPLAINTS */}
          <SectionBar>Patient's Subjective / Chief Complaints</SectionBar>
          <View style={s.boxArea}>
            <Text style={s.boxLineText}>{form.chiefComplaint || ""}</Text>
          </View>

          {/* OBJECTIVE FINDINGS */}
          <SectionBar>Pertinent P.E. / Objective Findings</SectionBar>
          <View style={s.boxArea}>
            <Text style={s.boxLineText}>{form.objectiveFindings || ""}</Text>
          </View>

          {/* DIAGNOSTIC, ANCILLARIES AND RESULTS — two columns */}
          <SectionBar>Diagnostic, Ancillaries and Results</SectionBar>
          <View style={s.twoColBox}>
            <View style={s.twoColCell}>
              <Text style={s.twoColHeading}>Tests Ordered</Text>
              <BulletList items={diagnosticTests} />
            </View>
            <View style={s.twoColCellLast}>
              <Text style={s.twoColHeading}>Results / Notes</Text>
              <Text style={s.boxLineText}>{form.diagnosticsNotes || ""}</Text>
            </View>
          </View>

          {/* PHYSICIAN'S IMPRESSION / DIAGNOSIS */}
          <SectionBar>Physician's Impression / Diagnosis</SectionBar>
          <View style={s.boxArea}>
            {form.icdDiagnoses?.length > 0 && (
              <View style={[s.chipRow2, { marginBottom: 3 }]}>
                {form.icdDiagnoses.map((d) => (
                  <Text key={d.code} style={s.icdChip2}>
                    {d.code} — {d.name}
                  </Text>
                ))}
              </View>
            )}
            <Text style={s.boxLineText}>{form.diagnosis || ""}</Text>
          </View>

          {/* TREATMENT DONE & MEDICATION GIVEN — two columns */}
          <SectionBar>Treatment Done &amp; Medication Given</SectionBar>
          <View style={s.twoColBox}>
            <View style={s.twoColCell}>
              <Text style={s.twoColHeading}>Treatment Done</Text>
              <Text style={s.boxLineText}>{form.medicationOrders || ""}</Text>
            </View>
            <View style={s.twoColCellLast}>
              <Text style={s.twoColHeading}>Medication Given</Text>
              {items.length === 0 ? (
                <Text style={s.boxLineText}>—</Text>
              ) : (
                items.map((item, i) => (
                  <View key={i} style={s.bulletItem}>
                    <Text style={s.bulletDot}>•</Text>
                    <Text style={s.bulletText}>
                      {item.medicineName}
                      {item.milligram ? ` ${item.milligram}` : ""} — Qty {item.quantity}
                      {item.instructions ? ` (${item.instructions})` : ""}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>

          {/* DISPOSITION */}
          <SectionBar>Disposition</SectionBar>
          <View style={s.boxArea}>
            <Text style={s.boxLineText}>
              {[form.disposition, form.dispositionNotes].filter(Boolean).join(" — ")}
            </Text>
          </View>

          {/* REFERRED TO / FOLLOW-UP EXAMINATION */}
          <View style={s.fRow}>
            <View style={s.fCell}>
              <Text style={s.fLabel}>Referred To:</Text>
              <View style={s.fUnderline}>
                <Text style={s.fValue}>{form.referredTo || ""}</Text>
              </View>
            </View>
            <View style={s.fCell}>
              <Text style={s.fLabel}>Follow-up Examination:</Text>
              <View style={s.fUnderline}>
                <Text style={s.fValue}>{form.followUpExamination || ""}</Text>
              </View>
            </View>
          </View>

          {/* SIGNATURES */}
          <View style={s.signRow}>
            <View style={s.signCell}>
              <Text style={s.signLine}> </Text>
              <Text style={s.signCaption}>
                NURSE{"\n"}
                {form.nurseOnDuty || "SIGNATURE OVER PRINTED NAME (Please use TRODAT)"}
              </Text>
            </View>
            <View style={s.signCellLast}>
              <Text style={s.signLine}> </Text>
              <Text style={s.signCaption}>
                PHYSICIAN{"\n"}
                {form.attendingPrintedName || form.attendingSignature || "SIGNATURE OVER PRINTED NAME (Please use TRODAT)"}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>Generated by {generatedBy || "—"} · E. ZARATE HOSPITAL, Doctor Consultation Record (page 1 of 2)</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* ══════════════════ PAGE 2 — everything else the doctor captures ══════════════════ */}
      <Page size={LONG_SIZE} style={s.page}>
        <View style={s.headerRow2}>
          <View>
            <Text style={s.hospName2}>E. ZARATE HOSPITAL</Text>
            <Text style={s.hospSub2}>Doctor Consultation — Additional Clinical Information</Text>
          </View>
          <View>
            <Text style={s.docLabel2}>Patient</Text>
            <Text style={s.docTitle2}>{fullName || "—"}</Text>
          </View>
        </View>

        {/* History of Present Illness */}
        <Bar2>History of Present Illness</Bar2>
        <Text style={s.blk2}>{form.historyOfPresentIllness || "—"}</Text>

        {/* Pertinent Signs and Symptoms on Admission (CF4) */}
        <Bar2>Pertinent Signs and Symptoms on Admission</Bar2>
        <ChipRow2 items={form.admissionSigns} />
        {form.admissionSigns?.includes("Pain") && form.admissionSignsPainSite && (
          <Text style={[s.blk2, { marginTop: -2 }]}>Pain — site: {form.admissionSignsPainSite}</Text>
        )}
        {form.admissionSigns?.includes("Others") && form.admissionSignsOthers && (
          <Text style={[s.blk2, { marginTop: -2 }]}>Others: {form.admissionSignsOthers}</Text>
        )}

        {/* Physical Examination checklists (CF4) */}
        {hasPeChecklists && (
          <>
            <Bar2>Physical Examination</Bar2>
            <ChipRow2 label="General Survey" items={form.peGeneralSurvey} />
            {form.peGeneralSurvey?.includes("Altered sensorium") && form.peGeneralSurveyAlteredSensoriumSpecify && (
              <Text style={[s.blk2, { marginTop: -2 }]}>
                Altered sensorium — specify: {form.peGeneralSurveyAlteredSensoriumSpecify}
              </Text>
            )}
            <ChipRow2 label="HEENT" items={form.peHeent} />
            {form.peHeentOthers && <Text style={[s.blk2, { marginTop: -2 }]}>Others: {form.peHeentOthers}</Text>}
            {PE_SYSTEMS.map((sys) => (
              <View key={sys.key}>
                <ChipRow2 label={sys.label} items={form[sys.key]} />
                {form[sys.othersKey] && (
                  <Text style={[s.blk2, { marginTop: -2 }]}>Others: {form[sys.othersKey]}</Text>
                )}
              </View>
            ))}
          </>
        )}

        {/* Full itemized Medicine Prescription */}
        <Bar2>Medicine Prescription</Bar2>
        {items.length === 0 ? (
          <Text style={s.emptyText2}>No medicines prescribed.</Text>
        ) : (
          <View style={s.presTable2}>
            <View style={s.presHeadRow2}>
              <Text style={[s.presHead2, { flex: 2 }]}>Medicine</Text>
              <Text style={[s.presHead2, { width: 50, textAlign: "center" }]}>Milligram</Text>
              <Text style={[s.presHead2, { width: 34, textAlign: "center" }]}>Qty</Text>
              <Text style={[s.presHead2, { flex: 3 }]}>Instructions (Sig)</Text>
            </View>
            {items.map((item, i) => (
              <View key={i} style={s.presRow2}>
                <Text style={s.presMed2}>{item.medicineName}</Text>
                <Text style={[s.presQty2, { width: 50 }]}>{item.milligram || "—"}</Text>
                <Text style={s.presQty2}>{item.quantity}</Text>
                <Text style={s.presInst2}>{item.instructions || "—"}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Course in the Ward / ED Management */}
        {form.courseInWardEntries?.length > 0 && (
          <>
            <Bar2>Course in the Ward (Doctor's Order/Action) / ED Management</Bar2>
            {form.courseInWardEntries.map((entry, i) => (
              <View key={entry.id || i} style={s.row2}>
                <Text style={[s.ll2, { width: 70 }]}>{entry.date || "—"}</Text>
                <Text style={s.lv2}>{entry.orderAction || "—"}</Text>
              </View>
            ))}
          </>
        )}

        {/* PhilHealth CF4 admission/discharge fields */}
        {hasCf4Admission && (
          <>
            <Bar2>PhilHealth CF4 — Admission / Discharge</Bar2>
            <View style={s.row2}>
              <View style={s.col2}>
                <InfoRow2 label="Admitting Diagnosis" value={form.admittingDiagnosis} />
                <InfoRow2 label="Case Rate Code 1" value={form.caseRateCode1} />
                <InfoRow2 label="Date Admitted" value={form.dateAdmitted} />
              </View>
              <View style={s.col2}>
                <InfoRow2 label="Discharge Diagnosis" value={form.dischargeDiagnosis} />
                <InfoRow2 label="Case Rate Code 2" value={form.caseRateCode2} />
                <InfoRow2 label="Date Discharged" value={form.dateDischarged} />
              </View>
            </View>
            <InfoRow2 label="Outcome of Treatment" value={form.outcomeOfTreatment} />
          </>
        )}

        {/* Certification */}
        <Bar2>Certification of Attending Health Care Professional</Bar2>
        <View style={s.row2}>
          <View style={s.col2}>
            <InfoRow2 label="Printed Name" value={form.attendingPrintedName} />
            <InfoRow2 label="License Number / PTR" value={form.attendingLicenseNumber} />
          </View>
          <View style={s.col2}>
            <InfoRow2 label="Signature" value={form.attendingSignature} />
            <InfoRow2 label="Date" value={form.attendingCertifiedDate} />
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>Generated by {generatedBy || "—"} · E. ZARATE HOSPITAL, Doctor Consultation Record (page 2 of 2)</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}