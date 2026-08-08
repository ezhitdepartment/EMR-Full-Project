import { useState, useEffect } from "react";
import { X } from "lucide-react";
import AddressFields, { emptyAddressValue } from "../../components/common/AddressFields";
import { ageInYears } from "../../utils/age";
import { createPatient, findDuplicatePatient } from "../../utils/patients";

const SUFFIX_OPTIONS = ["", "Jr.", "Sr.", "II", "III", "IV"];

const emptyGuardian = {
  firstName: "",
  lastName: "",
  middleName: "",
  suffix: "",
  sex: "",
  dateOfBirth: "",
  pin: "",
  landline: "",
  mobile: "",
};

const emptyForm = {
  firstName: "",
  lastName: "",
  middleName: "",
  suffix: "",
  sex: "",
  dateOfBirth: "",
  email: "",
  landline: "",
  mobile: "",
  hasGuardian: false,
  guardian: emptyGuardian,
  address: "",
  ...emptyAddressValue,

  // Family background
  motherName: "",
  motherContact: "",
  fatherName: "",
  fatherContact: "",
  nationality: "",
  religion: "",
  maritalStatus: "",

  // Emergency contact
  emergencyName: "",
  emergencyAddress: "",
  emergencySameAsPatientAddress: false,
  emergencyRelationship: "",
  emergencyPhoneHome: "",
  emergencyPhoneCell: "",
  emergencySameAsMotherContact: false,
  emergencySameAsFatherContact: false,
  emergencySameAsGuardian: false,
};

const MARITAL_STATUS_OPTIONS = ["", "Single", "Married", "Widowed", "Separated", "Divorced"];

// Draft persistence — so an accidental "Cancel" or a click on the backdrop
// (both of which just unmount this component) doesn't throw away what was
// already typed. sessionStorage rather than localStorage on purpose: this
// form holds patient PII (names, addresses, parents' contact numbers), so
// it should survive a reopen within the same browser tab/session, but not
// linger indefinitely on a shared hospital workstation after the tab or
// browser is closed — that's exactly sessionStorage's lifetime.
//
// The draft is only ever cleared by (a) a successful "Create and Select
// Patient" save, since at that point the data is safely in the database,
// or (b) the person explicitly clicking the new "Clear Form" button.
// Simply closing/cancelling the modal never touches it.
const DRAFT_STORAGE_KEY = "ezarateHospital:createPatientDraft";

function readDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Merge over emptyForm (not the other way around) so a draft saved
    // before an app update that added new fields still comes back with
    // every current field present, instead of a stale shape crashing the
    // form.
    return {
      ...emptyForm,
      ...parsed,
      guardian: { ...emptyGuardian, ...(parsed?.guardian || {}) },
    };
  } catch {
    return null;
  }
}

function writeDraft(form) {
  try {
    sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(form));
  } catch {
    // Storage full/unavailable (e.g. private browsing) — the form still
    // works for this session, it just won't survive a reopen. Not worth
    // surfacing to the nurse mid-registration.
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // Nothing to clean up if storage was never available to begin with.
  }
}

// True once anything meaningful has been typed — used to decide whether
// the "Clear Form" button should ask for confirmation before wiping
// everything out.
function isFormBlank(form) {
  return (
    JSON.stringify(form) === JSON.stringify(emptyForm)
  );
}

// Same composition used everywhere else in the app (Discharge/Medical
// Certificate seeds) so "same as patient's address" produces an identical
// string to what shows up on those documents.
function composedPatientAddress(form) {
  return [form.address, form.barangay, form.city, form.province].filter(Boolean).join(", ");
}

function guardianFullName(guardian) {
  return [guardian.firstName, guardian.middleName, guardian.lastName, guardian.suffix]
    .filter(Boolean)
    .join(" ");
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 disabled:bg-slate-50 disabled:text-slate-400";

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function MobileField({ value, onChange }) {
  return (
    <div className="flex">
      <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-sm text-slate-500">
        +63
      </span>
      <input
        value={value}
        onChange={onChange}
        className="w-full rounded-r-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
      />
    </div>
  );
}

export default function CreatePatientModal({ onClose, onCreated }) {
  const [form, setForm] = useState(() => readDraft() || emptyForm);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Set once handleSubmit finds an existing patient with the same name +
  // DOB — rendering the "this patient already exists" popup instead of
  // inserting. Cleared as soon as the nurse picks either option in it.
  const [duplicateMatch, setDuplicateMatch] = useState(null);

  // Persist every change as a draft — this is what makes reopening the
  // modal (after Cancel, a backdrop click, or even an accidental tab
  // close/refresh within the same session) come back with what was
  // already typed instead of a blank form.
  useEffect(() => {
    writeDraft(form);
  }, [form]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }
  function setGuardian(field, value) {
    setForm((f) => ({ ...f, guardian: { ...f.guardian, [field]: value } }));
  }

  function handleAddressChange(patch) {
    setForm((f) => ({ ...f, ...patch }));
  }

  // Keep Emergency Contact's address mirroring the patient's address for
  // as long as the checkbox is checked — so editing the patient's address
  // (or picking region/province/city/barangay) keeps it in sync live,
  // not just at the moment the box was ticked.
  useEffect(() => {
    if (!form.emergencySameAsPatientAddress) return;
    const composed = composedPatientAddress(form);
    if (form.emergencyAddress !== composed) {
      setForm((f) => ({ ...f, emergencyAddress: composed }));
    }
  }, [
    form.emergencySameAsPatientAddress,
    form.address,
    form.barangay,
    form.city,
    form.province,
  ]);

  // Same idea for the Cell No. — mirrors Mother's, Father's, or the
  // Guardian's contact number, whichever box is checked. The three are
  // mutually exclusive (checking one unchecks the others via the onChange
  // handlers below).
  useEffect(() => {
    if (form.emergencySameAsMotherContact && form.emergencyPhoneCell !== form.motherContact) {
      setForm((f) => ({ ...f, emergencyPhoneCell: f.motherContact }));
    } else if (form.emergencySameAsFatherContact && form.emergencyPhoneCell !== form.fatherContact) {
      setForm((f) => ({ ...f, emergencyPhoneCell: f.fatherContact }));
    } else if (form.emergencySameAsGuardian && form.emergencyPhoneCell !== form.guardian.mobile) {
      setForm((f) => ({ ...f, emergencyPhoneCell: f.guardian.mobile }));
    }
  }, [
    form.emergencySameAsMotherContact,
    form.emergencySameAsFatherContact,
    form.emergencySameAsGuardian,
    form.motherContact,
    form.fatherContact,
    form.guardian.mobile,
  ]);

  // "Same as Guardian" also carries over Name, Relationship, and Home
  // phone — a guardian who's also the emergency contact shouldn't have to
  // be typed in twice.
  useEffect(() => {
    if (!form.emergencySameAsGuardian) return;
    const name = guardianFullName(form.guardian);
    const patch = {};
    if (form.emergencyName !== name) patch.emergencyName = name;
    if (form.emergencyRelationship !== "Guardian") patch.emergencyRelationship = "Guardian";
    if (form.emergencyPhoneHome !== form.guardian.landline) patch.emergencyPhoneHome = form.guardian.landline;
    if (Object.keys(patch).length > 0) setForm((f) => ({ ...f, ...patch }));
  }, [form.emergencySameAsGuardian, form.guardian.firstName, form.guardian.middleName, form.guardian.lastName, form.guardian.suffix, form.guardian.landline]);

  function toggleEmergencySameAsMother(checked) {
    setForm((f) => ({
      ...f,
      emergencySameAsMotherContact: checked,
      emergencySameAsFatherContact: checked ? false : f.emergencySameAsFatherContact,
      emergencySameAsGuardian: checked ? false : f.emergencySameAsGuardian,
    }));
  }

  function toggleEmergencySameAsFather(checked) {
    setForm((f) => ({
      ...f,
      emergencySameAsFatherContact: checked,
      emergencySameAsMotherContact: checked ? false : f.emergencySameAsMotherContact,
      emergencySameAsGuardian: checked ? false : f.emergencySameAsGuardian,
    }));
  }

  function toggleEmergencySameAsGuardian(checked) {
    setForm((f) => ({
      ...f,
      emergencySameAsGuardian: checked,
      emergencySameAsMotherContact: checked ? false : f.emergencySameAsMotherContact,
      emergencySameAsFatherContact: checked ? false : f.emergencySameAsFatherContact,
    }));
  }

  // One-click fill for the Emergency Contact "Name" field from the
  // Mother/Father details captured earlier in the form. Also fills in the
  // Relationship field to match, same as the "Same as Guardian" behavior.
  function fillEmergencyFromParent(parent) {
    const name = parent === "Mother" ? form.motherName : form.fatherName;
    setForm((f) => ({
      ...f,
      emergencyName: name,
      emergencyRelationship: parent,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.sex ||
      !form.dateOfBirth ||
      !form.address.trim()
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    const existing = await findDuplicatePatient({
      firstName: form.firstName,
      lastName: form.lastName,
      dateOfBirth: form.dateOfBirth,
    });
    setSubmitting(false);

    if (existing) {
      // Stop here — show the "already exists" popup instead of inserting.
      // The popup itself offers "Select Existing Patient" (skips creating
      // a duplicate row entirely) or "Create New Patient Anyway" (calls
      // insertPatient() directly, bypassing this check).
      setDuplicateMatch(existing);
      return;
    }

    await insertPatient();
  }

  // The actual insert — pulled out of handleSubmit so the duplicate-match
  // popup's "Create New Patient Anyway" button can call it directly,
  // without re-running (and re-tripping) the duplicate check above.
  async function insertPatient() {
    setSubmitting(true);

    // No Hospital No. to compute here anymore — patients.hospital_no's
    // own DEFAULT generate_hospital_no() assigns the next "00001",
    // "00002", ... the moment this insert happens, using a real Postgres
    // sequence. That's also strictly race-condition-safe across multiple
    // devices/nurses saving at the same moment, which a client-computed
    // "highest number so far + 1" never fully was.
    const patient = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      middleName: form.middleName.trim(),
      suffix: form.suffix,
      sex: form.sex,
      dateOfBirth: form.dateOfBirth,
      email: form.email.trim(),
      landline: form.landline.trim(),
      mobile: form.mobile.trim(),
      hasGuardian: form.hasGuardian,
      guardian: form.hasGuardian ? form.guardian : null,
      address: form.address.trim(),
      region: form.region,
      regionCode: form.regionCode,
      province: form.province,
      provinceCode: form.provinceCode,
      city: form.city,
      cityCode: form.cityCode,
      barangay: form.barangay,
      zipCode: form.zipCode,

      motherName: form.motherName.trim(),
      motherContact: form.motherContact.trim(),
      fatherName: form.fatherName.trim(),
      fatherContact: form.fatherContact.trim(),
      nationality: form.nationality.trim(),
      religion: form.religion.trim(),
      maritalStatus: form.maritalStatus,

      emergencyName: form.emergencyName.trim(),
      emergencyAddress: form.emergencyAddress.trim(),
      emergencyRelationship: form.emergencyRelationship.trim(),
      emergencyPhoneHome: form.emergencyPhoneHome.trim(),
      emergencyPhoneCell: form.emergencyPhoneCell.trim(),

      konsultaEligibility: "Not Set",
    };

    try {
      const created = await createPatient(patient);
      // The data is safely saved now — this is the one place the draft
      // should actually disappear, so the next "Add Patient" opens blank
      // instead of prefilled with the patient who was just created.
      clearDraft();
      onCreated(created);
    } catch {
      setError("Could not save the patient. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Duplicate-match popup — "Select Existing Patient" button. Hands the
  // already-existing record back to the caller exactly like a normal
  // create would (same onCreated(patient) contract Patients.jsx/
  // CreateEncounterPage.jsx already expect), just without inserting a
  // second row for the same person.
  function selectExistingPatient() {
    clearDraft();
    onCreated(duplicateMatch);
  }

  // "Clear Form" — the explicit, deliberate way to wipe the draft. Only
  // asks for confirmation when there's actually something typed in, so it
  // doesn't nag on an already-empty form.
  function handleClear() {
    if (!isFormBlank(form) && !window.confirm("Clear everything you've entered in this form?")) {
      return;
    }
    setForm(emptyForm);
    setError("");
    clearDraft();
  }

  return (
    <>
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold text-slate-800">Create Patient</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            {/* Patient Details */}
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-3">Patient Details</p>
              <div className="space-y-3">
                <Field label="Hospital No.">
                  <input
                    value="Assigned automatically on save"
                    readOnly
                    title="Auto-generated once you click Create Patient — a running count starting at 00001"
                    className={`${inputClass} bg-slate-50 text-slate-400 italic cursor-not-allowed`}
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="First Name" required>
                    <input
                      value={form.firstName}
                      onChange={(e) => set("firstName", e.target.value)}
                      required
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Last Name" required>
                    <input
                      value={form.lastName}
                      onChange={(e) => set("lastName", e.target.value)}
                      required
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Middle Name">
                    <input
                      value={form.middleName}
                      onChange={(e) => set("middleName", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Suffix">
                    <select
                      value={form.suffix}
                      onChange={(e) => set("suffix", e.target.value)}
                      className={inputClass}
                    >
                      {SUFFIX_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s || "—"}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Sex" required>
                    <select
                      value={form.sex}
                      onChange={(e) => set("sex", e.target.value)}
                      required
                      className={inputClass}
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </Field>
                  <Field label="Date of Birth" required>
                    <input
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) => set("dateOfBirth", e.target.value)}
                      required
                      className={inputClass}
                    />
                  </Field>
                </div>

                <Field label="Age">
                  <input
                    type="text"
                    value={form.dateOfBirth ? `${ageInYears(form.dateOfBirth)} years old` : ""}
                    readOnly
                    disabled
                    placeholder="Auto-filled from date of birth"
                    className={inputClass}
                  />
                </Field>

                <Field label="Email">
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    className={inputClass}
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Landline No.">
                    <input
                      value={form.landline}
                      onChange={(e) => set("landline", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Mobile No.">
                    <MobileField value={form.mobile} onChange={(e) => set("mobile", e.target.value)} />
                  </Field>
                </div>
              </div>
            </div>

            {/* Guardian Details */}
            <div>
              <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.hasGuardian}
                  onChange={(e) => set("hasGuardian", e.target.checked)}
                  className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                />
                <span className="text-sm font-semibold text-slate-700">Has Guardian?</span>
              </label>

              <fieldset
                disabled={!form.hasGuardian}
                className={`space-y-3 ${!form.hasGuardian ? "opacity-50" : ""}`}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="First Name">
                    <input
                      value={form.guardian.firstName}
                      onChange={(e) => setGuardian("firstName", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Last Name">
                    <input
                      value={form.guardian.lastName}
                      onChange={(e) => setGuardian("lastName", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Middle Name">
                    <input
                      value={form.guardian.middleName}
                      onChange={(e) => setGuardian("middleName", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Suffix">
                    <select
                      value={form.guardian.suffix}
                      onChange={(e) => setGuardian("suffix", e.target.value)}
                      className={inputClass}
                    >
                      {SUFFIX_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s || "—"}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Sex">
                    <select
                      value={form.guardian.sex}
                      onChange={(e) => setGuardian("sex", e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </Field>
                  <Field label="Date of Birth">
                    <input
                      type="date"
                      value={form.guardian.dateOfBirth}
                      onChange={(e) => setGuardian("dateOfBirth", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Field label="PIN">
                  <input
                    value={form.guardian.pin}
                    onChange={(e) => setGuardian("pin", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Landline No.">
                    <input
                      value={form.guardian.landline}
                      onChange={(e) => setGuardian("landline", e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Mobile No.">
                    <MobileField
                      value={form.guardian.mobile}
                      onChange={(e) => setGuardian("mobile", e.target.value)}
                    />
                  </Field>
                </div>
              </fieldset>
            </div>
          </div>

          {/* Address Details */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-sm font-semibold text-slate-700 mb-3">Address Details</p>
            <div className="space-y-3">
              <Field label="Address" required>
                <input
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  required
                  placeholder="House/Unit No., Street, Subdivision"
                  className={inputClass}
                />
              </Field>

              <AddressFields value={form} onChange={handleAddressChange} Field={Field} inputClass={inputClass} />
            </div>
          </div>

          {/* Family Background */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-sm font-semibold text-slate-700 mb-3">Family Background</p>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Name of Mother">
                  <input
                    value={form.motherName}
                    onChange={(e) => set("motherName", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Contact No.">
                  <input
                    value={form.motherContact}
                    onChange={(e) => set("motherContact", e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Name of Father">
                  <input
                    value={form.fatherName}
                    onChange={(e) => set("fatherName", e.target.value)}
                    className={inputClass}
                  />
                </Field>
                <Field label="Contact No.">
                  <input
                    value={form.fatherContact}
                    onChange={(e) => set("fatherContact", e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>
              <Field label="Nationality">
                <input
                  value={form.nationality}
                  onChange={(e) => set("nationality", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Religion">
                <input
                  value={form.religion}
                  onChange={(e) => set("religion", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Marital Status">
                <select
                  value={form.maritalStatus}
                  onChange={(e) => set("maritalStatus", e.target.value)}
                  className={inputClass}
                >
                  {MARITAL_STATUS_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m || "Select"}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          {/* Emergency Contact Person */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-sm font-semibold text-slate-700 mb-3">Emergency Contact Person</p>
            <div className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Name">
                  <input
                    value={form.emergencyName}
                    onChange={(e) => set("emergencyName", e.target.value)}
                    disabled={form.emergencySameAsGuardian}
                    className={inputClass}
                  />
                  <div className="mt-1.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fillEmergencyFromParent("Mother")}
                      disabled={form.emergencySameAsGuardian || !form.motherName.trim()}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Mother
                    </button>
                    <button
                      type="button"
                      onClick={() => fillEmergencyFromParent("Father")}
                      disabled={form.emergencySameAsGuardian || !form.fatherName.trim()}
                      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Father
                    </button>
                  </div>
                </Field>
                <Field label="Relationship to Patient">
                  <input
                    value={form.emergencyRelationship}
                    onChange={(e) => set("emergencyRelationship", e.target.value)}
                    disabled={form.emergencySameAsGuardian}
                    className={inputClass}
                  />
                </Field>
              </div>

              {form.hasGuardian && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.emergencySameAsGuardian}
                    onChange={(e) => toggleEmergencySameAsGuardian(e.target.checked)}
                    className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                  />
                  <span className="text-xs text-slate-500">Same as Guardian</span>
                </label>
              )}

              <div>
                <Field label="Address">
                  <input
                    value={form.emergencyAddress}
                    onChange={(e) => set("emergencyAddress", e.target.value)}
                    disabled={form.emergencySameAsPatientAddress}
                    className={inputClass}
                  />
                </Field>
                <label className="mt-1.5 flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.emergencySameAsPatientAddress}
                    onChange={(e) => set("emergencySameAsPatientAddress", e.target.checked)}
                    className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                  />
                  <span className="text-xs text-slate-500">Same as Patient's Address</span>
                </label>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Phone No. (Home)">
                  <input
                    value={form.emergencyPhoneHome}
                    onChange={(e) => set("emergencyPhoneHome", e.target.value)}
                    disabled={form.emergencySameAsGuardian}
                    className={inputClass}
                  />
                </Field>
                <div>
                  <Field label="Phone No. (Cell)">
                    <input
                      value={form.emergencyPhoneCell}
                      onChange={(e) => set("emergencyPhoneCell", e.target.value)}
                      disabled={
                        form.emergencySameAsMotherContact ||
                        form.emergencySameAsFatherContact ||
                        form.emergencySameAsGuardian
                      }
                      className={inputClass}
                    />
                  </Field>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.emergencySameAsMotherContact}
                        onChange={(e) => toggleEmergencySameAsMother(e.target.checked)}
                        className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                      />
                      <span className="text-xs text-slate-500">Same as Mother's Contact No.</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.emergencySameAsFatherContact}
                        onChange={(e) => toggleEmergencySameAsFather(e.target.checked)}
                        className="rounded border-slate-300 text-teal-700 focus:ring-teal-600"
                      />
                      <span className="text-xs text-slate-500">Same as Father's Contact No.</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

          <div className="mt-6 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-red-600 hover:border-red-200 transition-colors"
            >
              Clear Form
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {submitting ? "Please wait…" : "Create and Select Patient"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>

    {duplicateMatch && (
      <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <h3 className="text-lg font-semibold text-slate-800">This patient already exists</h3>
          <p className="mt-2 text-sm text-slate-600">
            A patient named <span className="font-medium text-slate-800">
              {[duplicateMatch.firstName, duplicateMatch.middleName, duplicateMatch.lastName, duplicateMatch.suffix]
                .filter(Boolean)
                .join(" ")}
            </span>{" "}
            with the same date of birth is already registered.
          </p>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 space-y-1">
            <div><span className="font-medium text-slate-500">Hospital No.:</span> {duplicateMatch.hospitalNo}</div>
            <div><span className="font-medium text-slate-500">Date of Birth:</span> {duplicateMatch.dateOfBirth}</div>
            <div><span className="font-medium text-slate-500">Sex:</span> {duplicateMatch.sex || "—"}</div>
            <div><span className="font-medium text-slate-500">Address:</span> {duplicateMatch.address || "—"}</div>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            If this is the same person, use their existing record instead of creating a duplicate. Only continue
            creating a new patient if this is genuinely a different person (e.g. a relative with the same name and
            birthdate).
          </p>

          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              onClick={selectExistingPatient}
              className="w-full px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium transition-colors"
            >
              Select Existing Patient
            </button>
            <button
              type="button"
              onClick={() => {
                setDuplicateMatch(null);
                insertPatient();
              }}
              disabled={submitting}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-colors"
            >
              Create New Patient Anyway
            </button>
            <button
              type="button"
              onClick={() => setDuplicateMatch(null)}
              className="w-full px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
            >
              Cancel, Let Me Review
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}