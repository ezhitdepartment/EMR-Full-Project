import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import logoImg from "../../assets/logo.jpg";
import { formatAge } from "../../utils/age";

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
    paddingTop: 28,
    paddingBottom: 32,
    paddingHorizontal: 32,
    fontSize: 8,
    fontFamily: "Helvetica",
    color: C.dark,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: C.teal,
    paddingBottom: 6,
    marginBottom: 10,
  },
  hospHeaderLeft: { flexDirection: "row", alignItems: "center" },
  logoImg: { width: 40, height: 40, marginRight: 8 },
  hospName: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  hospSub: { fontSize: 7, color: C.mid, marginTop: 1 },
  docLabel: { fontSize: 7, color: C.mid, textAlign: "right" },
  docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.teal, textAlign: "right" },

  topRow: { flexDirection: "row", gap: 14, marginBottom: 10 },
  photoBox: {
    width: 90,
    height: 108,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 3,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  photo: { width: 90, height: 108, borderRadius: 3 },
  photoPlaceholder: { fontSize: 6.5, color: C.light, textAlign: "center", paddingHorizontal: 6 },

  nameBlock: { flex: 1, justifyContent: "center" },
  patientName: { fontSize: 15, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  patientSub: { fontSize: 8.5, color: C.mid, marginBottom: 6 },

  bloodTypeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignSelf: "flex-start",
  },
  bloodTypeLabel: { fontSize: 6.5, color: "#b91c1c", textTransform: "uppercase" },
  bloodTypeValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#b91c1c" },

  bar: {
    backgroundColor: C.dark,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 8,
    marginBottom: 5,
    borderRadius: 2,
  },
  barText: {
    color: C.white,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  row: { flexDirection: "row", marginBottom: 5 },
  col: { flex: 1, paddingRight: 8 },
  fLabel: { fontSize: 6, color: C.light, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 1 },
  fValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    paddingBottom: 1,
  },

  footer: {
    position: "absolute",
    bottom: 16,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6,
    color: C.light,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 4,
  },
});

function Field({ label, value, flex = 1 }) {
  return (
    <View style={[s.col, { flex }]}>
      <Text style={s.fLabel}>{label}</Text>
      <Text style={s.fValue}>{value || "—"}</Text>
    </View>
  );
}

export default function ConsultationPatientInfoPDF({ patient = {}, form = {}, generatedBy = "" }) {
  const fullName = [patient.firstName, patient.middleName, patient.lastName, patient.suffix]
    .filter(Boolean)
    .join(" ");
  const address = [form.residentialAddress, form.barangay, form.city, form.province]
    .filter(Boolean)
    .join(", ");
  const contact = [form.phoneCell, form.phoneHome].filter(Boolean).join(" / ");
  const emergency = [form.emergencyName, form.emergencyRelationship].filter(Boolean).join(" — ");
  const emergencyPhone = [form.emergencyPhoneCell, form.emergencyPhoneHome].filter(Boolean).join(" / ");

  return (
    <Document title={`Patient Information - ${fullName}`} author="E. ZARATE HOSPITAL">
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View style={s.hospHeaderLeft}>
            <Image src={logoImg} style={s.logoImg} />
            <View>
              <Text style={s.hospName}>E. ZARATE HOSPITAL</Text>
              <Text style={s.hospSub}>Patient Information</Text>
            </View>
          </View>
          <View>
            <Text style={s.docLabel}>Generated</Text>
            <Text style={s.docTitle}>{new Date().toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={s.topRow}>
          <View style={s.photoBox}>
            {patient.photo ? (
              <Image src={patient.photo} style={s.photo} />
            ) : (
              <Text style={s.photoPlaceholder}>No photo on file</Text>
            )}
          </View>
          <View style={s.nameBlock}>
            <Text style={s.patientName}>{fullName || "—"}</Text>
            <Text style={s.patientSub}>
              {(patient.sex || form.gender || "—").toUpperCase()} · {formatAge(patient.dateOfBirth || form.dateOfBirth)} ·
              {" "}DOB {patient.dateOfBirth || form.dateOfBirth || "—"}
            </Text>
            <View style={s.bloodTypeBox}>
              <Text style={s.bloodTypeLabel}>Blood Type</Text>
              <Text style={s.bloodTypeValue}>
                {form.bloodTypeEnabled && form.bloodType ? form.bloodType : "Not on file"}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.bar}>
          <Text style={s.barText}>Identification</Text>
        </View>
        <View style={s.row}>
          <Field label="Hospital No." value={patient.hospitalNo} />
          <Field label="PhilHealth PIN" value={form.philhealthPin} />
          <Field label="PhilHealth Member" value={form.philhealthMember} />
        </View>

        <View style={s.bar}>
          <Text style={s.barText}>Contact & Address</Text>
        </View>
        <View style={s.row}>
          <Field label="Address" value={address} flex={2} />
          <Field label="Contact No." value={contact} />
        </View>
        <View style={s.row}>
          <Field label="Email" value={form.email} />
          <Field label="Occupation" value={form.occupation} />
          <Field label="Marital Status" value={form.maritalStatus} />
        </View>

        <View style={s.bar}>
          <Text style={s.barText}>Health Coverage</Text>
        </View>
        <View style={s.row}>
          <Field label="HMO" value={form.hmo} />
          <Field label="HMO Type" value={form.hmoType} />
          <Field label="Cert. No." value={form.certNo} />
        </View>

        <View style={s.bar}>
          <Text style={s.barText}>Emergency Contact</Text>
        </View>
        <View style={s.row}>
          <Field label="Name / Relationship" value={emergency} flex={2} />
          <Field label="Phone" value={emergencyPhone} />
        </View>

        <View style={s.footer} fixed>
          <Text>Generated by {generatedBy || "—"} · E. ZARATE HOSPITAL, Consultation Form</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}