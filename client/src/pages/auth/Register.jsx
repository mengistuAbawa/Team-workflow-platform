import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  ClipboardList,
  User,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getRoleDashboardPath } from "../../routes/ProtectedRoute";

const roleOptions = [
  {
    value: "member",
    label: "Team Member",
    icon: User,
    description: "Execute tasks, collaborate, and track progress.",
    accent: "text-emerald-600",
    ring: "focus:ring-emerald-100",
    border: "border-emerald-300",
    bg: "bg-emerald-50",
  },
  {
    value: "manager",
    label: "Manager",
    icon: ClipboardList,
    description: "Create projects, assign tasks, and review work.",
    accent: "text-blue-600",
    ring: "focus:ring-blue-100",
    border: "border-blue-300",
    bg: "bg-blue-50",
  },
  {
    value: "admin",
    label: "Administrator",
    icon: ShieldCheck,
    description: "Full system control — manage all users and settings.",
    accent: "text-purple-600",
    ring: "focus:ring-purple-100",
    border: "border-purple-300",
    bg: "bg-purple-50",
  },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "member",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    if (form.password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    setSubmitting(true);

    try {
      const newUser = await register({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      });

      navigate(getRoleDashboardPath(newUser.role), { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create your account. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7F8FC] px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/50 sm:p-10">
        <Link to="/login" className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-white">
            <Zap size={23} fill="currentColor" />
          </span>
          <span className="text-xl font-bold text-slate-900">TeamFlow</span>
        </Link>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Create your account
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Bring your projects, tasks, and teammates together.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label
              htmlFor="fullName"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Full name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              maxLength={120}
              value={form.fullName}
              onChange={updateField}
              placeholder="Your full name"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={190}
              value={form.email}
              onChange={updateField}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              value={form.password}
              onChange={updateField}
              placeholder="At least 8 characters"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={form.confirmPassword}
              onChange={updateField}
              placeholder="Enter your password again"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            />
          </div>

          <div>
            <span className="mb-2 block text-sm font-medium text-slate-700">
              Select your role
            </span>
            <div className="space-y-2.5">
              {roleOptions.map((option) => {
                const Icon = option.icon;
                const selected = form.role === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({ ...current, role: option.value }))
                    }
                    aria-pressed={selected}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                      selected
                        ? `${option.border} ${option.bg} ring-2 ${option.ring}`
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span
                      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${
                        selected ? option.bg : "bg-slate-100"
                      } ${selected ? option.accent : "text-slate-500"}`}
                    >
                      <Icon size={19} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-semibold ${
                          selected ? option.accent : "text-slate-800"
                        }`}
                      >
                        {option.label}
                      </p>
                      <p className="text-xs text-slate-500">
                        {option.description}
                      </p>
                    </div>
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                        selected
                          ? `${option.border} ${option.bg}`
                          : "border-slate-300"
                      }`}
                    >
                      {selected && (
                        <span
                          className={`size-2.5 rounded-full ${option.bg
                            .replace("bg-", "bg-")
                            .replace("50", "500")}`}
                        />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:opacity-60"
          >
            {submitting ? "Creating account..." : "Create account"}
            {!submitting && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="mt-7 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-violet-700 hover:text-violet-800"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
