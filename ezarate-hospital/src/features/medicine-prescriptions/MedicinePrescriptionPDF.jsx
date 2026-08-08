import {
  Document, Page, Text, View, StyleSheet, Image,
} from "@react-pdf/renderer";
import logoImg from "../../assets/logo.jpg";
import { formatAge } from "../../utils/age";
import { formatDateCreated } from "../../utils/medicinePrescriptions";

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
    fontSize: 9, fontFamily: "Helvetica", color: C.dark,
  },

  headerRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2, borderBottomColor: C.teal,
    paddingBottom: 6, marginBottom: 8,
  },
  hospHeaderLeft: { flexDirection: "row", alignItems: "center" },
  logoImg: { width: 40, height: 40, marginRight: 8 },
  hospName: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  hospSub:  { fontSize: 7, color: C.mid, marginTop: 1 },
  recLabel: { fontSize: 7, color: C.mid, textAlign: "right" },
  recNo:    { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.teal, textAlign: "right", letterSpacing: 1 },

  patientRow: {
    flexDirection: "row", marginBottom: 4, paddingBottom: 6,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  col: { flex: 1, paddingRight: 8 },
  fLabel: { fontSize: 6, color: C.light, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 1 },
  fValue: { fontSize: 9, fontFamily: "Helvetica-Bold" },

  rxBody: { flexDirection: "row", marginTop: 12, minHeight: 260 },
  rxSymbol: { fontSize: 32, fontFamily: "Helvetica-Bold", color: C.teal, marginRight: 14, marginTop: -4 },
  rxList: { flex: 1 },

  itemRow: { marginBottom: 12 },
  itemHeaderRow: { flexDirection: "row", alignItems: "baseline" },
  itemNum: { fontSize: 9, fontFamily: "Helvetica-Bold", width: 16 },
  itemName: { fontSize: 10, fontFamily: "Helvetica-Bold" },
  itemQty: { fontSize: 8, color: C.mid, marginLeft: 6 },
  itemSig: { fontSize: 8.5, color: C.dark, marginLeft: 16, marginTop: 2, lineHeight: 1.4 },

  emptyNote: { fontSize: 8.5, color: C.light, fontStyle: "italic", marginLeft: 16 },

  sigRow: { flexDirection: "row", marginTop: 24, gap: 16 },
  sigBlock: { flex: 1, alignItems: "flex-start" },
  sigLine: { width: "100%", borderBottomWidth: 1, borderBottomColor: C.dark, height: 24, marginBottom: 3 },
  sigName: { fontSize: 8.5, fontFamily: "Helvetica-Bold" },
  sigSub: { fontSize: 6.5, color: C.mid },

  footer: {
    position: "absolute", bottom: 16, left: 32, right: 32,
    flexDirection: "row", justifyContent: "space-between",
    fontSize: 6.5, color: C.light,
    borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 4,
  },
});

const dash = (v) => (v && String(v).trim() ? String(v) : "—");

function ColField({ label, value }) {
  return (
    <View style={s.col}>
      <Text style={s.fLabel}>{label}</Text>
      <Text style={s.fValue}>{dash(value)}</Text>
    </View>
  );
}

export default function MedicinePrescriptionPDF({ record }) {
  const p = record.patient || {};
  const fullName = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(" ");
  const generatedOn = new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  const items = record.items || [];

  return (
    <Document title={`Prescription - ${fullName || "Patient"}`} author="E. ZARATE HOSPITAL">
      <Page size="LETTER" style={s.page}>

        {/* Header */}
        <View style={s.headerRow}>
          <View style={s.hospHeaderLeft}>
            <Image src={logoImg} style={s.logoImg} />
            <View>
              <Text style={s.hospName}>E. ZARATE HOSPITAL</Text>
              <Text style={s.hospSub}>16 J. Aguilar Avenue, Talon 1, Las Piñas City, Metro Manila, Philippines</Text>
              <Text style={s.hospSub}>
                Tel. Nos.: (02) 8871-1440 · (02) 8873-5593 · (02) 8874-6905  |  Mobile Nos.: Smart (0919) 991-4938 · Globe (0917) 538-2440
              </Text>
              <Text style={[s.hospSub, { marginTop: 3, fontFamily: "Helvetica-Bold", color: C.dark, fontSize: 9 }]}>
                PRESCRIPTION
              </Text>
            </View>
          </View>
          <View>
            <Text style={s.recLabel}>Date</Text>
            <Text style={s.recNo}>{formatDateCreated(record.dateCreated)}</Text>
          </View>
        </View>

        {/* Patient info */}
        <View style={s.patientRow}>
          <ColField label="Patient's Name" value={fullName} />
          <ColField label="Age / Sex" value={`${formatAge(p.dateOfBirth)} / ${p.sex || "—"}`} />
        </View>
        <View style={s.patientRow}>
          <ColField label="Address" value={p.address} />
        </View>

        {/* Rx body */}
        <View style={s.rxBody}>
          <Text style={s.rxSymbol}>℞</Text>
          <View style={s.rxList}>
            {items.length === 0 ? (
              <Text style={s.emptyNote}>No medicines listed.</Text>
            ) : (
              items.map((item, idx) => (
                <View key={idx} style={s.itemRow}>
                  <View style={s.itemHeaderRow}>
                    <Text style={s.itemNum}>{idx + 1}.</Text>
                    <Text style={s.itemName}>
                      {dash(item.medicineName)}
                      {item.milligram ? ` (${item.milligram})` : ""}
                    </Text>
                    <Text style={s.itemQty}>Qty: {dash(item.quantity)}</Text>
                  </View>
                  <Text style={s.itemSig}>{item.instructions?.trim() ? item.instructions : "—"}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Physician signature */}
        <View style={s.sigRow}>
          <View style={s.sigBlock}>
            <View style={s.sigLine} />
            <Text style={s.sigName}>{dash(record.prescribedBy)}, M.D.</Text>
            <Text style={s.sigSub}>Name and Signature of Prescribing Physician</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>E. ZARATE HOSPITAL  |  Prescription  |  {record.id}</Text>
          <Text>Generated on {generatedOn}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}