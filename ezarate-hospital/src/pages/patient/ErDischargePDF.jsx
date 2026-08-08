import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";
import logoImg from "../../assets/logo.jpg";

// Plain black-on-white, ruled-paper styling — deliberately NOT the
// teal/rounded look the rest of this app's PDFs use, so this prints as a
// faithful replica of the actual pre-printed Emergency Room Discharge
// Instruction Form rather than a modern report.
const C = {
  black: "#0f172a",
  mid: "#334155",
  line: "#0f172a",
  rule: "#94a3b8",
};

const s = StyleSheet.create({
  page: {
    paddingTop: 30, paddingBottom: 36,
    paddingHorizontal: 40,
    fontSize: 9, fontFamily: "Times-Roman", color: C.black,
  },

  // Letterhead
  headerRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    borderBottomWidth: 1.5, borderBottomColor: C.black,
    paddingBottom: 8, marginBottom: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  seal: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: "#cbd5e1",
    marginRight: 10, overflow: "hidden",
  },
  sealImg: { width: 44, height: 44, objectFit: "cover" },
  hospName: { fontSize: 15, fontFamily: "Times-Bold", letterSpacing: 0.5 },
  hospSub: { fontSize: 7.5, color: C.mid, marginTop: 1 },
  hospNoLabel: { fontSize: 8, fontFamily: "Times-Bold" },
  hospNoLine: {
    fontSize: 11, fontFamily: "Times-Bold", textAlign: "right",
    borderBottomWidth: 1, borderBottomColor: C.black, minWidth: 90, paddingBottom: 2,
  },

  title: {
    fontSize: 11, fontFamily: "Times-Bold", textAlign: "center",
    textTransform: "uppercase", letterSpacing: 1, marginBottom: 14,
  },

  // Label: value lines
  fieldRow: { flexDirection: "row", marginBottom: 7, alignItems: "flex-end" },
  fLabel: { fontSize: 8.5, fontFamily: "Times-Bold", marginRight: 4 },
  fValue: {
    flex: 1, fontSize: 9.5, borderBottomWidth: 0.75, borderBottomColor: C.line,
    paddingBottom: 1, minHeight: 12,
  },

  sectionDivider: { borderTopWidth: 0.5, borderTopColor: C.rule, marginTop: 4, marginBottom: 8, paddingTop: 6 },
  sectionLabel: { fontSize: 8.5, fontFamily: "Times-Bold", textTransform: "uppercase", marginBottom: 5 },

  // Ancillaries — two ruled columns of 7, matching the printed form
  ancillaryRow: { flexDirection: "row", marginBottom: 10 },
  ancillaryCol: { flex: 1 },
  checkItem: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  checkBox: {
    width: 8, height: 8, borderWidth: 1, borderColor: C.black,
    marginRight: 5, alignItems: "center", justifyContent: "center",
  },
  checkBoxMark: { fontSize: 6.5, fontFamily: "Times-Bold" },
  checkLabel: { fontSize: 8.5 },

  // Ruled boxes for Final Diagnosis / Treatment
  ruledBoxRow: { flexDirection: "row", gap: 16, marginBottom: 4 },
  ruledBoxCol: { flex: 1 },
  ruledBox: { borderWidth: 0.5, borderColor: C.rule },
  ruledLineText: {
    fontSize: 9, minHeight: 16, paddingHorizontal: 2, paddingTop: 2,
    borderBottomWidth: 0.5, borderBottomColor: C.rule,
  },

  // Take home medications table
  table: { borderWidth: 1, borderColor: C.black, marginTop: 2, marginBottom: 4 },
  tHeadRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.black },
  tRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.black, minHeight: 16 },
  tCellNo: {
    width: 18, padding: 3, fontSize: 8, color: C.mid, textAlign: "center",
    borderRightWidth: 0.5, borderRightColor: C.black,
  },
  tCellHeadNo: {
    width: 18, padding: 3, fontSize: 7.5, fontFamily: "Times-Bold", textAlign: "center",
    borderRightWidth: 0.5, borderRightColor: C.black,
  },
  tCell: { flex: 1, padding: 3, fontSize: 8.5, borderRightWidth: 0.5, borderRightColor: C.black },
  tCellLast: { flex: 1, padding: 3, fontSize: 8.5 },
  tCellHead: {
    flex: 1, padding: 3, fontSize: 7.5, fontFamily: "Times-Bold",
    borderRightWidth: 0.5, borderRightColor: C.black,
  },
  tCellHeadLast: { flex: 1, padding: 3, fontSize: 7.5, fontFamily: "Times-Bold" },

  sigRow: { flexDirection: "row", marginTop: 26, gap: 24 },
  sigBlock: { flex: 1 },
  sigLine: { borderBottomWidth: 1, borderBottomColor: C.black, height: 20 },
  sigLabel: { fontSize: 8, fontFamily: "Times-Bold", textAlign: "center", marginTop: 3 },

  footer: {
    position: "absolute", bottom: 18, left: 40, right: 40,
    flexDirection: "row", justifyContent: "space-between",
    fontSize: 6.5, color: C.mid,
    borderTopWidth: 0.5, borderTopColor: C.rule, paddingTop: 4,
  },
});

const dash = (v) => (v && String(v).trim() ? String(v) : "");

function FieldLine({ label, value, width }) {
  return (
    <View style={[s.fieldRow, width ? { width } : { flex: 1 }]}>
      <Text style={s.fLabel}>{label}:</Text>
      <Text style={s.fValue}>{dash(value)}</Text>
    </View>
  );
}

function Check({ checked, label }) {
  return (
    <View style={s.checkItem}>
      <View style={s.checkBox}>{checked ? <Text style={s.checkBoxMark}>X</Text> : null}</View>
      <Text style={s.checkLabel}>{label}</Text>
    </View>
  );
}

// Same order as the printed form: 7 tests in the left column, 7 in the
// right, then Xray/Others on their own full-width lines below both.
const ANCILLARY_COL_1 = [
  { key: "cbc", label: "CBC w/ PC" },
  { key: "na", label: "Na+" },
  { key: "k", label: "K+" },
  { key: "cl", label: "Cl-" },
  { key: "ua", label: "UA" },
  { key: "fa", label: "FA" },
  { key: "ecg12L", label: "12-L ECG" },
];
const ANCILLARY_COL_2 = [
  { key: "hgt", label: "HGT" },
  { key: "hba1c", label: "HbA1c" },
  { key: "crea", label: "Crea" },
  { key: "sgot", label: "SGOT" },
  { key: "sgpt", label: "SGPT" },
  { key: "bun", label: "BUN" },
  { key: "bua", label: "BUA" },
];

// Renders a block of text as individual ruled lines (~5 lines tall) so it
// reads like handwriting on the pre-printed form's ruled box, instead of
// one plain paragraph.
function RuledBlock({ value, lines = 6 }) {
  const text = dash(value);
  const words = text.split(/\s+/).filter(Boolean);
  // Rough greedy wrap — good enough at this font size/column width; the
  // form is meant to be read, not measured to the pixel.
  const rowsOut = [];
  let current = "";
  const maxCharsPerLine = 46;
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

  const filled = Array.from({ length: lines }, (_, i) => rowsOut[i] || "");
  return (
    <View style={s.ruledBox}>
      {filled.map((line, i) => (
        <Text key={i} style={s.ruledLineText}>{line}</Text>
      ))}
    </View>
  );
}

export default function ErDischargePDF({ form }) {
  const generatedOn = new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  const ancillaries = form.ancillaries || {};
  const medications = (form.medications || []).filter((m) => m.medicine || m.dosage || m.time);
  const medRows = Array.from({ length: 9 }, (_, i) => medications[i] || { medicine: "", dosage: "", time: "" });

  return (
    <Document title={`ER Discharge Instructions - ${form.hospitalNo || form.patientName}`} author="E. ZARATE HOSPITAL">
      <Page size="LEGAL" style={s.page}>

        {/* Letterhead */}
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <View style={s.seal}><Image src={logoImg} style={s.sealImg} /></View>
            <View>
              <Text style={s.hospName}>E. ZARATE HOSPITAL</Text>
              <Text style={s.hospSub}>16 J. Aguilar Avenue, Talon II, Las Piñas City, Metro Manila, Philippines</Text>
              <Text style={s.hospSub}>Tel Nos: (02) 871-1990 / (02) 8028-5503 / (02) 878-6905</Text>
              <Text style={s.hospSub}>Email: ezaratehospital@yahoo.com</Text>
            </View>
          </View>
          <View>
            <Text style={s.hospNoLabel}>Hospital No.</Text>
            <Text style={s.hospNoLine}>{dash(form.hospitalNo)}</Text>
          </View>
        </View>

        <Text style={s.title}>Emergency Room Discharge Instruction Form</Text>

        {/* Patient info */}
        <FieldLine label="Patient's Name" value={form.patientName} />
        <View style={s.fieldRow}>
          <FieldLine label="Age" value={form.age} width={90} />
          <View style={{ width: 10 }} />
          <FieldLine label="Sex" value={form.sex} width={140} />
        </View>
        <View style={s.fieldRow}>
          <FieldLine label="Address" value={form.address} />
        </View>
        <View style={s.fieldRow}>
          <FieldLine label="D.O.B." value={form.dob} width={160} />
          <View style={{ width: 10 }} />
          <FieldLine label="Nurse on Duty" value={form.nurseOnDuty} />
        </View>
        <View style={s.fieldRow}>
          <FieldLine label="Date/Time Attended" value={form.dateTimeAttended} />
        </View>
        <FieldLine label="Chief Complaint/s" value={form.chiefComplaints} />

        {/* Ancillaries done */}
        <View style={s.sectionDivider}>
          <Text style={s.sectionLabel}>Ancillaries Done</Text>
          <View style={s.ancillaryRow}>
            <View style={s.ancillaryCol}>
              {ANCILLARY_COL_1.map((item) => (
                <Check key={item.key} checked={!!ancillaries[item.key]} label={item.label} />
              ))}
            </View>
            <View style={s.ancillaryCol}>
              {ANCILLARY_COL_2.map((item) => (
                <Check key={item.key} checked={!!ancillaries[item.key]} label={item.label} />
              ))}
            </View>
          </View>
          <FieldLine label="Xray" value={form.xray ? `Yes — ${form.xrayNote || ""}`.trim() : form.xrayNote} />
          <FieldLine label="Others" value={form.others ? `Yes — ${form.othersNote || ""}`.trim() : form.othersNote} />
        </View>

        {/* Final diagnosis / Treatment given */}
        <View style={s.sectionDivider}>
          <View style={s.ruledBoxRow}>
            <View style={s.ruledBoxCol}>
              <Text style={s.sectionLabel}>Final Diagnosis</Text>
              <RuledBlock value={form.finalDiagnosis} lines={6} />
            </View>
            <View style={s.ruledBoxCol}>
              <Text style={s.sectionLabel}>Treatment / Medication Given</Text>
              <RuledBlock value={form.treatmentGiven} lines={6} />
            </View>
          </View>
        </View>

        {/* Discharge details */}
        <View style={s.sectionDivider}>
          <FieldLine label="Date and Time of Discharge" value={form.dateTimeDischarge} />
          <FieldLine label="Condition Upon Discharge" value={form.conditionUponDischarge} />
          <FieldLine label="Disposition" value={form.disposition} />
        </View>

        {/* Take home medications */}
        <View style={s.sectionDivider}>
          <Text style={s.sectionLabel}>Take Home Medications</Text>
          <View style={s.table}>
            <View style={s.tHeadRow}>
              <Text style={s.tCellHeadNo}>#</Text>
              <Text style={s.tCellHead}>Medicine</Text>
              <Text style={s.tCellHead}>Dosage</Text>
              <Text style={s.tCellHeadLast}>Time</Text>
            </View>
            {medRows.map((row, i) => (
              <View key={i} style={s.tRow}>
                <Text style={s.tCellNo}>{i + 1}</Text>
                <Text style={s.tCell}>{dash(row.medicine)}</Text>
                <Text style={s.tCell}>{dash(row.dosage)}</Text>
                <Text style={s.tCellLast}>{dash(row.time)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Follow-up */}
        <View style={s.sectionDivider}>
          <FieldLine label="Follow-up Examination" value={form.followUpExamination} />
        </View>

        {/* Physician signature */}
        <View style={s.sigRow}>
          <View style={s.sigBlock}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>E.R. Physician on Duty{form.erPhysician ? ` — ${form.erPhysician}` : ""}</Text>
          </View>
          <View style={{ width: 140 }}>
            <View style={s.sigLine} />
            <Text style={s.sigLabel}>Date{form.physicianDate ? ` — ${form.physicianDate}` : ""}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>E. ZARATE HOSPITAL  |  ER Discharge Instruction Form</Text>
          <Text>Generated on {generatedOn}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}