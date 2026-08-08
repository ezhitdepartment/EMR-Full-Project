// E. Zarate Hospital — Admission and Discharge Record, laid out to match
// the hospital's pre-printed paper form field-for-field (Patient's Name /
// Permanent Address / Tel no-Age-Sex-Civil Status / Birthday-Birthplace-
// Nationality / Religion-Occupation / Father's-Mother's-Spouse Name+
// Address+Tel no / Admission-Discharge-Total no of days / Type of
// admission-Referred by-Admitting Physician / Alert-HMO-Philhealth / Data
// furnished by-Address of informant-Relation to the patient / Admitting
// Diagnosis-ICD Code no. / Final Diagnosis / Accident-Injuries-Poisoning /
// Evaluation-Disposition checkboxes / signature) — same "faithful replica
// of the real form" approach as MedicalAbstractPDF.jsx / CF4PDF.jsx /
// ErDischargePDF.jsx, rather than the dashboard's teal/rounded house
// style.
//
// DATA SOURCE — a single, flat `form` object: the saved Admission and
// Discharge Record document itself (patient_documents, doc_type
// "admitdischarge"), edited on AdmissionDischargeRecordPage.jsx and passed
// straight through to this component with no re-shaping — same "PDF
// renders exactly the saved form" pattern MedicalAbstractPDF.jsx already
// uses. See emptyAdmissionDischargeRecordForm()/
// buildAdmissionDischargeRecordSeed() in admissionDischargeRecordHelpers.js
// for the full field list and where each one is first auto-filled from.

import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";
import logoImg from "../../assets/logo.jpg";
import { ageInYears } from "../../utils/age";

const RECORD_SIZE = [612, 792]; // US Letter — matches the paper form's proportions

const C = {
  black: "#0f172a",
  mid: "#334155",
  rule: "#0f172a",
};

const s = StyleSheet.create({
  page: {
    paddingTop: 28, paddingBottom: 30,
    paddingHorizontal: 36,
    fontSize: 8.5, fontFamily: "Times-Roman", color: C.black,
  },
  headerRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: 6,
  },
  sealCol: { alignItems: "center", width: 56, marginRight: 8 },
  seal: {
    width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: "#cbd5e1",
    overflow: "hidden",
  },
  sealImg: { width: 46, height: 46, objectFit: "cover" },
  hospName: { fontSize: 19, fontFamily: "Times-Bold", letterSpacing: 0.3 },
  hospSub1: { fontSize: 9, fontFamily: "Times-Bold", marginTop: 1 },
  hospSub2: { fontSize: 7, color: C.mid, marginTop: 2 },

  codeCol: { alignItems: "flex-end" },
  codeRow: { flexDirection: "row", marginBottom: 3 },
  codeLabel: { fontSize: 8, fontFamily: "Times-Bold" },
  codeValue: {
    fontSize: 8.5, minWidth: 90, borderBottomWidth: 0.75, borderBottomColor: C.rule,
    marginLeft: 4, textAlign: "center",
  },

  title: {
    fontSize: 12, fontFamily: "Times-Bold", textAlign: "center",
    textTransform: "uppercase", letterSpacing: 1, marginTop: 4, marginBottom: 8,
  },

  table: { borderWidth: 0.75, borderColor: C.rule },
  row: { flexDirection: "row", borderBottomWidth: 0.75, borderColor: C.rule },
  rowLast: { flexDirection: "row" },
  cell: { borderRightWidth: 0.75, borderColor: C.rule, padding: 4 },
  cellLast: { padding: 4 },

  label: { fontSize: 7, fontFamily: "Times-Bold", textTransform: "uppercase", color: C.mid },
  value: { fontSize: 9.5, marginTop: 3 },

  tallCell: { minHeight: 34 },
  taller: { minHeight: 44 },

  checkRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  box: {
    width: 8, height: 8, borderWidth: 0.75, borderColor: C.black,
    alignItems: "center", justifyContent: "center", marginRight: 4,
  },
  boxMark: { fontSize: 7, fontFamily: "Times-Bold", lineHeight: 1 },
  checkLabel: { fontSize: 8.3 },

  sigWrap: { marginTop: 26, alignItems: "flex-end" },
  sigLine: { width: 220, borderBottomWidth: 1, borderBottomColor: C.black, height: 20 },
  sigText: { fontSize: 9, fontFamily: "Times-Bold", marginTop: 2, textAlign: "center", width: 220 },
  sigLabel: { fontSize: 7.5, fontFamily: "Times-Italic", color: C.mid, textAlign: "center", width: 220 },

  footer: {
    position: "absolute", bottom: 14, left: 36, right: 36,
    flexDirection: "row", justifyContent: "space-between",
    fontSize: 6.5, color: C.mid,
    borderTopWidth: 0.5, borderTopColor: "#94a3b8", paddingTop: 4,
  },
});

const dash = (v) => (v && String(v).trim() ? String(v) : "");

function fmtDate(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function fmtTime(v) {
  if (!v) return "";
  const [h, m] = v.split(":");
  if (h === undefined) return v;
  const hour = Number(h);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${m} ${period}`;
}

// A single bordered cell, with a small uppercase label and the value
// beneath it — the basic building block for almost every field on this
// form.
function Cell({ label, value, flex = 1, last, tall, taller }) {
  return (
    <View
      style={[
        last ? s.cellLast : s.cell,
        { flex },
        tall ? s.tallCell : null,
        taller ? s.taller : null,
      ]}
    >
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{dash(value)}</Text>
    </View>
  );
}

// A plain small-caps label used inside custom (non-Cell) cell bodies —
// e.g. "Type of admission" above its checkboxes, or "Evaluation" above its
// free-text + checkbox block.
function LabelBlock({ label }) {
  return <Text style={s.label}>{label}</Text>;
}

function CheckItem({ label, checked }) {
  return (
    <View style={s.checkRow}>
      <View style={s.box}>{checked ? <Text style={s.boxMark}>X</Text> : null}</View>
      <Text style={s.checkLabel}>{label}</Text>
    </View>
  );
}

function Row({ children, last }) {
  return <View style={last ? s.rowLast : s.row}>{children}</View>;
}

// `form` is the saved/editable Admission and Discharge Record document —
// see emptyAdmissionDischargeRecordForm() in
// admissionDischargeRecordHelpers.js for the full field list.
export default function AdmissionDischargeRecordPDF({ form }) {
  const generatedOn = new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  const fullName = [form.lastName, form.firstName, form.middleName].filter(Boolean).join(" ");
  const age = form.birthday ? String(ageInYears(form.birthday) ?? "") : dash(form.age);

  return (
    <Document
      title={`Admission and Discharge Record - ${fullName || "Patient"}`}
      author="E. ZARATE HOSPITAL"
    >
      <Page size={RECORD_SIZE} style={s.page}>
        {/* Hospital header */}
        <View style={s.headerRow}>
          <View style={s.sealCol}>
            <View style={s.seal}><Image src={logoImg} style={s.sealImg} /></View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.hospName}>E. ZARATE HOSPITAL</Text>
            <Text style={s.hospSub1}>DOH-LICENSED &amp; PHA-MEMBER LEVEL I HOSPITAL</Text>
            <Text style={s.hospSub2}>16 J. Aguilar Avenue, Talon 1, Las Piñas City, Metro Manila, Philippines</Text>
            <Text style={s.hospSub2}>Tel Nos. (02) 8874-1440 / (02) 8874-6905 / (02) 8873-5593 · Email: zarateclinic@yahoo.com</Text>
          </View>
          <View style={s.codeCol}>
            <View style={s.codeRow}>
              <Text style={s.codeLabel}>HOSPITAL CODE</Text>
              <Text style={s.codeValue}>{dash(form.hospitalNo)}</Text>
            </View>
            <View style={s.codeRow}>
              <Text style={s.codeLabel}>MEDICAL RECORD NO.</Text>
              <Text style={s.codeValue}>{dash(form.medicalRecordNo)}</Text>
            </View>
          </View>
        </View>

        <Text style={s.title}>Admission and Discharge Record</Text>

        <View style={s.table}>
          {/* Patient's Name */}
          <Row>
            <Cell label="Patient's Name" value="" flex={1.1} />
            <Cell label="Last" value={form.lastName} flex={1} />
            <Cell label="Given" value={form.firstName} flex={1} />
            <Cell label="Middle" value={form.middleName} flex={1} last />
          </Row>

          {/* Permanent Address */}
          <Row>
            <Cell label="Permanent Address" value={form.permanentAddress} flex={1} last />
          </Row>

          {/* Tel no / Age / Sex / Civil Status */}
          <Row>
            <Cell label="Tel no" value={form.telNo} flex={1.3} />
            <Cell label="Age" value={age} flex={0.6} />
            <Cell label="Sex" value={form.sex} flex={0.6} />
            <Cell label="Civil Status" value={form.civilStatus} flex={1} last />
          </Row>

          {/* Birthday / Birthplace / Nationality */}
          <Row>
            <Cell label="Birthday" value={fmtDate(form.birthday)} />
            <Cell label="Birthplace" value={form.birthplace} />
            <Cell label="Nationality" value={form.nationality} last />
          </Row>

          {/* Religion / Occupation */}
          <Row>
            <Cell label="Religion" value={form.religion} />
            <Cell label="Occupation" value={form.occupation} />
            <Cell label="" value="" last />
          </Row>

          {/* Father */}
          <Row>
            <Cell label="Father's Name" value={form.fatherName} />
            <Cell label="Address" value={form.fatherAddress} />
            <Cell label="Tel no" value={form.fatherTelNo} last />
          </Row>

          {/* Mother */}
          <Row>
            <Cell label="Mother's Name" value={form.motherName} />
            <Cell label="Address" value={form.motherAddress} />
            <Cell label="Tel no" value={form.motherTelNo} last />
          </Row>

          {/* Spouse */}
          <Row>
            <Cell label="Spouse Name" value={form.spouseName} />
            <Cell label="Address" value={form.spouseAddress} />
            <Cell label="Tel no" value={form.spouseTelNo} last />
          </Row>

          {/* Admission / Discharge / Total no of days */}
          <Row>
            <Cell
              label="Admission (Date and time)"
              value={[fmtDate(form.dateAdmitted), fmtTime(form.timeAdmitted)].filter(Boolean).join(" · ")}
            />
            <Cell
              label="Discharge (Date and time)"
              value={
                form.dateDischarged
                  ? [fmtDate(form.dateDischarged), fmtTime(form.timeDischarged)].filter(Boolean).join(" · ")
                  : "Still Admitted"
              }
            />
            <Cell label="Total no of days" value={form.totalNoOfDays} last />
          </Row>

          {/* Type of admission / Referred by / Admitting Physician */}
          <Row>
            <View style={s.cell}>
              <LabelBlock label="Type of admission" />
              <View style={{ flexDirection: "row", marginTop: 4, gap: 14 }}>
                <CheckItem label="New" checked={form.admissionType === "New"} />
                <CheckItem label="Old" checked={form.admissionType === "Old"} />
              </View>
            </View>
            <Cell label="Referred by" value={form.referredBy} />
            <Cell label="Admitting Physician" value={form.admittingPhysician} last />
          </Row>

          {/* Alert / HMO / Philhealth */}
          <Row>
            <Cell label="Alert: Allergic to" value={form.allergicTo} />
            <Cell label="HMO" value={form.hmo} />
            <Cell label="Philhealth" value={form.philhealth} last />
          </Row>

          {/* Informant */}
          <Row>
            <Cell label="Data furnished by" value={form.dataFurnishedBy} />
            <Cell label="Address of informant" value={form.addressOfInformant} />
            <Cell label="Relation to the patient" value={form.relationToPatient} last />
          </Row>

          {/* Admitting Diagnosis / ICD Code no. */}
          <Row>
            <Cell label="Admitting Diagnosis" value={form.admittingDiagnosis} flex={2} tall />
            <Cell label="ICD Code no." value={form.admittingIcdCode} flex={1} tall last />
          </Row>

          {/* Final Diagnosis */}
          <Row>
            <Cell label="Final Diagnosis" value={form.finalDiagnosis} flex={1} tall last />
          </Row>

          {/* Accident / Injuries / Poisoning */}
          <Row>
            <View style={[s.cell, s.tallCell, { flex: 1 }]}>
              <LabelBlock label="Accident / Injuries / Poisoning" />
              <Text style={s.value}>{dash(form.accidentInjuriesPoisoning)}</Text>
              <Text style={[s.label, { marginTop: 4 }]}>Place of occurrence</Text>
              <Text style={s.value}>{dash(form.placeOfOccurrence)}</Text>
            </View>
          </Row>

          {/* Evaluation / Disposition */}
          <Row last>
            <View style={[s.cell, s.taller, { flex: 2 }]}>
              <LabelBlock label="Evaluation" />
              <Text style={s.value}>{dash(form.evaluation)}</Text>
              <View style={{ flexDirection: "row", marginTop: 8, gap: 20 }}>
                <View style={{ flex: 1 }}>
                  <CheckItem label="Recovered" checked={form.conditionOnDischarge === "Recovered"} />
                  <CheckItem label="Died" checked={form.conditionOnDischarge === "Died"} />
                  <CheckItem label="(-) 48 hours" checked={form.durationOfStayMarker === "(-) 48 hours"} />
                  <CheckItem label="Autopsy" checked={form.autopsyStatus === "Autopsy"} />
                </View>
                <View style={{ flex: 1 }}>
                  <CheckItem label="Improved" checked={form.conditionOnDischarge === "Improved"} />
                  <CheckItem label="Unimproved" checked={form.conditionOnDischarge === "Unimproved"} />
                  <CheckItem label="(+) 48 hrs" checked={form.durationOfStayMarker === "(+) 48 hrs"} />
                  <CheckItem label="No autopsy" checked={form.autopsyStatus === "No autopsy"} />
                </View>
              </View>
            </View>
            <View style={[s.cellLast, s.taller, { flex: 1 }]}>
              <LabelBlock label="Disposition" />
              <View style={{ marginTop: 8 }}>
                <CheckItem label="Discharge" checked={form.dispositionType === "Discharge"} />
                <CheckItem label="Transferred" checked={form.dispositionType === "Transferred"} />
                <CheckItem label="HAMA" checked={form.dispositionType === "HAMA"} />
                <CheckItem label="Abscond" checked={form.dispositionType === "Abscond"} />
              </View>
            </View>
          </Row>
        </View>

        {/* Signature */}
        <View style={s.sigWrap}>
          <View style={s.sigLine} />
          <Text style={s.sigText}>
            {dash(form.attendingPhysicianName)}
            {form.attendingPhysicianName ? ", M.D." : "MD"}
          </Text>
          <Text style={s.sigLabel}>Attending Physician</Text>
        </View>

        <View style={s.footer} fixed>
          <Text>E. ZARATE HOSPITAL  |  Admission and Discharge Record</Text>
          <Text>Generated on {generatedOn}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
