// Shared age helpers. Lab Orders shows age as "39 YR(S) 11 MO(S) 18 DAY(S)"
// (matches the reference PDF/report format) — kept here instead of inline
// so any other page can reuse the exact same calculation.

/**
 * Returns the calendar-aware age breakdown between `dob` and today as
 * "Y YR(S) M MO(S) D DAY(S)". Returns "—" if `dob` is missing/invalid or
 * in the future.
 */
export function formatAge(dob) {
  if (!dob) return "—";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "—";

  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    months -= 1;
    // Last day of the month before `now` — how many days "borrowed".
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return "—";

  return `${years} YR(S) ${months} MO(S) ${days} DAY(S)`;
}

/** Whole-year age only, e.g. for filtering/sorting by age. */
export function ageInYears(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}
