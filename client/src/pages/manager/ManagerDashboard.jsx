import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FolderKanban,
  Eye,
  Users,
  CheckCircle2,
  CalendarDays,
  Clock,
  AlertCircle,
  RefreshCw,
  Plus,
  Flag,
  ArrowRight,
  ListChecks,
  TrendingUp,
  ClipboardList,
} from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Loader from "../../components/common/Loader";

const errorMessage = (error) =>
  error.response?.data?.message || error.message || "Something went wrong.";

const initials = (name = "TM") =>
  name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

const avatarColors = [
  "bg-amber-200",
  "bg-rose-200",
  "bg-sky-200",
  "bg-emerald-200",
  "bg-violet-200",
];

const projectColors = [
  "bg-violet-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-pink-500",
];

const priorityStyles = {
  urgent: "bg-rose-50 text-rose-700 border-rose-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-slate-50 text-slate-600 border-slate-200",
};

const statusStyles = {
  planning: "bg-amber-50 text-amber-700 ring-amber-600/20",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  completed: "bg-blue-50 text-blue-700 ring-blue-600/20",
  archived: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

function getProgress(project) {
  if (project.progress != null) {
    const progress = Number(project.progress);
    return Number.isFinite(progress)
      ? Math.min(100, Math.max(0, progress))
      : 0;
  }
  if (project.status === "completed") return 100;

  const tasks = Number(project.total_tasks ?? 0);
  const completed = Number(project.completed_tasks ?? 0);
  if (tasks <= 0) return 0;
  return Math.min(100, Math.round((completed / tasks) * 100));
}

function formatDate(date) {
  if (!date) return "No deadline";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "No deadline";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(date) {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  const diff = Math.ceil((parsed.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/dashboard");
      if (!response.data?.success) {
        throw new Error("Unable to load manager dashboard data.");
      }
      setData(response.data.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const projects = useMemo(() => data?.projects ?? [], [data]);
  const tasks = useMemo(() => data?.tasks ?? [], [data]);
  const members = useMemo(
    () => data?.members || data?.teamMembers || [],
    [data]
  );

  // Derived stats
  const activeProjects = projects.filter(
    (p) => p.status === "active" || p.status === "planning"
  ).length;
  const reviewTasks = tasks.filter((t) => {
    const status = String(t.status || "").toLowerCase();
    return status === "in_review";
  });
  const completedTasks = tasks.filter((t) => {
    const status = String(t.status || "").toLowerCase();
    return status === "done" || status === "completed";
  });
  const urgentTasks = tasks.filter((t) => {
    const status = String(t.status || "").toLowerCase();
    return t.priority === "urgent" && status !== "done";
  });

  // Upcoming deadlines (sorted by due date, exclude done)
  const upcomingDeadlines = useMemo(() => {
    return tasks
      .filter((t) => {
        const status = String(t.status || "").toLowerCase();
        return status !== "done" && t.due_date;
      })
      .sort(
        (a, b) =>
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      )
      .slice(0, 6);
  }, [tasks]);

  // Team workload: count tasks per member
  const teamWorkload = useMemo(() => {
    const workload = {};
    tasks.forEach((task) => {
      const assignees =
        task.assignees ||
        task.members ||
        task.team_members ||
        (task.assignee ? [task.assignee] : []);
      assignees.forEach((person) => {
        const key = person.id || person.user_id;
        if (!key) return;
        if (!workload[key]) {
          workload[key] = {
            ...person,
            total: 0,
            done: 0,
            inProgress: 0,
          };
        }
        const status = String(task.status || "").toLowerCase();
        workload[key].total += 1;
        if (status === "done" || status === "completed") workload[key].done += 1;
        else if (status === "in_progress") workload[key].inProgress += 1;
      });
    });
    return Object.values(workload).sort((a, b) => b.total - a.total);
  }, [tasks]);

  if (loading && !data) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader label="Loading manager dashboard..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-sky-950 p-6 text-white shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300 ring-1 ring-blue-400/30">
            <ClipboardList size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-blue-500/30 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-200">
                Project Management
              </span>
              <span className="flex items-center gap-1 text-xs text-emerald-400">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
              Welcome back, {user?.full_name?.split(" ")[0] || "Manager"}
            </h1>
            <p className="mt-1 text-sm text-blue-200/80">
              Oversee projects, review tasks, and keep your team on track.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/10"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link
            to="/projects/new"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500"
          >
            <Plus size={18} />
            New Project
          </Link>
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"
        >
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="absolute inset-x-0 top-0 h-1 bg-violet-500" aria-hidden="true" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Active Projects
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {activeProjects}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {projects.length} total in workspace
              </p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <FolderKanban size={20} />
            </span>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" aria-hidden="true" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Tasks Pending Review
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {reviewTasks.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {urgentTasks.length} urgent task(s) open
              </p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Eye size={20} />
            </span>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="absolute inset-x-0 top-0 h-1 bg-sky-500" aria-hidden="true" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Team Members
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {members.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Across all projects
              </p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Users size={20} />
            </span>
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" aria-hidden="true" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Completed Tasks
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {completedTasks.length}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {tasks.length > 0
                  ? `${Math.round((completedTasks.length / tasks.length) * 100)}% completion rate`
                  : "No tasks yet"}
              </p>
            </div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={20} />
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Projects Progress */}
        <div className="lg:col-span-2 space-y-6">
          {/* Projects Overview */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <FolderKanban size={19} />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Projects Progress
                  </h2>
                  <p className="text-sm text-slate-500">
                    Track delivery status across your projects
                  </p>
                </div>
              </div>
              <Link
                to="/projects"
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                View all <ArrowRight size={15} />
              </Link>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {projects.slice(0, 6).map((project, index) => {
                const progress = getProgress(project);
                const status = project.status || "planning";
                const statusClass =
                  statusStyles[status] || statusStyles.planning;
                const statusLabel = status
                  .replaceAll("_", " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase());

                return (
                  <Link
                    key={project.id || project._id || index}
                    to={`/projects/${project.id || project._id}`}
                    className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-white ${
                          projectColors[index % projectColors.length]
                        }`}
                      >
                        <FolderKanban size={21} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="truncate font-semibold text-slate-900">
                            {project.name || project.title}
                          </h3>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold capitalize ring-1 ${statusClass}`}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                          {project.description || "No description"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Progress</span>
                        <span className="font-semibold text-slate-700">
                          {progress}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={14} />
                        {formatDate(project.due_date)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <ListChecks size={14} />
                        {project.total_tasks ?? 0} tasks
                      </span>
                    </div>
                  </Link>
                );
              })}

              {projects.length === 0 && (
                <div className="col-span-2 rounded-2xl border border-dashed border-slate-300 p-10 text-center">
                  <FolderKanban
                    size={32}
                    className="mx-auto text-slate-300"
                  />
                  <p className="mt-3 font-semibold text-slate-700">
                    No projects yet
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Create your first project to start tracking progress.
                  </p>
                  <Link
                    to="/projects/new"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <Plus size={16} /> Create Project
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Tasks Pending Review */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Eye size={19} />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Tasks Pending Review
                  </h2>
                  <p className="text-sm text-slate-500">
                    Approve or request changes on submitted work
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
                {reviewTasks.length}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {reviewTasks.map((task) => {
                const priority = task.priority || "medium";
                const priorityClass =
                  priorityStyles[priority] || priorityStyles.medium;
                const members =
                  task.assignees ||
                  task.members ||
                  task.team_members ||
                  (task.assignee ? [task.assignee] : []);

                return (
                  <Link
                    key={task.id || task._id}
                    to={
                      task.project_id
                        ? `/projects/${task.project_id}`
                        : "/tasks"
                    }
                    className="flex items-start gap-4 p-4 transition hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {task.title || task.name}
                        </h3>
                        <span
                          className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-bold capitalize ${priorityClass}`}
                        >
                          {priority}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                        {task.description || "No description"}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays size={14} />
                          {formatDate(task.due_date)}
                        </span>
                        {task.project_name && (
                          <span className="inline-flex items-center gap-1">
                            <FolderKanban size={14} />
                            {task.project_name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 -space-x-2">
                      {members.slice(0, 3).map((member, i) => (
                        <span
                          key={member.id || i}
                          title={member.full_name || member.name}
                          className={`flex size-7 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-slate-700 ${
                            avatarColors[i % avatarColors.length]
                          }`}
                        >
                          {initials(member.full_name || member.name || `M${i}`)}
                        </span>
                      ))}
                      {members.length > 3 && (
                        <span className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-[9px] font-bold text-white">
                          +{members.length - 3}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}

              {reviewTasks.length === 0 && (
                <div className="p-8 text-center">
                  <CheckCircle2
                    size={32}
                    className="mx-auto text-emerald-400"
                  />
                  <p className="mt-3 font-semibold text-slate-700">
                    All caught up!
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    No tasks are waiting for your review.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right column: Team Workload & Deadlines */}
        <div className="space-y-6">
          {/* Team Workload */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Users size={19} />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Team Workload
                  </h2>
                  <p className="text-sm text-slate-500">
                    Task distribution per member
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1 p-4">
              {teamWorkload.slice(0, 6).map((member, index) => {
                const completionRate =
                  member.total > 0
                    ? Math.round((member.done / member.total) * 100)
                    : 0;
                return (
                  <div
                    key={member.id || member.user_id || index}
                    className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-slate-50"
                  >
                    <span
                      className={`flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-slate-700 ${
                        avatarColors[index % avatarColors.length]
                      }`}
                    >
                      {initials(member.full_name || member.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {member.full_name || member.name}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${completionRate}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-slate-500">
                          {member.done}/{member.total}
                        </span>
                      </div>
                    </div>
                    {member.inProgress > 0 && (
                      <span className="shrink-0 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-600">
                        {member.inProgress} active
                      </span>
                    )}
                  </div>
                );
              })}

              {teamWorkload.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-400">
                  No team workload data yet.
                </p>
              )}
            </div>

            <div className="border-t border-slate-100 p-4">
              <Link
                to="/team"
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Manage team <ArrowRight size={15} />
              </Link>
            </div>
          </section>

          {/* Upcoming Deadlines */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
                  <Clock size={19} />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Upcoming Deadlines
                  </h2>
                  <p className="text-sm text-slate-500">
                    Tasks due soon
                  </p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {upcomingDeadlines.map((task) => {
                const days = daysUntil(task.due_date);
                const isOverdue = days !== null && days < 0;
                const isSoon = days !== null && days >= 0 && days <= 3;
                const priority = task.priority || "medium";
                const priorityClass =
                  priorityStyles[priority] || priorityStyles.medium;

                return (
                  <Link
                    key={task.id || task._id}
                    to={
                      task.project_id
                        ? `/projects/${task.project_id}`
                        : "/tasks"
                    }
                    className="flex items-start gap-3 p-4 transition hover:bg-slate-50"
                  >
                    <Flag
                      size={16}
                      className={`mt-0.5 shrink-0 ${
                        isOverdue
                          ? "text-rose-500"
                          : isSoon
                          ? "text-amber-500"
                          : "text-slate-300"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {task.title || task.name}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`text-xs font-medium ${
                            isOverdue
                              ? "text-rose-600"
                              : isSoon
                              ? "text-amber-600"
                              : "text-slate-500"
                          }`}
                        >
                          {isOverdue
                            ? `${Math.abs(days)} day(s) overdue`
                            : days === 0
                            ? "Due today"
                            : `${days} day(s) left`}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDate(task.due_date)}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold capitalize ${priorityClass}`}
                    >
                      {priority}
                    </span>
                  </Link>
                );
              })}

              {upcomingDeadlines.length === 0 && (
                <div className="p-6 text-center">
                  <CalendarDays
                    size={28}
                    className="mx-auto text-slate-300"
                  />
                  <p className="mt-2 text-sm text-slate-500">
                    No upcoming deadlines.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Quick Actions */}
          <section className="rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 p-5 text-white shadow-md">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} />
              <h2 className="text-lg font-bold">Quick Actions</h2>
            </div>
            <div className="mt-4 space-y-2">
              <Link
                to="/projects"
                className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold backdrop-blur hover:bg-white/20"
              >
                Browse all projects
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/tasks"
                className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold backdrop-blur hover:bg-white/20"
              >
                View all tasks
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/team"
                className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold backdrop-blur hover:bg-white/20"
              >
                Manage team members
                <ArrowRight size={16} />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
