import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import logoImg from "../../assets/logo.jpg";
import { formatAge } from "../../utils/age";
import { PE_SYSTEMS } from "./ConsultationForm";

const C = {
  teal: "#0f766e",
  dark: "#1e293b",
  mid: "#64748b",
  light: "#94a3b8",
  border: "#cbd5e1",
  bg: "#f8fafc",
  white: "#ffffff",
  red: "#b91c1c",
};

const s = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingBottom: 30,
    paddingHorizontal: 30,
    fontSize: 7.5,
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
  logoImg: { width: 36, height: 36, marginRight: 8 },
  hospName: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  hospSub: { fontSize: 7, color: C.mid, marginTop: 1 },
  docLabel: { fontSize: 6.5, color: C.mid, textAlign: "right" },
  docTitle: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.teal, textAlign: "right" },

  patientRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  photoBox: {
    width: 46,
    height: 56,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 2,
    backgroundColor: C.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  photo: { width: 46, height: 56, borderRadius: 2 },
  photoPlaceholder: { fontSize: 5, color: C.light, textAlign: "center" },
  patientName: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  patientSub: { fontSize: 7.5, color: C.mid, marginTop: 1 },
  bloodTypeBadge: {
    marginTop: 3,
    alignSelf: "flex-start",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 2,
    paddingVertical: 2,
    paddingHorizontal: 6,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: C.red,
  },

  bar: {
    backgroundColor: C.dark,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 7,
    marginBottom: 4,
    borderRadius: 2,
  },
  barText: {
    color: C.white,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },

  row: { flexDirection: "row", marginBottom: 4 },
  col: { flex: 1, paddingRight: 8 },
  fLabel: { fontSize: 5.5, color: C.light, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 1 },
  fValue: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    paddingBottom: 1,
  },

  blk: { backgroundColor: C.bg, padding: 5, borderRadius: 2, lineHeight: 1.4, marginBottom: 4, fontSize: 7.5 },
  emptyText: { fontSize: 7, color: C.light, fontFamily: "Helvetica-Oblique", marginBottom: 3 },

  listItem: { flexDirection: "row", marginBottom: 2 },
  bullet: { width: 7, fontSize: 7 },
  listText: { flex: 1, fontSize: 7, lineHeight: 1.35 },

  lr: { flexDirection: "row", marginBottom: 2.5 },
  ll: { width: 105, fontSize: 7, color: C.mid },
  lv: { flex: 1, fontSize: 7, fontFamily: "Helvetica-Bold" },

  qTable: { borderWidth: 0.5, borderColor: C.border, borderRadius: 2, marginBottom: 3 },
  qRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
    paddingVertical: 2.5,
    paddingHorizontal: 5,
  },
  qQuestion: { flex: 1, fontSize: 6.5, paddingRight: 6 },
  qAnswer: { width: 60, fontSize: 6.5, fontFamily: "Helvetica-Bold", textAlign: "right" },

  presTable: { borderWidth: 0.5, borderColor: C.border, borderRadius: 2 },
  presHeadRow: { flexDirection: "row", backgroundColor: C.bg, paddingVertical: 3, paddingHorizontal: 5 },
  presRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
  presMed: { flex: 2, fontSize: 7 },
  presQty: { width: 34, fontSize: 7, textAlign: "center" },
  presInst: { flex: 3, fontSize: 7 },
  presHead: { fontSize: 6, fontFamily: "Helvetica-Bold", color: C.mid, textTransform: "uppercase" },

  icdChip: {
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
  icdRow: { flexDirection: "row", flexWrap: "wrap" },

  footer: {
    position: "absolute",
    bottom: 14,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 5.5,
    color: C.light,
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 3,
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

function InfoRow({ label, value }) {
  return (
    <View style={s.lr}>
      <Text style={s.ll}>{label}</Text>
      <Text style={s.lv}>{value || "—"}</Text>
    </View>
  );
}

function Bar({ children }) {
  return (
    <View style={s.bar}>
      <Text style={s.barText}>{children}</Text>
    </View>
  );
}

function ListBlock({ items }) {
  if (!items?.length) return <Text style={s.emptyText}>None recorded.</Text>;
  return items.map((item, i) => (
    <View key={i} style={s.listItem}>
      <Text style={s.bullet}>•</Text>
      <Text style={s.listText}>{item.text || item.condition || String(item)}</Text>
    </View>
  ));
}

function QRow({ q, a }) {
  return (
    <View style={s.qRow}>
      <Text style={s.qQuestion}>{q}</Text>
      <Text style={s.qAnswer}>{a || "—"}</Text>
    </View>
  );
}

// Renders a checkbox-group field (an array of checked labels, e.g.
// form.diagnosticsSelected, form.admissionSigns, form.peHeent) as a row of
// chips — same visual language as the ICD-10 diagnosis chips above, so a
// checked box actually shows up on the PDF instead of silently vanishing
// because only the free-text "Notes/Others" field next to it was ever
// rendered.
function ChipRow({ label, items, emptyText = "None selected." }) {
  return (
    <View style={{ marginBottom: 4 }}>
      {label && <Text style={s.fLabel}>{label}</Text>}
      {items?.length > 0 ? (
        <View style={s.icdRow}>
          {items.map((name) => (
            <Text key={name} style={s.icdChip}>
              {name}
            </Text>
          ))}
        </View>
      ) : (
        <Text style={s.emptyText}>{emptyText}</Text>
      )}
    </View>
  );
}

export default function ConsultationRecordPDF({ patient = {}, form = {}, generatedBy = "" }) {
  const fullName = [patient.firstName, patient.middleName, patient.lastName, patient.suffix]
    .filter(Boolean)
    .join(" ");
  const address = [form.residentialAddress, form.barangay, form.city, form.province].filter(Boolean).join(", ");
  const contact = [form.phoneCell, form.phoneHome].filter(Boolean).join(" / ");
  const emergency = [form.emergencyName, form.emergencyRelationship].filter(Boolean).join(" — ");
  const emergencyPhone = [form.emergencyPhoneCell, form.emergencyPhoneHome].filter(Boolean).join(" / ");
  const isFemale = (patient.sex || form.gender || "").toLowerCase() === "female";

  const smokingActive = form.isSmoker === "YES" || form.isSmoker === "USED TO SMOKE";
  const drinkingActive = form.isDrinker === "YES" || form.isDrinker === "USED TO DRINK";
  const chestPainYes = form.chestPainPressure === "YES";
  const items = (form.prescriptionItems || []).filter((i) => i.medicineName?.trim());

  return (
    <Document title={`Consultation Record - ${fullName}`} author="E. ZARATE HOSPITAL">
      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View style={s.hospHeaderLeft}>
            <Image src={logoImg} style={s.logoImg} />
            <View>
              <Text style={s.hospName}>E. ZARATE HOSPITAL</Text>
              <Text style={s.hospSub}>Consultation Record</Text>
            </View>
          </View>
          <View>
            <Text style={s.docLabel}>Generated</Text>
            <Text style={s.docTitle}>{new Date().toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={s.patientRow}>
          <View style={s.photoBox}>
            {patient.photo ? (
              <Image src={patient.photo} style={s.photo} />
            ) : (
              <Text style={s.photoPlaceholder}>No photo</Text>
            )}
          </View>
          <View>
            <Text style={s.patientName}>{fullName || "—"}</Text>
            <Text style={s.patientSub}>
              {(patient.sex || form.gender || "—").toUpperCase()} · {formatAge(patient.dateOfBirth || form.dateOfBirth)} ·{" "}
              DOB {patient.dateOfBirth || form.dateOfBirth || "—"} · Hospital No. {patient.hospitalNo || "—"}
            </Text>
            {form.bloodTypeEnabled && form.bloodType && (
              <Text style={s.bloodTypeBadge}>Blood Type: {form.bloodType}</Text>
            )}
          </View>
        </View>

        {/* Patient Information */}
        <Bar>Contact, Coverage &amp; Emergency Contact</Bar>
        <View style={s.row}>
          <Field label="Address" value={address} flex={2} />
          <Field label="Contact No." value={contact} />
        </View>
        <View style={s.row}>
          <Field label="PhilHealth PIN" value={form.philhealthPin} />
          <Field label="HMO" value={form.hmo} />
          <Field label="Emergency Contact" value={emergency ? `${emergency}${emergencyPhone ? ` (${emergencyPhone})` : ""}` : ""} flex={2} />
        </View>

        {/* Allergies */}
        <Bar>Allergies</Bar>
        {form.allergies ? <Text style={s.blk}>{form.allergies}</Text> : <Text style={s.emptyText}>No known allergies recorded.</Text>}

        {/* Subjective */}
        <Bar>Subjective</Bar>
        <View style={s.row}>
          <View style={s.col}>
            <Text style={s.fLabel}>Chief Complaint</Text>
            <Text style={s.blk}>{form.chiefComplaint || "—"}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.fLabel}>History of Present Illness</Text>
            <Text style={s.blk}>{form.historyOfPresentIllness || "—"}</Text>
          </View>
        </View>

        {/* Past / Family Medical History */}
        <Bar>Past Medical History</Bar>
        <ListBlock items={form.pastMedicalHistory} />
        <Bar>Family Medical History</Bar>
        <ListBlock items={form.familyMedicalHistory} />

        {/* Social History */}
        <Bar>Social History</Bar>
        <View style={s.row}>
          <View style={s.col}>
            <InfoRow label="Smoking" value={form.isSmoker} />
            {smokingActive && (
              <InfoRow
                label="Details"
                value={`${form.cigaretteType || "?"}, ${form.cigarettesPerDay || "?"}/day, ${form.yearsSmoking || "?"} yrs`}
              />
            )}
            <InfoRow label="Alcohol" value={form.isDrinker} />
            {drinkingActive && (
              <InfoRow label="Details" value={`${form.alcoholType || "?"}, ${form.numberOfBottles || "?"} bottle(s)`} />
            )}
          </View>
          <View style={s.col}>
            <InfoRow label="Illegal Drug Use" value={form.isDrugUser} />
            <InfoRow label="Sexually Active" value={form.isSexuallyActive} />
          </View>
        </View>

        {isFemale && (
          <>
            <Bar>OB-GYNE History</Bar>
            <View style={s.row}>
              <Field label="No. of Pregnancies" value={form.noOfPregnancies} />
              <Field label="No. of Deliveries" value={form.noOfDeliveries} />
              <Field label="Type of Delivery" value={form.typeOfDelivery} />
              <Field label="Last Menstrual Period" value={form.lastMenstrualPeriod} />
            </View>
          </>
        )}

        <Bar>Surgical History / Immunizations / Review of Systems</Bar>
        <Text style={s.blk}>{form.surgicalHistoryEnabled && form.surgicalHistoryDetails ? `Surgical: ${form.surgicalHistoryDetails}` : "Surgical History: none recorded."}</Text>
        <Text style={s.blk}>{form.immunizationsEnabled && form.immunizationsDetails ? `Immunizations: ${form.immunizationsDetails}` : "Immunizations: none recorded."}</Text>
        <Text style={s.blk}>{form.reviewOfSystemsEnabled && form.reviewOfSystemsDetails ? `ROS: ${form.reviewOfSystemsDetails}` : "Review of Systems: none recorded."}</Text>

        <Bar>Active Diagnoses &amp; Active Medication (Chronic / Home)</Bar>
        <View style={s.row}>
          <View style={s.col}>
            <Text style={s.fLabel}>Active Diagnoses</Text>
            <Text style={s.blk}>{form.activeDiagnoses || "—"}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.fLabel}>Active Medication</Text>
            <Text style={s.blk}>{[form.activeMedication1, form.activeMedication2].filter(Boolean).join("\n") || "—"}</Text>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>Generated by {generatedBy || "—"} · E. ZARATE HOSPITAL, Consultation Form (page 1 of 2)</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.headerRow}>
          <View style={s.hospHeaderLeft}>
            <Image src={logoImg} style={s.logoImg} />
            <View>
              <Text style={s.hospName}>E. ZARATE HOSPITAL</Text>
              <Text style={s.hospSub}>Consultation Record — Clinical Findings</Text>
            </View>
          </View>
          <View>
            <Text style={s.docLabel}>Patient</Text>
            <Text style={s.docTitle}>{fullName || "—"}</Text>
          </View>
        </View>

        {/* Diagnosis */}
        <Bar>Diagnosis</Bar>
        {form.icdDiagnoses?.length > 0 && (
          <View style={s.icdRow}>
            {form.icdDiagnoses.map((d) => (
              <Text key={d.code} style={s.icdChip}>
                {d.code} — {d.name}
              </Text>
            ))}
          </View>
        )}
        <Text style={s.blk}>{form.diagnosis || "—"}</Text>

        {/* Medication ordered */}
        <Bar>Medication</Bar>
        <Text style={s.blk}>{form.medicationOrders || "—"}</Text>

        {/* Medicine Prescription */}
        <Bar>Medicine Prescription</Bar>
        {items.length === 0 ? (
          <Text style={s.emptyText}>No medicines prescribed.</Text>
        ) : (
          <View style={s.presTable}>
            <View style={s.presHeadRow}>
              <Text style={[s.presHead, { flex: 2 }]}>Medicine</Text>
              <Text style={[s.presHead, { width: 50, textAlign: "center" }]}>Milligram</Text>
              <Text style={[s.presHead, { width: 34, textAlign: "center" }]}>Qty</Text>
              <Text style={[s.presHead, { flex: 3 }]}>Instructions (Sig)</Text>
            </View>
            {items.map((item, i) => (
              <View key={i} style={s.presRow}>
                <Text style={s.presMed}>{item.medicineName}</Text>
                <Text style={[s.presQty, { width: 50 }]}>{item.milligram || "—"}</Text>
                <Text style={s.presQty}>{item.quantity}</Text>
                <Text style={s.presInst}>{item.instructions || "—"}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Diagnostics */}
        <Bar>Diagnostics / Tests Ordered</Bar>
        <ChipRow items={form.diagnosticsSelected} emptyText="No diagnostic tests ordered." />
        {form.diagnosticsNotes && <Text style={s.blk}>{form.diagnosticsNotes}</Text>}

        {/* Pertinent Signs & Symptoms / Physical Examination — only shown
            when at least one of these checklists was actually filled in
            (plain OPD visits usually won't touch these CF4-oriented
            fields, so there's no point printing a wall of empty sections
            for every entry). */}
        {(form.admissionSigns?.length > 0 ||
          form.peGeneralSurvey?.length > 0 ||
          form.peHeent?.length > 0 ||
          PE_SYSTEMS.some((sys) => form[sys.key]?.length > 0)) && (
          <>
            <Bar>Pertinent Signs and Symptoms</Bar>
            <ChipRow items={form.admissionSigns} />
            {form.admissionSigns?.includes("Pain") && form.admissionSignsPainSite && (
              <Text style={[s.blk, { marginTop: -2 }]}>Pain — site: {form.admissionSignsPainSite}</Text>
            )}
            {form.admissionSigns?.includes("Others") && form.admissionSignsOthers && (
              <Text style={[s.blk, { marginTop: -2 }]}>Others: {form.admissionSignsOthers}</Text>
            )}

            <Bar>Physical Examination</Bar>
            <ChipRow label="General Survey" items={form.peGeneralSurvey} />
            {form.peGeneralSurvey?.includes("Altered sensorium") && form.peGeneralSurveyAlteredSensoriumSpecify && (
              <Text style={[s.blk, { marginTop: -2 }]}>
                Altered sensorium — specify: {form.peGeneralSurveyAlteredSensoriumSpecify}
              </Text>
            )}
            <ChipRow label="HEENT" items={form.peHeent} />
            {form.peHeentOthers && <Text style={[s.blk, { marginTop: -2 }]}>Others: {form.peHeentOthers}</Text>}
            {PE_SYSTEMS.map((sys) => (
              <View key={sys.key}>
                <ChipRow label={sys.label} items={form[sys.key]} />
                {form[sys.othersKey] && (
                  <Text style={[s.blk, { marginTop: -2 }]}>Others: {form[sys.othersKey]}</Text>
                )}
              </View>
            ))}
          </>
        )}

        {/* Disposition */}
        <Bar>Disposition</Bar>
        <View style={s.row}>
          <Field label="Disposition" value={form.disposition} />
          <Field label="Recommendations" value={form.dispositionNotes} flex={2} />
        </View>

        {/* NCD High-Risk Assessment */}
        <Bar>NCD High-Risk Assessment</Bar>
        <View style={s.qTable}>
          <QRow q="Eats processed/fast foods and ihaw-ihaw weekly?" a={form.eatsProcessedFastFoodsWeekly} />
          <QRow q="Eats 3 servings of vegetables daily?" a={form.eats3VegetablesDaily} />
          <QRow q="2-3 servings of fruits daily?" a={form.eats2to3FruitsDaily} />
          <QRow q="At least 2.5 hrs/week moderate physical activity?" a={form.physicalActivity} />
          <QRow q="Diagnosed with diabetes?" a={form.diagnosedDiabetes} />
          <QRow q="With medication?" a={form.diabetesWithMedication} />
          <QRow q="Polyphagia / Polydipsia / Polyuria?" a={[form.polyphagia, form.polydipsia, form.polyuria].filter(Boolean).join(" / ") || "—"} />
          <QRow q="Raised blood glucose / lipids?" a={[form.raisedBloodGlucose, form.raisedBloodLipids].filter(Boolean).join(" / ") || "—"} />
          <QRow q="Urine ketones / protein?" a={[form.urineKetones, form.urineProtein].filter(Boolean).join(" / ") || "—"} />
          <QRow q="Chest pain/pressure/heaviness?" a={form.chestPainPressure} />
          {chestPainYes && (
            <>
              <QRow q="Pain center of chest / left arm, worse on exertion?" a={form.painCenterChestOrArm} />
              <QRow q="Relieved by rest/tablet, resolves &lt;10 min?" a={[form.painGoesAwayRestOrTablet, form.painGoesAwayUnder10Min].filter(Boolean).join(" / ") || "—"} />
              <QRow q="Severe chest pain lasting 30+ minutes?" a={form.severeChestPain30Min} />
            </>
          )}
          <QRow q="Angina or Heart Attack?" a={form.anginaOrHeartAttack} />
          <QRow q="Stroke symptoms (weakness/numbness/speech)?" a={form.strokeSymptoms} />
          <QRow q="Possible Stroke or TIA?" a={form.strokeOrTIA} />
          <QRow q="Overall Risk Level" a={form.riskLevel} />
        </View>

        {/* Consent */}
        <Bar>Consent</Bar>
        <Text style={s.blk}>{form.consentNotes || "Standard consent on file."}</Text>
        <View style={s.row}>
          <Field label="Signed By" value={form.consentSignature} />
          <Field label="Date" value={form.consentDate} />
        </View>

        <View style={s.footer} fixed>
          <Text>Generated by {generatedBy || "—"} · E. ZARATE HOSPITAL, Consultation Form (page 2 of 2)</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}