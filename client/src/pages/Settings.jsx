
import { useEffect, useState } from "react";
import {
  UserRound, LockKeyhole, SlidersHorizontal,
  Save, AlertCircle, CheckCircle2
} from "lucide-react";
import api from "../services/api";
import Button from "../components/common/Button";
import Loader from "../components/common/Loader";

export default function Settings() {
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
  });
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    taskReminders: true,
    weeklySummary: false,
  });
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await api.get("/auth/me");
        const payload = response.data?.data;
        const user = payload?.user ?? payload;

        setProfile({
          full_name: user?.full_name || "",
          email: user?.email || "",
        });
      } catch (err) {
        setError(err.response?.data?.message || "Could not load your profile.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function saveProfile(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSavingProfile(true);

    try {
      // Requires PATCH /api/auth/profile on the backend.
      await api.patch("/auth/profile", profile);
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Profile saving is not yet available. Add the PATCH /api/auth/profile endpoint.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (passwords.newPassword.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      // Requires POST /api/auth/change-password on the backend.
      await api.post("/auth/change-password", {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage("Password changed successfully.");
    } catch (err) {
      setError(err.response?.data?.message || "Password changing is not yet available. Add the POST /api/auth/change-password endpoint.");
    } finally {
      setSavingPassword(false);
    }
  }

  function savePreferences(event) {
    event.preventDefault();
    try {
      sessionStorage.setItem("teamflow_preferences", JSON.stringify(preferences));
      setMessage("Preferences saved for this browser session.");
      setError("");
    } catch {
      setError("Could not save preferences in this browser session.");
    }
  }

  if (loading) return <Loader label="Loading settings..." />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <p className="text-sm font-medium text-violet-600">Personalize your workspace</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account and preferences.</p>
      </header>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"><AlertCircle size={18} className="mt-0.5 shrink-0" />{error}</div>}
      {message && <div role="status" className="flex items-start gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 size={18} className="mt-0.5 shrink-0" />{message}</div>}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><UserRound size={20} /></div>
          <div><h2 className="font-bold text-slate-900">Profile information</h2><p className="text-sm text-slate-500">Update your name and email address.</p></div>
        </div>
        <form onSubmit={saveProfile} className="space-y-5 p-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="settings-name" className="mb-1.5 block text-sm font-medium text-slate-700">Full name</label>
              <input id="settings-name" required minLength={2} value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
            </div>
            <div>
              <label htmlFor="settings-email" className="mb-1.5 block text-sm font-medium text-slate-700">Email address</label>
              <input id="settings-email" type="email" required value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" loading={savingProfile}><Save size={16} /> Save profile</Button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><LockKeyhole size={20} /></div>
          <div><h2 className="font-bold text-slate-900">Change password</h2><p className="text-sm text-slate-500">Choose a strong password for your account.</p></div>
        </div>
        <form onSubmit={changePassword} className="space-y-5 p-5">
          {[
            ["currentPassword", "Current password"],
            ["newPassword", "New password"],
            ["confirmPassword", "Confirm new password"],
          ].map(([name, label]) => (
            <div key={name}>
              <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
              <input id={name} type="password" required minLength={name === "currentPassword" ? 1 : 8} autoComplete={name === "currentPassword" ? "current-password" : "new-password"} value={passwords[name]} onChange={(e) => setPasswords({ ...passwords, [name]: e.target.value })} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
            </div>
          ))}
          <div className="flex justify-end">
            <Button type="submit" loading={savingPassword} variant="outline">Update password</Button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
          <div className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><SlidersHorizontal size={20} /></div>
          <div><h2 className="font-bold text-slate-900">Preferences</h2><p className="text-sm text-slate-500">Choose which reminders you want.</p></div>
        </div>
        <form onSubmit={savePreferences} className="divide-y divide-slate-100 p-5">
          {[
            ["emailNotifications", "Email notifications", "Receive updates about workspace activity."],
            ["taskReminders", "Task reminders", "Keep track of upcoming task deadlines."],
            ["weeklySummary", "Weekly summary", "Receive a weekly overview of your work."],
          ].map(([key, label, description]) => (
            <label key={key} className="flex cursor-pointer items-center justify-between gap-4 py-4 first:pt-0 last:pb-5">
              <span><span className="block text-sm font-semibold text-slate-800">{label}</span><span className="mt-1 block text-sm text-slate-500">{description}</span></span>
              <input type="checkbox" checked={preferences[key]} onChange={(e) => setPreferences({ ...preferences, [key]: e.target.checked })} className="size-5 shrink-0 accent-violet-600" />
            </label>
          ))}
          <div className="flex justify-end pt-5">
            <Button type="submit"><Save size={16} /> Save preferences</Button>
          </div>
        </form>
      </section>
    </div>
  );
}
