import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Stethoscope, ClipboardList, Search, Plus } from "lucide-react";
import LineChart from "../../components/common/LineChart";
import CreatePatientModal from "../../features/patients/CreatePatientModal";
import { useAuth } from "../../context/AuthContext";
import { loadPatients } from "../../utils/patients";
import { loadEncounters, loadDoctors } from "../../utils/encounters";
import { ageInYears } from "../../utils/age";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthlyCounts(dates, year) {
  const counts = new Array(12).fill(0);
  dates.forEach((iso) => {
    if (!iso) return;
    const d = new Date(iso);
    if (d.getFullYear() === year) counts[d.getMonth()] += 1;
  });
  return MONTH_LABELS.map((label, i) => ({ label, value: counts[i] }));
}

function initials(firstName, lastName) {
  return `${(firstName || "?")[0] || ""}${(lastName || "")[0] || ""}`.toUpperCase();
}

const AVATAR_COLORS = ["bg-blue-100 text-blue-700", "bg-emerald-100 text-emerald-700", "bg-purple-100 text-purple-700", "bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700"];
function avatarColor(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [encounters, setEncounters] = useState([]);
  const [doctorCount, setDoctorCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreatePatient, setShowCreatePatient] = useState(false);

  async function refresh() {
    const [patientRows, encounterRows, doctors] = await Promise.all([
      loadPatients(),
      loadEncounters(),
      loadDoctors(),
    ]);
    setPatients(patientRows);
    setEncounters(encounterRows);
    setDoctorCount(doctors.length);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  const displayName = [user?.prefix, user?.firstName].filter(Boolean).join(" ").trim() || user?.username || "Admin";

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const registrationsToday = encounters.filter((e) => e.appointmentDate === todayStr).length;

  const registrationsPerMonth = useMemo(
    () => monthlyCounts(encounters.map((e) => e.appointmentDate), today.getFullYear()),
    [encounters]
  );
  const patientsPerMonth = useMemo(
    () => monthlyCounts(patients.map((p) => p.createdAt), today.getFullYear()),
    [patients]
  );

  // loadPatients() already returns newest-first, but sorting again here is
  // cheap insurance against that ordering ever changing upstream — this
  // list must always show the most recently created patient at the top.
  const recentPatients = useMemo(() => {
    const sorted = [...patients].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const q = search.trim().toLowerCase();
    const filtered = q
      ? sorted.filter((p) =>
          [p.hospitalNo, p.firstName, p.lastName, p.middleName]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
        )
      : sorted;
    return filtered.slice(0, 8);
  }, [patients, search]);

  function handlePatientCreated() {
    setShowCreatePatient(false);
    refresh();
  }

  return (
    <div className="max-w-7xl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Dashboard</h1>
      <p className="text-sm text-slate-500 mb-5">Welcome back, {displayName}!</p>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex items-center gap-3">
          <span className="flex items-center justify-center w-11 h-11 rounded-full bg-blue-100 text-blue-600 shrink-0">
            <Users size={20} />
          </span>
          <div>
            <p className="text-xs text-slate-500">Total Patients</p>
            <p className="text-xl font-bold text-slate-800">
              {loading ? "—" : patients.length}
              <span className="ml-1.5 text-[11px] font-medium text-emerald-600 align-middle">All time</span>
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex items-center gap-3">
          <span className="flex items-center justify-center w-11 h-11 rounded-full bg-emerald-100 text-emerald-600 shrink-0">
            <Stethoscope size={20} />
          </span>
          <div>
            <p className="text-xs text-slate-500">Total Doctors</p>
            <p className="text-xl font-bold text-slate-800">
              {loading ? "—" : doctorCount}
              <span className="ml-1.5 text-[11px] font-medium text-emerald-600 align-middle">All time</span>
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 flex items-center gap-3">
          <span className="flex items-center justify-center w-11 h-11 rounded-full bg-orange-100 text-orange-600 shrink-0">
            <ClipboardList size={20} />
          </span>
          <div>
            <p className="text-xs text-slate-500">Registrations</p>
            <p className="text-xl font-bold text-slate-800">
              {loading ? "—" : registrationsToday}
              <span className="ml-1.5 text-[11px] font-medium text-orange-500 align-middle">Today</span>
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <p className="text-sm font-semibold text-slate-800">
            Registrations Per Month <span className="font-normal text-slate-400 text-xs">This Year</span>
          </p>
          <div className="mt-3">
            <LineChart data={registrationsPerMonth} color="#2563eb" />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
          <p className="text-sm font-semibold text-slate-800">
            Patients Per Month <span className="font-normal text-slate-400 text-xs">This Year</span>
          </p>
          <div className="mt-3">
            <LineChart data={patientsPerMonth} color="#059669" area />
          </div>
        </div>
      </div>

      {/* Recent Patient Records */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-slate-200">
          <p className="text-sm font-semibold text-slate-800 whitespace-nowrap">Recent Patient Records</p>
          <button
            type="button"
            onClick={() => setShowCreatePatient(true)}
            className="inline-flex items-center gap-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-medium px-3 py-1.5 transition-colors"
          >
            <Plus size={13} />
            Add Record
          </button>
          <div className="relative ml-auto">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Patient"
              className="rounded-lg border border-slate-300 pl-7 pr-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600 w-40"
            />
          </div>
        </div>

        {recentPatients.length === 0 ? (
          <div className="flex items-center justify-center py-14 text-sm text-slate-400">
            {loading ? "Loading…" : "No patients found"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-2 font-medium">Hospital No.</th>
                  <th className="px-4 py-2 font-medium">Patient Name</th>
                  <th className="px-4 py-2 font-medium">Age</th>
                  <th className="px-4 py-2 font-medium">Sex</th>
                  <th className="px-4 py-2 font-medium">Date Registered</th>
                </tr>
              </thead>
              <tbody>
                {recentPatients.map((p) => {
                  const name = [p.firstName, p.lastName].filter(Boolean).join(" ");
                  const created = p.createdAt ? new Date(p.createdAt) : null;
                  const dateLabel = created
                    ? `${String(created.getMonth() + 1).padStart(2, "0")}/${String(created.getDate()).padStart(2, "0")}/${created.getFullYear()}`
                    : "—";
                  return (
                    <tr
                      key={p.hospitalNo}
                      onClick={() => navigate(`/patients/${p.hospitalNo}`)}
                      className="border-b border-slate-50 last:border-0 hover:bg-teal-50/60 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">{p.hospitalNo || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          {p.photo ? (
                            <img src={p.photo} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
                          ) : (
                            <span
                              className={`flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-semibold shrink-0 ${avatarColor(
                                p.hospitalNo
                              )}`}
                            >
                              {initials(p.firstName, p.lastName)}
                            </span>
                          )}
                          <span className="font-medium text-slate-800">{name || "—"}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                        {ageInYears(p.dateOfBirth) ?? "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{p.sex || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{dateLabel}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreatePatient && (
        <CreatePatientModal onClose={() => setShowCreatePatient(false)} onCreated={handlePatientCreated} />
      )}
    </div>
  );
}