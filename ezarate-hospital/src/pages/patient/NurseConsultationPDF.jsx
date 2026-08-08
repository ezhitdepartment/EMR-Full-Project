// Nurse Consultation / Patient Intake Form — PAGE 1 is a deliberate,
// field-for-field replica of the hospital's existing PAPER intake form
// (Personal Details -> Health Coverage -> Emergency Contact Person ->
// Allergies -> Pertinent Past Medical/Surgical History -> Active Diagnoses
// -> Active Medication -> Consent), printed on LONG bond paper (8.5" x
// 13", same as the physical form) instead of A4/Letter like the other
// PDFs in this app.
//
// Everything a nurse captures in the Consultation Form that ISN'T on that
// paper form — Family Medical History, Social History (smoking/alcohol/
// drugs), Sexually Active, OB-GYNE History, Immunizations, Review of
// Systems, Blood Type, and the NCD High-Risk Assessment — goes on PAGE 2
// instead, in the app's usual bar-header report style (not a paper
// replica, since there's no paper equivalent to match).
//
// This is intentionally separate from ConsultationRecordPDF (which prints
// EITHER role's entry through one generic template) — only nurse-authored
// entries (er_nurse / opd_nurse) use this component. See
// handleViewConsultationEntryPdf() in PatientProfile.jsx for the
// role-based switch.
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import logoImg from "../../assets/logo.jpg";

// Long bond paper: 8.5in x 13in, in points (1in = 72pt).
const LONG_SIZE = [612, 936];

const C = {
  ink: "#0f172a",
  mid: "#334155",
  faint: "#64748b",
  barBg: "#e2e8f0",
  lightBar: "#0f172a",
  bg: "#f8fafc",
  border: "#cbd5e1",
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

  fieldsPad: { padding: 8 },
  fRow: { flexDirection: "row", marginBottom: 6, alignItems: "flex-end" },
  fCell: { flexDirection: "row", alignItems: "flex-end", marginRight: 10 },
  fLabel: { fontSize: 6.8, marginRight: 4 },
  fUnderline: { flex: 1, borderBottomWidth: 0.7, borderBottomColor: C.ink, paddingBottom: 1, minHeight: 9 },
  fValue: { fontSize: 7.8, fontFamily: "Helvetica-Bold" },

  boxArea: { minHeight: 40, padding: 8 },
  boxLineText: { fontSize: 7.6, lineHeight: 1.5 },

  consentText: { fontSize: 6.6, lineHeight: 1.45, padding: 8 },
  signRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: C.ink },
  signCell: { flex: 1, padding: 8, borderRightWidth: 1, borderRightColor: C.ink },
  signCellLast: { flex: 2, padding: 8 },

  // ── Page 2: additional nurse intake data (report style) ────────────
  headerRow2: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: "#0f766e",
    paddingBottom: 6,
    marginBottom: 8,
  },
  hospName2: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  hospSub2: { fontSize: 7, color: C.faint, marginTop: 1 },
  docLabel2: { fontSize: 6.5, color: C.faint, textAlign: "right" },
  docTitle2: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#0f766e", textAlign: "right" },

  bar2: {
    backgroundColor: C.ink,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 2,
  },
  bar2Text: {
    color: "#ffffff",
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  row2: { flexDirection: "row", marginBottom: 4 },
  col2: { flex: 1, paddingRight: 10 },
  blk2: { backgroundColor: C.bg, padding: 5, borderRadius: 2, lineHeight: 1.4, marginBottom: 4, fontSize: 7.5 },
  emptyText2: { fontSize: 7, color: C.faint, fontFamily: "Helvetica-Oblique", marginBottom: 3 },

  listItem2: { flexDirection: "row", marginBottom: 2 },
  bullet2: { width: 7, fontSize: 7 },
  listText2: { flex: 1, fontSize: 7, lineHeight: 1.35 },

  lr2: { flexDirection: "row", marginBottom: 2.5 },
  ll2: { width: 150, fontSize: 7, color: C.faint },
  lv2: { flex: 1, fontSize: 7, fontFamily: "Helvetica-Bold" },

  qTable2: { borderWidth: 0.5, borderColor: C.border, borderRadius: 2, marginBottom: 3 },
  qRow2: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    paddingVertical: 2.5,
    paddingHorizontal: 5,
  },
  qQuestion2: { flex: 1, fontSize: 6.3, paddingRight: 6 },
  qAnswer2: { width: 58, fontSize: 6.3, fontFamily: "Helvetica-Bold", textAlign: "right" },
});

// ── Page 1 helpers ──────────────────────────────────────────────────────
function CheckBox({ checked }) {
  return <View style={[s.checkbox, checked && s.checkboxChecked]} />;
}

function FieldLine({ label, value, flex = 1 }) {
  return (
    <View style={[s.fCell, { flex }]}>
      <Text style={s.fLabel}>{label}:</Text>
      <View style={s.fUnderline}>
        <Text style={s.fValue}>{value || ""}</Text>
      </View>
    </View>
  );
}

function SectionBar({ children }) {
  return (
    <View style={s.sectionBar}>
      <Text style={s.sectionBarText}>{children}</Text>
    </View>
  );
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

function ListBlock2({ items }) {
  if (!items?.length) return <Text style={s.emptyText2}>None recorded.</Text>;
  return items.map((item, i) => (
    <View key={i} style={s.listItem2}>
      <Text style={s.bullet2}>•</Text>
      <Text style={s.listText2}>{item.text || item.condition || String(item)}</Text>
    </View>
  ));
}

function QRow2({ q, a }) {
  return (
    <View style={s.qRow2}>
      <Text style={s.qQuestion2}>{q}</Text>
      <Text style={s.qAnswer2}>{a || "—"}</Text>
    </View>
  );
}

export default function NurseConsultationPDF({ patient = {}, form = {}, generatedBy = "" }) {
  const fullName = [patient.firstName, patient.middleName, patient.lastName, patient.suffix]
    .filter(Boolean)
    .join(" ");
  const genderValue = form.gender || patient.sex || "";
  const dob = splitDOB(form.dateOfBirth || patient.dateOfBirth);
  const isFemale = genderValue.toLowerCase() === "female";

  const pastMedicalItems = (form.pastMedicalHistory || [])
    .map((item) => item.text || item.condition || String(item))
    .filter(Boolean);
  const surgicalNote =
    form.surgicalHistoryEnabled && form.surgicalHistoryDetails
      ? `Surgical History: ${form.surgicalHistoryDetails}`
      : "";
  const pastMedicalSurgicalText = [pastMedicalItems.join("; "), surgicalNote].filter(Boolean).join("\n");

  const maritalOptions = ["Single", "Married", "Separated", "Widowed"];
  const maritalIsOther = form.maritalStatus && !maritalOptions.includes(form.maritalStatus);

  const smokingActive = form.isSmoker === "YES" || form.isSmoker === "USED TO SMOKE";
  const drinkingActive = form.isDrinker === "YES" || form.isDrinker === "USED TO DRINK";
  const chestPainYes = form.chestPainPressure === "YES";

  return (
    <Document title={`Nurse Consultation - ${fullName}`} author="E. ZARATE HOSPITAL">
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
                  <Text style={s.fValue}>{form.age || "—"}</Text>
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

          {/* PERSONAL DETAILS */}
          <SectionBar>Personal Details</SectionBar>
          <View style={s.fieldsPad}>
            <View style={s.fRow}>
              <FieldLine label="Residential Address" value={form.residentialAddress} />
            </View>
            <View style={s.fRow}>
              <FieldLine label="Phone No. (Home)" value={form.phoneHome} />
              <FieldLine label="(Work)" value={form.phoneWork} />
              <FieldLine label="(Cell.)" value={form.phoneCell} />
            </View>
            <View style={s.fRow}>
              <FieldLine label="Email Address" value={form.email} flex={2} />
              <FieldLine label="Occupation" value={form.occupation} />
            </View>
            <View style={s.fRow}>
              <FieldLine label="Employer's Name" value={form.employerName} flex={2} />
              <FieldLine label="Employer's Contact Details" value={form.employerContact} />
            </View>
            <View style={s.fRow}>
              <FieldLine label="Work Address" value={form.workAddress} />
            </View>
            <View style={s.fRow}>
              <FieldLine label="Nationality" value={form.nationality} />
              <FieldLine label="Religion" value={form.religion} />
            </View>
            <View style={[s.fRow, { alignItems: "center", flexWrap: "wrap" }]}>
              <Text style={s.fLabel}>Marital Status:</Text>
              {maritalOptions.map((opt) => (
                <View key={opt} style={{ flexDirection: "row", alignItems: "center", marginRight: 8 }}>
                  <CheckBox checked={form.maritalStatus === opt} />
                  <Text style={[s.checkLabel, { marginRight: 4 }]}>{opt}</Text>
                </View>
              ))}
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <CheckBox checked={maritalIsOther} />
                <Text style={[s.checkLabel, { marginRight: 4 }]}>Other:</Text>
                <View style={{ width: 90, borderBottomWidth: 0.7, borderBottomColor: C.ink, paddingBottom: 1 }}>
                  <Text style={s.fValue}>{maritalIsOther ? form.maritalStatus : ""}</Text>
                </View>
              </View>
            </View>
            <View style={s.fRow}>
              <FieldLine label="Name of Spouse (if applicable)" value={form.spouseName} flex={2} />
              <FieldLine label="Contact Nos." value={form.spouseContact} />
            </View>
            <View style={s.fRow}>
              <FieldLine label="Name of Mother" value={form.motherName} flex={2} />
              <FieldLine label="Contact Nos." value={form.motherContact} />
            </View>
            <View style={[s.fRow, { marginBottom: 0 }]}>
              <FieldLine label="Name of Father" value={form.fatherName} flex={2} />
              <FieldLine label="Contact Nos." value={form.fatherContact} />
            </View>
          </View>

          {/* HEALTH COVERAGE */}
          <SectionBar>Health Coverage</SectionBar>
          <View style={s.fieldsPad}>
            <View style={[s.fRow, { alignItems: "center" }]}>
              <Text style={s.fLabel}>Phil health Member:</Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginRight: 10 }}>
                <CheckBox checked={form.philhealthMember === "NN"} />
                <Text style={[s.checkLabel, { marginRight: 8 }]}>NN</Text>
                <CheckBox checked={form.philhealthMember === "NH"} />
                <Text style={s.checkLabel}>NH</Text>
              </View>
              <FieldLine label="Phil health Identification No. (PIN)" value={form.philhealthPin} flex={2} />
              <FieldLine label="HMO" value={form.hmo} />
            </View>
            <View style={[s.fRow, { marginBottom: 0 }]}>
              <FieldLine label="Type of HMO Coverage" value={form.hmoType} flex={2} />
              <FieldLine label="Cert. No." value={form.certNo} />
            </View>
          </View>

          {/* EMERGENCY CONTACT PERSON */}
          <SectionBar>Emergency Contact Person</SectionBar>
          <View style={s.fieldsPad}>
            <View style={s.fRow}>
              <FieldLine label="Name" value={form.emergencyName} flex={2} />
              <FieldLine label="Relationship to Patient" value={form.emergencyRelationship} />
            </View>
            <View style={s.fRow}>
              <FieldLine label="Address" value={form.emergencyAddress} />
            </View>
            <View style={[s.fRow, { marginBottom: 0 }]}>
              <FieldLine label="Phone No. (Home)" value={form.emergencyPhoneHome} />
              <FieldLine label="(Work)" value={form.emergencyPhoneWork} />
              <FieldLine label="(Cell.)" value={form.emergencyPhoneCell} />
            </View>
          </View>

          {/* ALLERGIES */}
          <SectionBar>Allergies</SectionBar>
          <View style={s.boxArea}>
            <Text style={s.boxLineText}>{form.allergies || ""}</Text>
          </View>

          {/* PERTINENT PAST MEDICAL / SURGICAL HISTORY */}
          <SectionBar>Pertinent Past Medical / Surgical History</SectionBar>
          <View style={s.boxArea}>
            <Text style={s.boxLineText}>{pastMedicalSurgicalText}</Text>
          </View>

          {/* ACTIVE DIAGNOSES */}
          <SectionBar>Active Diagnoses</SectionBar>
          <View style={s.boxArea}>
            <Text style={s.boxLineText}>{form.activeDiagnoses || ""}</Text>
          </View>

          {/* ACTIVE MEDICATION */}
          <SectionBar>Active Medication</SectionBar>
          <View style={[s.boxArea, { flexDirection: "row" }]}>
            <View style={{ flex: 1, borderRightWidth: 1, borderRightColor: C.ink, paddingRight: 8 }}>
              <Text style={s.boxLineText}>{form.activeMedication1 || ""}</Text>
            </View>
            <View style={{ flex: 1, paddingLeft: 8 }}>
              <Text style={s.boxLineText}>{form.activeMedication2 || ""}</Text>
            </View>
          </View>

          {/* CONSENT */}
          <SectionBar>Consent</SectionBar>
          <Text style={s.consentText}>
            E. Zarate Hospital collects your personal information to provide you with necessary health
            care, medical services, and directly related purposes. We strictly adhere to the
            Patient-Physician Confidentiality Rule and will not disclose any of your information to
            disinterested parties without your consent. I hereby consent the Hospital to collect, use
            and disclose my information as required for my Health care.
          </Text>
          <View style={s.signRow}>
            <View style={s.signCell}>
              <Text style={s.smallLabel}>Date</Text>
              <Text style={s.fValue}>{form.consentDate || ""}</Text>
            </View>
            <View style={s.signCellLast}>
              <Text style={s.smallLabel}>
                Printed Name and Signature of Patient or Authorized Representative
              </Text>
              <Text style={s.fValue}>{form.consentSignature || ""}</Text>
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>Generated by {generatedBy || "—"} · E. ZARATE HOSPITAL, Nurse Consultation Form (page 1 of 2)</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* ══════════════════ PAGE 2 — everything else the nurse captures ══════════════════ */}
      <Page size={LONG_SIZE} style={s.page}>
        <View style={s.headerRow2}>
          <View>
            <Text style={s.hospName2}>E. ZARATE HOSPITAL</Text>
            <Text style={s.hospSub2}>Nurse Consultation — Additional Intake Information</Text>
          </View>
          <View>
            <Text style={s.docLabel2}>Patient</Text>
            <Text style={s.docTitle2}>{fullName || "—"}</Text>
          </View>
        </View>

        {/* Family Medical History */}
        <Bar2>Family Medical History</Bar2>
        <ListBlock2 items={form.familyMedicalHistory} />

        {/* Social History */}
        <Bar2>Social History</Bar2>
        <View style={s.row2}>
          <View style={s.col2}>
            <InfoRow2 label="Smoking" value={form.isSmoker} />
            {smokingActive && (
              <InfoRow2
                label="Details"
                value={`${form.cigaretteType || "?"}, ${form.cigarettesPerDay || "?"}/day, ${
                  form.yearsSmoking || "?"
                } yrs`}
              />
            )}
            <InfoRow2 label="Alcohol" value={form.isDrinker} />
            {drinkingActive && (
              <InfoRow2
                label="Details"
                value={`${form.alcoholType || "?"}, ${form.numberOfBottles || "?"} bottle(s)`}
              />
            )}
          </View>
          <View style={s.col2}>
            <InfoRow2 label="Illegal Drug Use" value={form.isDrugUser} />
            {form.drugRemarks && <InfoRow2 label="Drug Remarks" value={form.drugRemarks} />}
            <InfoRow2 label="Sexually Active" value={form.isSexuallyActive} />
            {form.sexualActivityRemarks && (
              <InfoRow2 label="Sexual Activity Remarks" value={form.sexualActivityRemarks} />
            )}
          </View>
        </View>

        {/* OB-GYNE History (female patients only) */}
        {isFemale && (
          <>
            <Bar2>OB-GYNE History</Bar2>
            <View style={s.row2}>
              <View style={s.col2}>
                <InfoRow2 label="No. of Pregnancies" value={form.noOfPregnancies} />
                <InfoRow2 label="No. of Deliveries" value={form.noOfDeliveries} />
                <InfoRow2 label="Type of Delivery" value={form.typeOfDelivery} />
                <InfoRow2 label="Full Term" value={form.fullTerm} />
                <InfoRow2 label="Premature" value={form.premature} />
                <InfoRow2 label="No. of Abortions" value={form.noOfAbortions} />
              </View>
              <View style={s.col2}>
                <InfoRow2 label="Age of First Menstruation" value={form.ageOfFirstMenstruation} />
                <InfoRow2 label="Last Menstrual Period" value={form.lastMenstrualPeriod} />
                <InfoRow2 label="Duration" value={form.menstrualDuration} />
                <InfoRow2 label="Interval/Cycle" value={form.menstrualInterval} />
                <InfoRow2 label="Pads per Day" value={form.padsPerDay} />
                <InfoRow2 label="Age of First Sexual Intercourse" value={form.ageOfFirstSexualIntercourse} />
              </View>
            </View>
          </>
        )}

        {/* Immunizations / Review of Systems / Blood Type */}
        <Bar2>Immunizations / Review of Systems / Blood Type</Bar2>
        <Text style={s.blk2}>
          {form.immunizationsEnabled && form.immunizationsDetails
            ? `Immunizations: ${form.immunizationsDetails}`
            : "Immunizations: none recorded."}
        </Text>
        <Text style={s.blk2}>
          {form.reviewOfSystemsEnabled && form.reviewOfSystemsDetails
            ? `Review of Systems: ${form.reviewOfSystemsDetails}`
            : "Review of Systems: none recorded."}
        </Text>
        <View style={s.row2}>
          <Text style={[s.blk2, { flex: 1 }]}>
            Blood Type: {form.bloodTypeEnabled && form.bloodType ? form.bloodType : "Not on file"}
          </Text>
          {form.bloodTypeEnabled && form.bloodTypeRemarks && (
            <Text style={[s.blk2, { flex: 1 }]}>Remarks: {form.bloodTypeRemarks}</Text>
          )}
        </View>

        {/* NCD High-Risk Assessment */}
        <Bar2>NCD High-Risk Assessment</Bar2>
        {form.ncdAssessmentEnabled ? (
          <View style={s.qTable2}>
            <QRow2 q="Eats processed/fast foods and ihaw-ihaw weekly?" a={form.eatsProcessedFastFoodsWeekly} />
            <QRow2 q="Eats 3 servings of vegetables daily?" a={form.eats3VegetablesDaily} />
            <QRow2 q="2-3 servings of fruits daily?" a={form.eats2to3FruitsDaily} />
            <QRow2 q="At least 2.5 hrs/week moderate physical activity?" a={form.physicalActivity} />
            <QRow2 q="Diagnosed with diabetes?" a={form.diagnosedDiabetes} />
            <QRow2 q="With medication?" a={form.diabetesWithMedication} />
            <QRow2
              q="Polyphagia / Polydipsia / Polyuria?"
              a={[form.polyphagia, form.polydipsia, form.polyuria].filter(Boolean).join(" / ") || "—"}
            />
            <QRow2
              q="Raised blood glucose / lipids?"
              a={[form.raisedBloodGlucose, form.raisedBloodLipids].filter(Boolean).join(" / ") || "—"}
            />
            <QRow2
              q="Urine ketones / protein?"
              a={[form.urineKetones, form.urineProtein].filter(Boolean).join(" / ") || "—"}
            />
            <QRow2 q="Chest pain/pressure/heaviness?" a={form.chestPainPressure} />
            {chestPainYes && (
              <>
                <QRow2 q="Pain center of chest / left arm, worse on exertion?" a={form.painCenterChestOrArm} />
                <QRow2 q="Gets it walking uphill or hurrying?" a={form.painWalkingUphill} />
                <QRow2 q="Slows down if pain occurs while walking?" a={form.slowsDownWithPain} />
                <QRow2
                  q="Relieved by rest/tablet, resolves in under 10 min?"
                  a={
                    [form.painGoesAwayRestOrTablet, form.painGoesAwayUnder10Min].filter(Boolean).join(" / ") || "—"
                  }
                />
                <QRow2 q="Severe chest pain lasting 30+ minutes?" a={form.severeChestPain30Min} />
              </>
            )}
            <QRow2 q="Angina or Heart Attack?" a={form.anginaOrHeartAttack} />
            <QRow2 q="Stroke symptoms (weakness/numbness/speech)?" a={form.strokeSymptoms} />
            <QRow2 q="Possible Stroke or TIA?" a={form.strokeOrTIA} />
            <QRow2 q="Overall Risk Level" a={form.riskLevel} />
          </View>
        ) : (
          <Text style={s.emptyText2}>Not assessed.</Text>
        )}

        <View style={s.footer} fixed>
          <Text>Generated by {generatedBy || "—"} · E. ZARATE HOSPITAL, Nurse Consultation Form (page 2 of 2)</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}