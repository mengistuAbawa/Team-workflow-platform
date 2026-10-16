
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, Search, RefreshCw, Mail, UserRound,
  ShieldCheck, AlertCircle, MessageCircle
} from "lucide-react";
import api from "../services/api";
import Loader from "../components/common/Loader";

const roleStyles = {
  admin: "bg-violet-50 text-violet-700",
  manager: "bg-blue-50 text-blue-700",
  member: "bg-slate-100 text-slate-600",
};

function initials(name) {
  return (name || "Team Member")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function Team() {
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTeam = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Requires GET /api/team on the backend.
      const response = await api.get("/team");
      const payload = response.data?.data;
      setMembers(Array.isArray(payload) ? payload : payload?.members ?? []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        "Could not load team members. Check the API connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  async function startChat(member) {
    setError("");
    try {
      const response = await api.post("/conversations", { conversation_type: "private", recipient_id: member.id });
      const conversationId = response.data?.data?.conversation_id;
      if (conversationId) navigate(`/messages?conversation=${conversationId}`);
    } catch (err) {
      setError(err.response?.data?.message || "Could not start a conversation.");
    }
  }

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return members.filter((member) => {
      const role = String(member.role || "member").toLowerCase();
      const matchesRole = roleFilter === "all" || role === roleFilter;
      const text = [
        member.full_name,
        member.name,
        member.email,
        member.department,
      ].filter(Boolean).join(" ").toLowerCase();

      return matchesRole && text.includes(query);
    });
  }, [members, search, roleFilter]);

  const adminCount = members.filter((member) => member.role === "admin").length;
  const managerCount = members.filter((member) => member.role === "manager").length;
  const activeCount = members.filter((member) => member.is_active !== 0 && member.is_active !== false).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-600">People and collaboration</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Team</h1>
          <p className="mt-1 text-sm text-slate-500">View people in your TeamFlow workspace.</p>
        </div>
        <button onClick={loadTeam} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} /> {error}
          <button onClick={loadTeam} className="ml-auto font-semibold underline">Retry</button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total members", value: members.length, icon: Users, color: "bg-violet-50 text-violet-600" },
          { label: "Administrators", value: adminCount, icon: ShieldCheck, color: "bg-blue-50 text-blue-600" },
          { label: "Managers", value: managerCount, icon: UserRound, color: "bg-orange-50 text-orange-600" },
          { label: "Active accounts", value: activeCount, icon: Users, color: "bg-emerald-50 text-emerald-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-500">{label}</p>
              <span className={`flex size-10 items-center justify-center rounded-xl ${color}`}><Icon size={20} /></span>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
          </article>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Workspace members</h2>
            <p className="mt-1 text-sm text-slate-500">{filteredMembers.length} members displayed</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative">
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <span className="sr-only">Search team members</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members..." className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 sm:w-64" />
            </label>

            <label>
              <span className="sr-only">Filter by role</span>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-500 sm:w-40">
                <option value="all">All roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="member">Member</option>
              </select>
            </label>
          </div>
        </div>

        {loading ? <Loader label="Loading team members..." /> : filteredMembers.length ? (
          <>
            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(100px,1fr)_minmax(90px,1fr)] gap-4 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 md:grid">
              <span>Member</span><span>Email</span><span>Role</span><span>Status</span>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredMembers.map((member) => {
                const name = member.full_name || member.name || "Team Member";
                const role = String(member.role || "member").toLowerCase();
                const active = member.is_active !== 0 && member.is_active !== false;

                return (
                  <article key={member.id ?? member.email} className="grid gap-3 px-5 py-4 transition hover:bg-slate-50 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(100px,1fr)_minmax(90px,1fr)] md:items-center md:gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      {member.avatar ? (
                        <img src={member.avatar} alt="" className="size-11 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">{initials(name)}</div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
                        {member.department && <p className="mt-1 truncate text-xs text-slate-500">{member.department}</p>}
                      </div>
                    </div>

                    <div className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
                      <Mail size={15} className="shrink-0 text-slate-400" />
                      <a href={`mailto:${member.email}`} className="truncate hover:text-violet-700">{member.email || "No email provided"}</a>
                    </div>

                    <div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${roleStyles[role] || roleStyles.member}`}>{role}</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${active ? "text-emerald-700" : "text-slate-400"}`}>
                        <span className={`size-2 rounded-full ${active ? "bg-emerald-500" : "bg-slate-300"}`} />
                        {active ? "Active" : "Inactive"}
                      </span>
                      <button onClick={() => startChat(member)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50"><MessageCircle size={14} /> Message</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <div className="px-5 py-16 text-center">
            <Users size={30} className="mx-auto text-slate-300" />
            <h3 className="mt-3 font-semibold text-slate-800">{members.length ? "No matching members" : "No team members found"}</h3>
            <p className="mt-1 text-sm text-slate-500">{members.length ? "Try changing your search or role filter." : "Team members will appear here when the API returns them."}</p>
          </div>
        )}
      </section>
    </div>
  );
}



