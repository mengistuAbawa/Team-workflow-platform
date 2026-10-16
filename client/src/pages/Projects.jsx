import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FolderKanban,
  Plus,
  Search,
  CalendarDays,
  CheckCircle2,
  Clock,
  ListTodo,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Filter,
} from "lucide-react";
import projectService from "../services/projectService";
import Loader from "../components/common/Loader";

const statusBadges = {
  planning: "bg-blue-50 text-blue-700 border-blue-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-violet-50 text-violet-700 border-violet-200",
  archived: "bg-slate-100 text-slate-600 border-slate-200",
};

function formatDate(value) {
  if (!value) return "No due date";
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  const date = match ? new Date(`${match[1]}T12:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return "No due date";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await projectService.getAll();
      const payload = response.data?.projects ?? response.data ?? [];
      setProjects(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load projects. Please check your connection."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    return projects.filter((project) => {
      const matchesStatus =
        statusFilter === "all" || project.status === statusFilter;

      const matchesSearch =
        !query ||
        `${project.name || ""} ${project.description || ""} ${
          project.owner_name || ""
        }`
          .toLowerCase()
          .includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [projects, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: projects.length,
      active: projects.filter((p) => p.status === "active").length,
      planning: projects.filter((p) => p.status === "planning").length,
      completed: projects.filter((p) => p.status === "completed").length,
    };
  }, [projects]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-600">Workspaces</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            Organize team workflows, manage tasks, and track deliverables.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadProjects}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <Link
            to="/projects/new"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
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
          <button
            type="button"
            onClick={loadProjects}
            className="ml-auto font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <FolderKanban size={22} />
            </span>
            <div>
              <p className="text-sm text-slate-500">Total projects</p>
              <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <Clock size={22} />
            </span>
            <div>
              <p className="text-sm text-slate-500">Active</p>
              <p className="text-2xl font-bold text-slate-900">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ListTodo size={22} />
            </span>
            <div>
              <p className="text-sm text-slate-500">In planning</p>
              <p className="text-2xl font-bold text-slate-900">{stats.planning}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <CheckCircle2 size={22} />
            </span>
            <div>
              <p className="text-sm text-slate-500">Completed</p>
              <p className="text-2xl font-bold text-slate-900">
                {stats.completed}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
            className="h-10 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter size={16} className="text-slate-400" />
          {["all", "planning", "active", "completed", "archived"].map(
            (status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  statusFilter === status
                    ? "bg-violet-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {status}
              </button>
            )
          )}
        </div>
      </section>

      {/* Projects Grid */}
      {loading ? (
        <Loader label="Loading projects..." />
      ) : filteredProjects.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const taskCount = Number(project.task_count || 0);
            const completedCount = Number(project.completed_task_count || 0);
            const progress = taskCount
              ? Math.round((completedCount / taskCount) * 100)
              : project.status === "completed"
              ? 100
              : 0;

            const badgeStyle =
              statusBadges[project.status] || statusBadges.planning;

            return (
              <article
                key={project.id}
                className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className="size-3.5 shrink-0 rounded-md"
                      style={{ backgroundColor: project.color || "#7C3AED" }}
                    />
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${badgeStyle}`}
                    >
                      {String(project.status || "planning").replace("_", " ")}
                    </span>
                  </div>

                  <h2 className="mt-3 text-lg font-bold text-slate-900 group-hover:text-violet-700">
                    <Link to={`/projects/${project.id}`}>
                      {project.name || "Untitled Project"}
                    </Link>
                  </h2>

                  <p className="mt-2 line-clamp-3 min-h-[42px] text-sm leading-5 text-slate-500">
                    {project.description ||
                      "No project description provided."}
                  </p>
                </div>

                <div className="mt-6 space-y-4 border-t border-slate-100 pt-4">
                  {/* Progress bar */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-600">
                      <span>Progress</span>
                      <span className="font-bold text-slate-800">
                        {progress}%
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-violet-600 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Task counts & due date */}
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <ListTodo size={14} />
                      {taskCount} {taskCount === 1 ? "task" : "tasks"}
                    </span>

                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={14} />
                      {formatDate(project.due_date)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <Link
                      to={`/projects/${project.id}/tasks`}
                      className="text-xs font-semibold text-slate-600 hover:text-violet-700"
                    >
                      Task Manager
                    </Link>

                    <Link
                      to={`/projects/${project.id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 group-hover:text-violet-700"
                    >
                      Open board
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FolderKanban size={36} className="mx-auto text-slate-300" />
          <h2 className="mt-4 text-base font-bold text-slate-800">
            {search || statusFilter !== "all"
              ? "No matching projects"
              : "No projects yet"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {search || statusFilter !== "all"
              ? "Try clearing your filters or changing your search terms."
              : "Create your first project to start organizing team tasks and collaborating."}
          </p>
          <Link
            to="/projects/new"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
          >
            <Plus size={16} />
            Create project
          </Link>
        </div>
      )}
    </div>
  );
}