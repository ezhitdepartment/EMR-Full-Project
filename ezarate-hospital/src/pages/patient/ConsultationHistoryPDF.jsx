import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
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
    marginBottom: 8,
  },
  hospHeaderLeft: { flexDirection: "row", alignItems: "center" },
  logoImg: { width: 40, height: 40, marginRight: 8 },
  hospName: { fontSize: 13, fontFamily: "Helvetica-Bold" },
  hospSub: { fontSize: 7, color: C.mid, marginTop: 1 },
  docLabel: { fontSize: 7, color: C.mid, textAlign: "right" },
  docTitle: { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.teal, textAlign: "right" },

  patientLine: { fontSize: 8.5, marginBottom: 8, color: C.mid },
  patientName: { fontFamily: "Helvetica-Bold", color: C.dark },

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

  emptyText: { fontSize: 7.5, color: C.light, fontFamily: "Helvetica-Oblique", marginBottom: 4 },

  listItem: { flexDirection: "row", marginBottom: 3 },
  bullet: { width: 8, fontSize: 7.5 },
  listText: { flex: 1, fontSize: 7.5, lineHeight: 1.4 },

  lr: { flexDirection: "row", marginBottom: 3 },
  ll: { width: 120, fontSize: 7.5, color: C.mid },
  lv: { flex: 1, fontSize: 7.5, fontFamily: "Helvetica-Bold" },

  blk: { marginBottom: 4 },
  blkVal: { fontSize: 7.5, backgroundColor: C.bg, padding: 5, borderRadius: 2, lineHeight: 1.4, minHeight: 16 },

  twoCol: { flexDirection: "row", gap: 10 },
  twoItem: { flex: 1 },

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

function ListSection({ title, items }) {
  return (
    <View>
      <View style={s.bar}>
        <Text style={s.barText}>{title}</Text>
      </View>
      {items.length === 0 ? (
        <Text style={s.emptyText}>None recorded.</Text>
      ) : (
        items.map((item, i) => (
          <View key={i} style={s.listItem}>
            <Text style={s.bullet}>•</Text>
            <Text style={s.listText}>{item.text || item.condition || String(item)}</Text>
          </View>
        ))
      )}
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={s.lr}>
      <Text style={s.ll}>{label}</Text>
      <Text style={s.lv}>{value || "—"}</Text>
    </View>
  );
}

export default function ConsultationHistoryPDF({ patient = {}, form = {}, generatedBy = "" }) {
  const fullName = [patient.firstName, patient.middleName, patient.lastName, patient.suffix]
    .filter(Boolean)
    .join(" ");
  const isFemale = (patient.sex || form.gender || "").toLowerCase() === "female";

  const smokingActive = form.isSmoker === "YES" || form.isSmoker === "USED TO SMOKE";
  const drinkingActive = form.isDrinker === "YES" || form.isDrinker === "USED TO DRINK";

  return (
    <Document title={`Medical History - ${fullName}`} author="E. ZARATE HOSPITAL">
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View style={s.hospHeaderLeft}>
            <Image src={logoImg} style={s.logoImg} />
            <View>
              <Text style={s.hospName}>E. ZARATE HOSPITAL</Text>
              <Text style={s.hospSub}>Medical History</Text>
            </View>
          </View>
          <View>
            <Text style={s.docLabel}>Generated</Text>
            <Text style={s.docTitle}>{new Date().toLocaleDateString()}</Text>
          </View>
        </View>

        <Text style={s.patientLine}>
          <Text style={s.patientName}>{fullName || "—"}</Text>
          {"  ·  "}
          {(patient.sex || form.gender || "—").toUpperCase()}
          {"  ·  "}
          {formatAge(patient.dateOfBirth || form.dateOfBirth)}
          {"  ·  "}
          {patient.hospitalNo || "—"}
        </Text>

        <ListSection title="Past Medical History" items={form.pastMedicalHistory || []} />
        <ListSection title="Family Medical History" items={form.familyMedicalHistory || []} />

        <View style={s.bar}>
          <Text style={s.barText}>Surgical History</Text>
        </View>
        {form.surgicalHistoryEnabled && form.surgicalHistoryDetails ? (
          <View style={s.blk}>
            <Text style={s.blkVal}>{form.surgicalHistoryDetails}</Text>
          </View>
        ) : (
          <Text style={s.emptyText}>None recorded.</Text>
        )}

        <View style={s.bar}>
          <Text style={s.barText}>Social History</Text>
        </View>
        <View style={s.twoCol}>
          <View style={s.twoItem}>
            <InfoRow label="Smoking" value={form.isSmoker} />
            {smokingActive && (
              <>
                <InfoRow label="Type" value={form.cigaretteType} />
                <InfoRow
                  label="Amount"
                  value={
                    form.cigarettesPerDay
                      ? `${form.cigarettesPerDay}/day, ${form.yearsSmoking || "?"} yrs (${
                          form.cigarettePackYear || "?"
                        } pack-yrs)`
                      : null
                  }
                />
              </>
            )}
            <InfoRow label="Alcohol" value={form.isDrinker} />
            {drinkingActive && (
              <InfoRow
                label="Amount"
                value={
                  form.alcoholType ? `${form.alcoholType}, ${form.numberOfBottles || "?"} bottle(s)` : null
                }
              />
            )}
          </View>
          <View style={s.twoItem}>
            <InfoRow label="Illegal Drug Use" value={form.isDrugUser} />
            {form.drugRemarks && <InfoRow label="Remarks" value={form.drugRemarks} />}
            <InfoRow label="Sexually Active" value={form.isSexuallyActive} />
            {form.sexualActivityRemarks && <InfoRow label="Remarks" value={form.sexualActivityRemarks} />}
          </View>
        </View>

        {isFemale && (
          <>
            <View style={s.bar}>
              <Text style={s.barText}>OB-GYNE History</Text>
            </View>
            <View style={s.twoCol}>
              <View style={s.twoItem}>
                <InfoRow label="No. of Pregnancies" value={form.noOfPregnancies} />
                <InfoRow label="No. of Deliveries" value={form.noOfDeliveries} />
              </View>
              <View style={s.twoItem}>
                <InfoRow label="Type of Delivery" value={form.typeOfDelivery} />
                <InfoRow label="Last Menstrual Period" value={form.lastMenstrualPeriod} />
              </View>
            </View>
          </>
        )}

        <View style={s.footer} fixed>
          <Text>Generated by {generatedBy || "—"} · E. ZARATE HOSPITAL, Consultation Form</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}