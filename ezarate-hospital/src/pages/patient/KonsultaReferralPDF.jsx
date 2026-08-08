import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import logoImg from "../../assets/logo.jpg";

// Plain black-on-white, ruled-paper styling — deliberately NOT the
// teal/rounded look the rest of this app's PDFs use, so this prints as a
// faithful replica of the actual pre-printed "Emergency Care Benefit
// Referral to KONSULTA / YAKAP" form rather than a modern report (same
// treatment ErDischargePDF already gives the ER Discharge Instruction Form).
const C = {
  black: "#0f172a",
  mid: "#334155",
  line: "#0f172a",
  rule: "#94a3b8",
};

const dash = (v) => (v && String(v).trim() ? String(v) : "");

const s = StyleSheet.create({
  page: {
    paddingTop: 30, paddingBottom: 36,
    paddingHorizontal: 40,
    fontSize: 9, fontFamily: "Times-Roman", color: C.black,
  },

  // Letterhead
  headerRow: {
    flexDirection: "row", alignItems: "center",
    borderBottomWidth: 1.5, borderBottomColor: C.black,
    paddingBottom: 8, marginBottom: 10,
  },
  seal: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: "#cbd5e1",
    marginRight: 10, overflow: "hidden",
  },
  sealImg: { width: 44, height: 44, objectFit: "cover" },
  hospName: { fontSize: 15, fontFamily: "Times-Bold", letterSpacing: 0.5 },
  hospSub: { fontSize: 7.5, color: C.mid, marginTop: 1 },

  title: {
    fontSize: 12, fontFamily: "Times-Bold", textAlign: "center",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2,
    textDecoration: "underline",
  },
  dateRow: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 10 },
  dateLabel: { fontSize: 8.5, fontFamily: "Times-Bold", marginRight: 4 },
  dateValue: {
    fontSize: 9.5, minWidth: 90, textAlign: "center",
    borderBottomWidth: 0.75, borderBottomColor: C.line, paddingBottom: 1,
  },

  sectionLabel: {
    fontSize: 8.5, fontFamily: "Times-Bold", textTransform: "uppercase",
    marginBottom: 5, marginTop: 8,
  },

  // Label: value lines
  fieldRow: { flexDirection: "row", marginBottom: 7, alignItems: "flex-end" },
  fLabel: { fontSize: 8.5, fontFamily: "Times-Bold", marginRight: 4 },
  fValue: {
    flex: 1, fontSize: 9.5, borderBottomWidth: 0.75, borderBottomColor: C.line,
    paddingBottom: 1, minHeight: 12,
  },

  sectionDivider: { borderTopWidth: 0.5, borderTopColor: C.rule, marginTop: 2, paddingTop: 2 },

  // Ruled boxes for the free-text clinical fields
  ruledBox: { borderWidth: 0.5, borderColor: C.rule, marginBottom: 2 },
  ruledLineText: {
    fontSize: 9, minHeight: 16, paddingHorizontal: 2, paddingTop: 2,
    borderBottomWidth: 0.5, borderBottomColor: C.rule,
  },

  // Footer table
  table: { borderWidth: 1, borderColor: C.black, marginTop: 4 },
  tHeadRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.black },
  tRow: { flexDirection: "row", minHeight: 20 },
  tCellHead: {
    flex: 1, padding: 3, fontSize: 7.5, fontFamily: "Times-Bold", textAlign: "center",
    borderRightWidth: 0.5, borderRightColor: C.black,
  },
  tCellHeadLast: { flex: 1, padding: 3, fontSize: 7.5, fontFamily: "Times-Bold", textAlign: "center" },
  tCell: { flex: 1, padding: 3, fontSize: 8.5, borderRightWidth: 0.5, borderRightColor: C.black },
  tCellLast: { flex: 1, padding: 3, fontSize: 8.5 },

  footer: {
    position: "absolute", bottom: 18, left: 40, right: 40,
    flexDirection: "row", justifyContent: "space-between",
    fontSize: 6.5, color: C.mid,
    borderTopWidth: 0.5, borderTopColor: C.rule, paddingTop: 4,
  },
});

function FieldLine({ label, value, width }) {
  return (
    <View style={[s.fieldRow, width ? { width } : { flex: 1 }]}>
      <Text style={s.fLabel}>{label}:</Text>
      <Text style={s.fValue}>{dash(value)}</Text>
    </View>
  );
}

// Renders a block of text as individual ruled lines so it reads like
// handwriting on the pre-printed form's ruled box, instead of one plain
// paragraph.
function RuledBlock({ label, value, lines = 3 }) {
  const text = dash(value);
  const words = text.split(/\s+/).filter(Boolean);
  const rowsOut = [];
  let current = "";
  const maxCharsPerLine = 96;
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

  const neededLines = Math.max(lines, rowsOut.length);
  const filled = Array.from({ length: neededLines }, (_, i) => rowsOut[i] || "");
  return (
    <View style={s.sectionDivider} wrap={false}>
      <Text style={s.sectionLabel}>{label}</Text>
      <View style={s.ruledBox}>
        {filled.map((line, i) => (
          <Text key={i} style={s.ruledLineText}>{line}</Text>
        ))}
      </View>
    </View>
  );
}

export default function KonsultaReferralPDF({ form }) {
  const generatedOn = new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });

  return (
    <Document
      title={`Konsulta-Yakap Referral - ${form.fullName || "Patient"}`}
      author="E. ZARATE HOSPITAL"
    >
      <Page size="LEGAL" style={s.page}>

        {/* Letterhead */}
        <View style={s.headerRow}>
          <View style={s.seal}><Image src={logoImg} style={s.sealImg} /></View>
          <View>
            <Text style={s.hospName}>E. ZARATE HOSPITAL</Text>
            <Text style={s.hospSub}>16 J. Aguilar Avenue, Talon I, Las Piñas City, Metro Manila, Philippines</Text>
            <Text style={s.hospSub}>Tel. Nos.: (02) 871-1440 / (02) 873-5593 / (02) 874-6905</Text>
            <Text style={s.hospSub}>E-mail: zarateclinic@yahoo.com</Text>
          </View>
        </View>

        <Text style={s.title}>Emergency Care Benefit Referral to KONSULTA / YAKAP</Text>
        <View style={s.dateRow}>
          <Text style={s.dateLabel}>Date of Referral:</Text>
          <Text style={s.dateValue}>{dash(form.dateOfReferral)}</Text>
        </View>

        {/* Referring Hospital */}
        <Text style={[s.sectionLabel, { marginTop: 0 }]}>Referring Hospital</Text>
        <View style={s.fieldRow}>
          <FieldLine label="Name of hospital" value={form.referringHospitalName} />
          <View style={{ width: 16 }} />
          <FieldLine label="Accreditation number" value={form.accreditationNumber} />
        </View>
        <FieldLine label="Address of Hospital" value={form.referringHospitalAddress} />
        <FieldLine label="Emergency Department Attending Physician" value={form.attendingPhysician} />

        {/* Patient Data */}
        <Text style={s.sectionLabel}>Patient Data</Text>
        <FieldLine label="Name" value={form.fullName} />
        <View style={s.fieldRow}>
          <FieldLine label="Age" value={form.age} width={90} />
          <View style={{ width: 10 }} />
          <FieldLine label="Sex" value={form.sex} width={90} />
          <View style={{ width: 10 }} />
          <FieldLine label="PIN" value={form.pin} />
        </View>

        {/* Clinical details — same field order as the printed form */}
        <RuledBlock label="Chief Complaint" value={form.chiefComplaint} lines={2} />
        <RuledBlock label="History of Present illness" value={form.historyOfPresentIllness} lines={4} />
        <RuledBlock label="Physical Examination" value={form.physicalExamination} lines={4} />
        <RuledBlock label="Initial Impression" value={form.initialImpression} lines={3} />
        <RuledBlock label="Management at ED" value={form.managementAtED} lines={3} />
        <RuledBlock label="Final Diagnosis" value={form.finalDiagnosis} lines={3} />
        <RuledBlock label="Recommendations" value={form.recommendations} lines={3} />

        {/* Receiving Konsulta provider — bordered box, same as the printed
            form's bottom-most table row */}
        <View style={s.table} wrap={false}>
          <View style={s.tHeadRow}>
            <Text style={s.tCellHead}>Receiving Konsulta Provider</Text>
            <Text style={s.tCellHeadLast}>Date Received</Text>
          </View>
          <View style={s.tRow}>
            <Text style={s.tCell}>{dash(form.receivingKonsultaProvider)}</Text>
            <Text style={s.tCellLast}>{dash(form.dateReceived)}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>E. ZARATE HOSPITAL  |  Emergency Care Benefit Referral to KONSULTA / YAKAP</Text>
          <Text>Generated on {generatedOn}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
