import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";
import logoImg from "../../assets/logo.jpg";

const C = {
  teal: "#0f766e",
  dark: "#1e293b",
  mid: "#64748b",
  light: "#94a3b8",
  border: "#cbd5e1",
  bg: "#f8fafc",
  white: "#ffffff",
};

const s = StyleSheet.create({
  page: {
    paddingTop: 28, paddingBottom: 32,
    paddingHorizontal: 32,
    fontSize: 8, fontFamily: "Helvetica", color: C.dark,
  },

  // ── Header ──
  headerRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2, borderBottomColor: C.teal,
    paddingBottom: 6, marginBottom: 6,
  },
  hospHeaderLeft: { flexDirection: "row", alignItems: "center" },
  logoImg: { width: 40, height: 40, marginRight: 8 },
  hospName: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  hospSub:  { fontSize: 7, color: C.mid, marginTop: 1 },
  recLabel: { fontSize: 7, color: C.mid, textAlign: "right" },
  recNo:    { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.teal, textAlign: "right", letterSpacing: 1 },

  // ── Confidentiality clause ──
  clauseBox: {
    borderWidth: 1, borderColor: C.border,
    backgroundColor: C.bg, borderRadius: 2,
    padding: 5, marginBottom: 6,
  },
  clauseText: { fontSize: 6.5, color: C.mid, lineHeight: 1.4, fontFamily: "Helvetica-Oblique" },

  // ── Section bar ──
  bar: {
    backgroundColor: C.dark, paddingVertical: 3, paddingHorizontal: 6,
    marginTop: 6, marginBottom: 4, borderRadius: 2,
  },
  barText: { color: C.white, fontSize: 7.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.4 },

  // ── Generic row of columns ──
  row: { flexDirection: "row", marginBottom: 4 },
  col: { flex: 1, paddingRight: 8 },
  col2: { flex: 2, paddingRight: 8 },

  fLabel: { fontSize: 6, color: C.light, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 1 },
  fValue: { fontSize: 8, fontFamily: "Helvetica-Bold", borderBottomWidth: 0.5, borderBottomColor: C.border, paddingBottom: 1 },

  // ── Inline label:value line (single row) ──
  lr: { flexDirection: "row", marginBottom: 2 },
  ll: { width: 110, fontSize: 7.5, color: C.mid },
  lv: { flex: 1, fontSize: 7.5, fontFamily: "Helvetica-Bold" },

  // ── Text block (textarea) ──
  blk: { marginBottom: 5 },
  blkLabel: { fontSize: 6, color: C.light, textTransform: "uppercase", marginBottom: 1 },
  blkVal: { fontSize: 7.5, backgroundColor: C.bg, padding: 4, borderRadius: 2, lineHeight: 1.4, minHeight: 20 },

  // ── Two-column block ──
  twoCol: { flexDirection: "row", gap: 8 },
  twoItem: { flex: 1 },

  // ── Vitals ──
  vitalsRow: { flexDirection: "row", gap: 4, marginBottom: 5 },
  vBox: {
    flex: 1, backgroundColor: C.bg,
    borderWidth: 0.5, borderColor: C.border,
    borderRadius: 2, paddingVertical: 4, alignItems: "center",
  },
  vLabel: { fontSize: 6, color: C.light },
  vValue: { fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 1 },

  // ── Consent ──
  consentWriteBox: {
    borderWidth: 1, borderColor: C.border,
    backgroundColor: C.bg, borderRadius: 2,
    minHeight: 36, marginBottom: 6, padding: 5,
  },
  consentWriteText: { fontSize: 7.5, color: C.dark, lineHeight: 1.4 },
  consentParaBox: {
    borderWidth: 1, borderColor: C.border,
    borderRadius: 2, padding: 8, marginTop: 2,
  },
  consentText: { fontSize: 7, color: C.mid, lineHeight: 1.5, textAlign: "center", fontFamily: "Helvetica-Oblique", marginBottom: 10 },
  consentSigRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  consentSigNarrow: { width: 100, alignItems: "center" },
  consentSigWide: { flex: 1, alignItems: "center" },
  consentSigLine: {
    width: "100%", borderBottomWidth: 1, borderBottomColor: C.dark,
    height: 20, marginBottom: 3, justifyContent: "flex-end", alignItems: "center",
  },
  consentSigValue: { fontSize: 8, fontFamily: "Helvetica-Bold", textAlign: "center" },
  consentSigLabel: { fontSize: 6.5, color: C.mid, textAlign: "center" },

  // ── Signature rows ──
  sigRow: { flexDirection: "row", marginTop: 16, gap: 16 },
  sigBlock: { flex: 1, alignItems: "center" },
  sigBlockNarrow: { width: 110, alignItems: "center" },
  sigLine: { width: "100%", borderBottomWidth: 1, borderBottomColor: C.dark, height: 24, marginBottom: 3 },
  sigName: { fontSize: 7.5, fontFamily: "Helvetica-Bold", textAlign: "center" },
  sigSub: { fontSize: 6.5, color: C.mid, textAlign: "center" },

  // ── Footer ──
  footer: {
    position: "absolute", bottom: 16, left: 32, right: 32,
    flexDirection: "row", justifyContent: "space-between",
    fontSize: 6.5, color: C.light,
    borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 4,
  },
});

const dash = (v) => (v && String(v).trim() ? String(v) : "—");
const join = (...args) => args.filter(Boolean).join(" / ");

function LR({ label, value }) {
  return (
    <View style={s.lr}>
      <Text style={s.ll}>{label}</Text>
      <Text style={s.lv}>{dash(value)}</Text>
    </View>
  );
}

function Blk({ label, value, rows = 2 }) {
  return (
    <View style={s.blk}>
      <Text style={s.blkLabel}>{label}</Text>
      <Text style={[s.blkVal, { minHeight: rows * 11 }]}>{dash(value)}</Text>
    </View>
  );
}

function Bar({ title }) {
  return <View style={s.bar}><Text style={s.barText}>{title}</Text></View>;
}

function VBox({ label, value }) {
  return (
    <View style={s.vBox}>
      <Text style={s.vLabel}>{label}</Text>
      <Text style={s.vValue}>{dash(value)}</Text>
    </View>
  );
}

function ColField({ label, value }) {
  return (
    <View style={s.col}>
      <Text style={s.fLabel}>{label}</Text>
      <Text style={s.fValue}>{dash(value)}</Text>
    </View>
  );
}

export default function PatientRecordPDF({ form }) {
  const generatedOn = new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });

  return (
    <Document title={`Patient Record - ${form.hospitalRecordNo}`} author="E. ZARATE HOSPITAL">

      {/* ════════════════════════════════════════
          PAGE 1 — PATIENT REGISTRATION FORM
          ════════════════════════════════════════ */}
      <Page size="LEGAL" style={s.page}>

        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.hospHeaderLeft}>
            <Image src={logoImg} style={s.logoImg} />
            <View>
              <Text style={s.hospName}>E. ZARATE HOSPITAL</Text>
              <Text style={s.hospSub}>DOH-Licensed & PhA-Member Level I Hospital</Text>
              <Text style={s.hospSub}>16 J. Aguilar Ave., Talon, Las Piñas City  |  0917-538-2440  |  ezaratehospital@yahoo.com</Text>
            </View>
          </View>
          <View>
            <Text style={s.recLabel}>Hospital Record No.</Text>
            <Text style={s.recNo}>{form.hospitalRecordNo}</Text>
          </View>
        </View>

        {/* Confidentiality Clause */}
        <View style={s.clauseBox}>
          <Text style={s.clauseText}>
            CONFIDENTIALITY CLAUSE: All information that may permit identification of an individual, practice, or an establishment will be held confidential, and shall be used only by persons engaged in and for the purpose of the patient's medical treatment. All information will not be disclosed, released, or used for any other purpose without the consent of the patient or other authorized persons.
          </Text>
        </View>

        {/* Patient Information */}
        <Bar title="Patient Information" />
        <View style={s.row}>
          <ColField label="Last Name" value={form.lastName} />
          <ColField label="First Name" value={form.firstName} />
          <ColField label="Middle Name" value={form.middleName} />
          <ColField label="Age" value={form.age} />
          <ColField label="Gender" value={form.gender} />
          <ColField label="Date of Birth" value={form.dateOfBirth} />
        </View>

        {/* Personal Details */}
        <Bar title="Personal Details" />
        <View style={s.row}>
          <View style={s.col2}><Text style={s.fLabel}>Residential Address</Text><Text style={s.fValue}>{dash(form.residentialAddress)}</Text></View>
          <ColField label="Phone (Home)" value={form.phoneHome} />
          <ColField label="Phone (Work)" value={form.phoneWork} />
          <ColField label="Cell No." value={form.phoneCell} />
        </View>
        <View style={s.row}>
          <ColField label="Email Address" value={form.email} />
          <ColField label="Occupation" value={form.occupation} />
          <ColField label="Employer's Name" value={form.employerName} />
          <ColField label="Employer's Contact" value={form.employerContact} />
        </View>
        <View style={s.row}>
          <View style={s.col2}><Text style={s.fLabel}>Work Address</Text><Text style={s.fValue}>{dash(form.workAddress)}</Text></View>
          <ColField label="Nationality" value={form.nationality} />
          <ColField label="Religion" value={form.religion} />
          <ColField label="Marital Status" value={form.maritalStatus} />
        </View>
        <View style={s.row}>
          <ColField label="Name of Spouse" value={form.spouseName} />
          <ColField label="Spouse Contact" value={form.spouseContact} />
          <ColField label="Name of Mother" value={form.motherName} />
          <ColField label="Mother's Contact" value={form.motherContact} />
        </View>
        <View style={s.row}>
          <ColField label="Name of Father" value={form.fatherName} />
          <ColField label="Father's Contact" value={form.fatherContact} />
          <View style={s.col} /><View style={s.col} />
        </View>

        {/* Health Coverage */}
        <Bar title="Health Coverage" />
        <View style={s.row}>
          <ColField label="PhilHealth Member" value={form.philhealthMember} />
          <ColField label="PhilHealth ID No. (PIN)" value={form.philhealthPin} />
          <ColField label="HMO" value={form.hmo} />
          <ColField label="Type of HMO Coverage" value={form.hmoType} />
          <ColField label="Cert. No." value={form.certNo} />
        </View>

        {/* Emergency Contact */}
        <Bar title="Emergency Contact Person" />
        <View style={s.row}>
          <ColField label="Name" value={form.emergencyName} />
          <ColField label="Relationship to Patient" value={form.emergencyRelationship} />
          <ColField label="Phone (Home)" value={form.emergencyPhoneHome} />
          <ColField label="Phone (Work)" value={form.emergencyPhoneWork} />
          <ColField label="Cell No." value={form.emergencyPhoneCell} />
        </View>
        <View style={s.row}>
          <View style={{ flex: 1 }}><Text style={s.fLabel}>Address</Text><Text style={s.fValue}>{dash(form.emergencyAddress)}</Text></View>
        </View>

        {/* Allergies */}
        <Bar title="Allergies" />
        <Blk label="Known Allergies" value={form.allergies} rows={2} />

        {/* Medical History */}
        <Bar title="Pertinent Past Medical / Surgical History" />
        <Blk label="Medical / Surgical History" value={form.medicalHistory} rows={2} />

        {/* Active Diagnoses */}
        <Bar title="Active Diagnoses" />
        <Blk label="Active Diagnoses" value={form.activeDiagnoses} rows={2} />

        {/* Active Medication */}
        <Bar title="Active Medication" />
        <View style={s.twoCol}>
          <View style={s.twoItem}><Blk label="Medication (Column 1)" value={form.activeMedication1} rows={3} /></View>
          <View style={s.twoItem}><Blk label="Medication (Column 2)" value={form.activeMedication2} rows={3} /></View>
        </View>

        {/* Consent — writable box (same format as Active Medication) */}
        <Bar title="Consent" />
        <View style={s.consentWriteBox}>
          <Text style={s.consentWriteText}>{dash(form.consentNotes)}</Text>
        </View>

        {/* Consent paragraph box — contains text + Date + Signature inside */}
        <View style={s.consentParaBox}>
          <Text style={s.consentText}>
            E. ZARATE HOSPITAL collects your personal information to provide you with necessary health care, medical services, and directly related purposes. We strictly adhere to the Patient-Physician Confidentiality Rule and will not disclose any of your information to disinterested parties without your consent. I hereby consent the Hospital to collect, use and disclose my information as required for my Health care.
          </Text>
          <View style={s.consentSigRow}>
            <View style={s.consentSigNarrow}>
              <View style={s.consentSigLine}>
                <Text style={s.consentSigValue}>{dash(form.consentDate)}</Text>
              </View>
              <Text style={s.consentSigLabel}>Date</Text>
            </View>
            <View style={s.consentSigWide}>
              <View style={s.consentSigLine}>
                <Text style={s.consentSigValue}>{dash(form.consentSignature)}</Text>
              </View>
              <Text style={s.consentSigLabel}>Printed Name and Signature of Patient or Authorized Representative</Text>
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>E. ZARATE HOSPITAL  |  Patient Registration Form</Text>
          <Text>Generated on {generatedOn}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      {/* ════════════════════════════════════════
          PAGE 2 — VISIT / OPD RECORD
          ════════════════════════════════════════ */}
      <Page size="LEGAL" style={s.page}>

        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.hospHeaderLeft}>
            <Image src={logoImg} style={s.logoImg} />
            <View>
              <Text style={s.hospName}>E. ZARATE HOSPITAL</Text>
              <Text style={s.hospSub}>DOH-Licensed & PhA-Member Level I Hospital</Text>
              <Text style={s.hospSub}>16 J. Aguilar Ave., Talon, Las Piñas City  |  0917-538-2440  |  ezaratehospital@yahoo.com</Text>
            </View>
          </View>
          <View>
            <Text style={s.recLabel}>Hospital Record No.</Text>
            <Text style={s.recNo}>{form.hospitalRecordNo}</Text>
          </View>
        </View>

        {/* Patient Information — auto-filled */}
        <Bar title="Patient Information" />
        <View style={s.row}>
          <ColField label="Last Name" value={form.lastName} />
          <ColField label="First Name" value={form.firstName} />
          <ColField label="Middle Name" value={form.middleName} />
          <ColField label="Age" value={form.age} />
          <ColField label="Gender" value={form.gender} />
          <ColField label="Date of Birth" value={form.dateOfBirth} />
        </View>

        {/* Visit Details + Vital Signs side by side */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 2 }}>
          <View style={{ flex: 1 }}>
            <Bar title="Visit Details" />
            <View style={s.row}>
              <ColField label="Date of Visit" value={form.dateOfVisit} />
              <ColField label="Time" value={form.timeOfVisit} />
            </View>
            <View style={s.row}>
              <ColField label="Nurse on Duty" value={form.nurseOnDuty} />
              <ColField label="Resident on Duty" value={form.residentOnDuty} />
            </View>
            <View style={s.row}>
              <View style={{ flex: 1 }}><Text style={s.fLabel}>Classification</Text><Text style={s.fValue}>{dash(form.classification)}</Text></View>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Bar title="Vital Signs" />
            <View style={s.vitalsRow}>
              <VBox label="Temp (°C)" value={form.temperature} />
              <VBox label="Cardiac Rate" value={form.cardiacRate} />
              <VBox label="Resp. Rate" value={form.respiratoryRate} />
            </View>
            <View style={[s.vitalsRow, { marginTop: 4 }]}>
              <VBox label="Blood Pressure" value={form.bloodPressure} />
              <VBox label="Weight (kg)" value={form.weight} />
              <VBox label="O2 SAT (%)" value={form.o2sat} />
            </View>
            <View style={[s.vitalsRow, { marginTop: 4 }]}>
              <VBox label="Height (cm)" value={form.height} />
              <VBox label="BMI" value={form.bmi} />
            </View>
            <View style={[s.vitalsRow, { marginTop: 4 }]}>
              <VBox label="Left Vision" value={form.leftVision} />
              <VBox label="Right Vision" value={form.rightVision} />
            </View>
          </View>
        </View>

        {/* Chief Complaints & Objective Findings */}
        <Bar title="Clinical Notes" />
        <Blk label="Patient's Subjective / Chief Complaints" value={form.chiefComplaints} rows={3} />
        <Blk label="Pertinent P.E. / Objective Findings" value={form.objectiveFindings} rows={3} />

        {/* Diagnostics */}
        <Bar title="Diagnostic, Ancillaries and Results" />
        <View style={s.twoCol}>
          <View style={s.twoItem}><Blk label="Results (Column 1)" value={form.diagnosticLeft} rows={4} /></View>
          <View style={s.twoItem}><Blk label="Results (Column 2)" value={form.diagnosticRight} rows={4} /></View>
        </View>

        {/* Physician's Impression */}
        <Bar title="Physician's Impression / Diagnosis" />
        <Blk label="Impression / Diagnosis" value={form.physicianImpression} rows={3} />

        {/* Treatment */}
        <Bar title="Treatment Done & Medication Given" />
        <View style={s.twoCol}>
          <View style={s.twoItem}><Blk label="Treatment (Column 1)" value={form.treatmentLeft} rows={4} /></View>
          <View style={s.twoItem}><Blk label="Treatment (Column 2)" value={form.treatmentRight} rows={4} /></View>
        </View>

        {/* Disposition & Referral */}
        <Bar title="Disposition & Referral" />
        <Blk label="Disposition" value={form.disposition} rows={2} />
        <View style={s.row}>
          <ColField label="Referred To" value={form.referredTo} />
          <ColField label="Follow-up Examination" value={form.followUpExamination} />
        </View>

        {/* OPD Nurse & Physician Signatures */}
        <View style={s.sigRow}>
          <View style={s.sigBlock}>
            <View style={s.sigLine} />
            <Text style={s.sigName}>{dash(form.opdNurse)}</Text>
            <Text style={s.sigSub}>OPD Nurse</Text>
            <Text style={s.sigSub}>Signature over Printed Name (Please use TRODAT)</Text>
          </View>
          <View style={s.sigBlock}>
            <View style={s.sigLine} />
            <Text style={s.sigName}>{dash(form.physician)}</Text>
            <Text style={s.sigSub}>Physician</Text>
            <Text style={s.sigSub}>Signature over Printed Name (Please use TRODAT)</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>E. ZARATE HOSPITAL  |  Visit / OPD Record</Text>
          <Text>Generated on {generatedOn}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}