import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";
import logoImg from "../../assets/logo.jpg";

// Plain black-on-white, ruled-paper styling — deliberately matches the
// pre-printed "MEDICAL CERTIFICATE" pad (see ErDischargePDF.jsx, which
// uses the same approach for its own printed form) rather than the
// teal/rounded look the rest of this app's PDFs use.
//
// Sized to the CONTENT, not to a full A4 sheet — same "custom page size"
// approach DoctorConsultationPDF.jsx / NurseConsultationPDF.jsx already use
// via their own LONG_SIZE constant, just shorter instead of longer. A
// Medical Certificate's content (letterhead, patient info, the five ruled
// clinical blocks, disposition, disclaimer, signature) only ever runs
// ~650-680pt tall — rendering it on a full A4 canvas (841.89pt) left
// ~160-190pt of dead white space between the signature and the footer.
// Width is kept at A4's own width (595.28pt) since every field width in
// this file was tuned against that measurement; only the height shrinks.
// If a certificate's text content is ever unusually long, @react-pdf's
// normal automatic pagination still kicks in and flows the overflow onto
// a second page — this isn't a hard cap, just a much closer-fitting one.
const CERT_SIZE = [595.28, 700];

const C = {
  black: "#0f172a",
  mid: "#334155",
  line: "#0f172a",
  rule: "#94a3b8",
};

const s = StyleSheet.create({
  page: {
    paddingTop: 26, paddingBottom: 30,
    paddingHorizontal: 40,
    fontSize: 9, fontFamily: "Times-Roman", color: C.black,
  },

  // Letterhead — hospital name/address on the left, seal + tagline on the
  // right, same placement as the printed pad.
  headerRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    borderBottomWidth: 1.5, borderBottomColor: C.black,
    paddingBottom: 8, marginBottom: 10,
  },
  hospName: { fontSize: 17, fontFamily: "Times-Bold", letterSpacing: 0.5 },
  hospSub: { fontSize: 7.5, color: C.mid, marginTop: 2 },
  sealCol: { alignItems: "center", width: 70 },
  seal: {
    width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: "#cbd5e1",
    overflow: "hidden",
  },
  sealImg: { width: 52, height: 52, objectFit: "cover" },

  title: {
    fontSize: 13, fontFamily: "Times-Bold", textAlign: "center",
    textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 14,
  },

  // Label: value lines
  fieldRow: { flexDirection: "row", marginBottom: 6, alignItems: "flex-end" },
  fLabel: { fontSize: 8.5, fontFamily: "Times-Bold", marginRight: 4 },
  fValue: {
    flex: 1, fontSize: 9.5, borderBottomWidth: 0.75, borderBottomColor: C.line,
    paddingBottom: 1, minHeight: 12,
  },

  // Ruled multi-line blocks for the descriptive/clinical fields
  blockWrap: { marginBottom: 6 },
  blockLabel: { fontSize: 8.5, fontFamily: "Times-Bold", marginBottom: 2 },
  ruledBox: { borderWidth: 0.5, borderColor: C.rule },
  ruledLineText: {
    fontSize: 9, minHeight: 13, paddingHorizontal: 2, paddingTop: 2,
    borderBottomWidth: 0.5, borderBottomColor: C.rule,
  },

  disclaimer: {
    marginTop: 4, marginBottom: 6,
    fontSize: 7, fontFamily: "Times-Italic", color: C.mid, lineHeight: 1.5,
  },

  sigRow: { marginTop: 16, alignItems: "flex-start" },
  sigLine: { width: 260, borderBottomWidth: 1, borderBottomColor: C.black, height: 22 },
  sigName: { fontSize: 9.5, fontFamily: "Times-Bold", marginTop: 3 },
  sigLabel: { fontSize: 7.5, fontFamily: "Times-Italic", color: C.mid },
  sigMetaRow: { flexDirection: "row", gap: 30, marginTop: 8 },
  sigMeta: { fontSize: 8.5 },

  footer: {
    position: "absolute", bottom: 16, left: 40, right: 40,
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

// Renders a block of text as individual ruled lines, matching the way
// ErDischargePDF fills in its own multi-line boxes, so longer typed
// content still reads like it belongs on a ruled pad instead of one
// unbroken paragraph.
function RuledBlock({ label, value, lines }) {
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

  const rowCount = Math.max(lines, rowsOut.length);
  const filled = Array.from({ length: rowCount }, (_, i) => rowsOut[i] || "");

  return (
    <View style={s.blockWrap}>
      <Text style={s.blockLabel}>{label}:</Text>
      <View style={s.ruledBox}>
        {filled.map((line, i) => (
          <Text key={i} style={s.ruledLineText}>{line}</Text>
        ))}
      </View>
    </View>
  );
}

export default function MedicalCertificatePDF({ form }) {
  const generatedOn = new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });

  return (
    <Document title={`Medical Certificate - ${form.patientName || "Patient"}`} author="E. ZARATE HOSPITAL">
      <Page size={CERT_SIZE} style={s.page}>

        {/* Letterhead — matches the printed pad's layout */}
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

        <Text style={s.title}>Medical Certificate</Text>

        {/* Patient info — same order as the printed pad */}
        <View style={s.fieldRow}>
          <FieldLine label="Patient's Name" value={form.patientName} />
          <View style={{ width: 10 }} />
          <FieldLine label="Age" value={form.age} width={70} />
          <View style={{ width: 10 }} />
          <FieldLine label="Date" value={form.date} width={110} />
        </View>
        <View style={s.fieldRow}>
          <FieldLine label="Occupation" value={form.occupation} />
          <View style={{ width: 10 }} />
          <FieldLine label="Classification" value={form.classification} width={160} />
        </View>
        <View style={s.fieldRow}>
          <FieldLine label="Address" value={form.address} />
          <View style={{ width: 10 }} />
          <FieldLine label="Inclusive Dates of Treatment" value={form.inclusiveDatesOfTreatment} width={190} />
        </View>

        {/* Clinical details — ruled multi-line blocks, matching the pad's
            large write-in areas for each of these */}
        <RuledBlock label="Subjective Complaints" value={form.subjectiveComplaints} lines={2} />
        <RuledBlock label="Pertinent Physical Examination Findings" value={form.pertinentPhysicalExaminationFindings} lines={3} />
        <RuledBlock label="Ancillary Examination Done" value={form.ancillaryExaminationDone} lines={2} />
        <RuledBlock label="Clinical Diagnosis" value={form.clinicalDiagnosis} lines={2} />
        <RuledBlock label="Medicine Prescription" value={form.medicinePrescription} lines={3} />

        <FieldLine label="Disposition/Recommendations" value={form.disposition} />

        {/* Disclaimer, verbatim from the printed pad */}
        <Text style={s.disclaimer}>
          Date In the Medical Certificate is based on actual medical records, issued upon the request and/or consent
          of the patient; Unless otherwise ordered by the court by way of subpoena duces tecum, medical records of
          the patient shall deemed confidential. For inquiries and verification, please contact the medical records
          section, at phone number here above indicated.
        </Text>

        {/* Attending physician signature */}
        <View style={s.sigRow}>
          <View style={s.sigLine} />
          <Text style={s.sigName}>{dash(form.attendingPhysician)}{form.attendingPhysician ? ", M.D." : ""}</Text>
          <Text style={s.sigLabel}>Name and Signature of Attending Physician</Text>
          <View style={s.sigMetaRow}>
            <Text style={s.sigMeta}>Lic. No.: {dash(form.licNo)}</Text>
            <Text style={s.sigMeta}>PTR no.: {dash(form.ptrNo)}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>E. ZARATE HOSPITAL  |  Medical Certificate</Text>
          <Text>Generated on {generatedOn}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}