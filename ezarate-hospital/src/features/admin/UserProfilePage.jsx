import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Upload,
  UserRound,
  Mail,
  BadgeCheck,
  CalendarDays,
  FileBadge,
  ClipboardList,
  Stethoscope,
  Users2,
} from "lucide-react";
import { ROLE_OPTIONS } from "../../data/roles";
import { getUserById, saveUserPhoto, getUserActivityStats } from "../../utils/adminUsers";

const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map((r) => [r.value, r.label]));

function formatDateCreated(iso) {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "—";
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  const y = dt.getFullYear();
  return `${m}/${d}/${y}`;
}

export default function UserProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Camera capture — same approach as the patient photo capture in
  // PatientProfile.jsx (getUserMedia -> draw a frame to a hidden canvas
  // -> toDataURL), so the UX matches across the app.
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [savingPhoto, setSavingPhoto] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    const [profileRow, activity] = await Promise.all([
      getUserById(userId),
      getUserActivityStats(userId),
    ]);
    if (!profileRow) {
      setError("Couldn't find that user.");
    } else {
      setProfile(profileRow);
      setStats(activity);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!cameraStream || !videoRef.current) return;
    videoRef.current.srcObject = cameraStream;
    videoRef.current.play().catch((err) => console.error("Error playing camera stream:", err));
  }, [cameraStream]);

  async function startCamera() {
    setIsCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      setCameraStream(stream);
      setIsCameraActive(true);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Couldn't access the camera. Check your browser's camera permissions and try again.");
    }
  }

  function stopCamera() {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setIsCameraReady(false);
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function capturePhoto() {
    if (!videoRef.current) return;
    if (!isCameraReady) {
      alert("Camera is still warming up. Please wait a moment and try again.");
      return;
    }

    const video = videoRef.current;
    const context = canvasRef.current.getContext("2d");

    if (typeof video.requestVideoFrameCallback === "function") {
      await new Promise((resolve) => video.requestVideoFrameCallback(() => resolve()));
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width === 0 || height === 0 || video.readyState < 2) {
      alert("Camera is still loading. Please wait a moment and try again.");
      return;
    }

    canvasRef.current.width = width;
    canvasRef.current.height = height;
    context.drawImage(video, 0, 0, width, height);
    const photoDataUrl = canvasRef.current.toDataURL("image/jpeg", 0.95);

    setSavingPhoto(true);
    try {
      const updated = await saveUserPhoto(userId, photoDataUrl);
      setProfile(updated);
    } catch (err) {
      alert(err.message || "Couldn't save the photo.");
    } finally {
      setSavingPhoto(false);
      stopCamera();
    }
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const photoDataUrl = reader.result;
      if (!photoDataUrl) return;
      setSavingPhoto(true);
      try {
        const updated = await saveUserPhoto(userId, photoDataUrl);
        setProfile(updated);
      } catch (err) {
        alert(err.message || "Couldn't save the photo.");
      } finally {
        setSavingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  if (loading) {
    return <div className="py-16 text-center text-sm text-slate-400">Loading profile…</div>;
  }

  if (error || !profile) {
    return (
      <div className="max-w-3xl">
        <button
          type="button"
          onClick={() => navigate("/admin/roles")}
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Roles
        </button>
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400 bg-white border border-slate-200 rounded-xl">
          <Users2 size={28} />
          <p className="text-sm font-medium text-red-600">{error || "Couldn't find that user."}</p>
        </div>
      </div>
    );
  }

  const fullName = [profile.prefix, profile.firstName, profile.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    <div className="max-w-3xl">
      <button
        type="button"
        onClick={() => navigate("/admin/roles")}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors"
      >
        <ArrowLeft size={15} />
        Back to Roles
      </button>

      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 mb-1">Admin</p>
      <h1 className="text-2xl font-semibold text-slate-800 mb-6">Profile</h1>

      {/* Basic info card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 mb-5">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          {/* Photo */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
              {profile.photo ? (
                <img src={profile.photo} alt={profile.username} className="w-full h-full object-cover" />
              ) : (
                <UserRound size={40} className="text-slate-300" />
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={startCamera}
                disabled={savingPhoto}
                title="Take Photo"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-60"
              >
                <Camera size={11} />
                Take Photo
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={savingPhoto}
                title="Upload Photo"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-60"
              >
                <Upload size={11} />
                Upload
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-400 mb-0.5">Username</p>
              <p className="font-medium text-slate-800">{profile.username || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
                <BadgeCheck size={11} /> Role
              </p>
              <p className="font-medium text-slate-800">
                {ROLE_LABELS[profile.role] || profile.role || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
                <Mail size={11} /> Email
              </p>
              <p className="font-medium text-slate-800">{profile.email || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Full Name</p>
              <p className="font-medium text-slate-800">{fullName || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
                <FileBadge size={11} /> License Number
              </p>
              <p className="font-medium text-slate-800">{profile.licenseNumber || "—"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-400 mb-0.5 flex items-center gap-1">
                <CalendarDays size={11} /> Date Created
              </p>
              <p className="font-medium text-slate-800">{formatDateCreated(profile.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-800 mb-4">Activity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-teal-50 text-teal-700 shrink-0">
              <Users2 size={16} />
            </span>
            <div>
              <p className="text-lg font-semibold text-slate-800">{stats.patientsCreated}</p>
              <p className="text-xs text-slate-500">Patients Created</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 shrink-0">
              <Stethoscope size={16} />
            </span>
            <div>
              <p className="text-lg font-semibold text-slate-800">{stats.patientsConsulted}</p>
              <p className="text-xs text-slate-500">Patients Consulted</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-50 text-amber-700 shrink-0">
              <ClipboardList size={16} />
            </span>
            <div>
              <p className="text-lg font-semibold text-slate-800">{stats.consultationsAuthored}</p>
              <p className="text-xs text-slate-500">Consultation Entries</p>
            </div>
          </div>
        </div>
      </div>

      {/* Camera modal for live photo capture — same UX as the patient profile */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800">Take Photo</h3>
              <button
                type="button"
                onClick={stopCamera}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                ✕
              </button>
            </div>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedData={() => {
                setIsCameraReady(true);
                if (videoRef.current) {
                  videoRef.current.play().catch((err) => console.error("Error playing video:", err));
                }
              }}
              className="w-full aspect-video bg-black object-cover"
            />
            <div className="flex items-center justify-center gap-2 px-4 py-3">
              <button
                type="button"
                onClick={capturePhoto}
                disabled={!isCameraReady || savingPhoto}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 disabled:opacity-60 px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                <Camera size={16} />
                {isCameraReady ? (savingPhoto ? "Saving…" : "Capture Photo") : "Preparing…"}
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden canvas used to grab a still frame from the video */}
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}