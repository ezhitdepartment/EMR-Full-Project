// Shared across every place a new patient record is created (the quick
// "Create Patient" modal in Patients.jsx and the full intake form in
// PatientRegistration.jsx) so record numbers are generated the same way
// everywhere instead of drifting into two implementations.
export function generateRecordNo() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 900 + 100);
  return `${timestamp}${random}`;
}
