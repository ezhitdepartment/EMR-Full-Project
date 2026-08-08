import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { User, Lock, Eye, EyeOff, Users, ChevronDown } from "lucide-react";
import logoImg from "../../assets/logo.jpg";
import hospitalBg from "../../assets/hospital-bg.avif";
import { ROLE_OPTIONS, STAFF_ROLES } from "../../data/roles";

export default function Login() {
  const [role, setRole] = useState(ROLE_OPTIONS[0].value);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect already logged-in users
  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        navigate("/admin", { replace: true });
      } else if (STAFF_ROLES.includes(user.role)) {
        navigate("/patients", { replace: true });
      }
    }
  }, [user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const result = await login(username, password, role);
    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    // Redirect based on role
    if (result.role === "admin") {
      navigate("/admin");
    } else if (STAFF_ROLES.includes(result.role)) {
      navigate("/patients");
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-900 flex items-center justify-center px-4 pt-28 pb-10 md:py-10">
      {/* Hospital background photo */}
      <img
        src={hospitalBg}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Brand-blue wash over the photo for legibility */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/75 via-blue-900/45 to-slate-900/60" />
      <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-blue-500/30 blur-3xl" />

      {/* Branding, top-left */}
      <div className="absolute top-6 left-6 md:top-10 md:left-10 flex items-center gap-3 z-10">
        <img
          src={logoImg}
          alt="E. Zarate Hospital seal"
          className="w-12 h-12 md:w-14 md:h-14 rounded-full ring-4 ring-white/80 shadow-lg object-cover bg-white"
        />
        <div className="leading-tight">
          <p className="text-white font-extrabold text-lg md:text-2xl tracking-tight drop-shadow-sm">
            E.ZARATE
          </p>
          <p className="text-teal-300 font-semibold text-[10px] md:text-xs tracking-[0.3em]">
            HOSPITAL
          </p>
        </div>
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-md md:mr-6 lg:mr-16">
        <div className="rounded-tl-[3rem] rounded-br-[3rem] rounded-tr-2xl rounded-bl-2xl bg-white/90 backdrop-blur-xl shadow-2xl border border-white/60 px-6 py-8 md:px-9 md:py-10">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <Users size={26} className="text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
            <p className="text-sm text-slate-500 mt-1">Login to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selector — replaces the old Staff/Admin toggle now that
                there are more than two roles in play. */}
            <div className="relative">
              <Users
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                aria-label="Role"
                className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 py-3 text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>

            {/* Username or Email */}
            <div className="relative">
              <User
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username or Email"
                autoComplete="username"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-500">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Remember me
              </label>
              <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
                Forgot password?
              </a>
            </div>

            {error && (
              <p className="text-xs text-red-600" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl shadow-sm shadow-blue-600/30 transition-colors"
            >
              {submitting ? "Logging in…" : "Login"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-white/70 drop-shadow-sm">
          For staff and administrator use only.
        </p>
      </div>
    </div>
  );
}