
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarDays,
  FolderKanban,
  MoreHorizontal,
} from "lucide-react";

const statusStyles = {
  planning: "bg-amber-50 text-amber-700 ring-amber-600/20",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  completed: "bg-blue-50 text-blue-700 ring-blue-600/20",
  archived: "bg-slate-100 text-slate-600 ring-slate-500/20",
};

const projectColors = [
  "bg-violet-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-orange-500",
  "bg-pink-500",
];

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

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "No deadline";
  }

  return parsedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusLabel(status) {
  if (!status) return "Planning";

  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ProjectCard({ project, index }) {
  const progress = getProgress(project);
  const status = project.status || "planning";
  const statusClass =
    statusStyles[status] || statusStyles.planning;

  return (
    <article className="group rounded-2xl border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg hover:shadow-slate-200/50">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-xl text-white ${
              projectColors[index % projectColors.length]
            }`}
          >
            <FolderKanban size={21} aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <h3 className="truncate font-semibold text-slate-900">
              {project.name}
            </h3>

            <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
              {project.description || "No description provided."}
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label={`More options for ${project.name}`}
          title="More options"
          onClick={() => {
            // Connect to your project actions menu when available.
          }}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-70 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        >
          <MoreHorizontal size={19} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClass}`}
        >
          {getStatusLabel(status)}
        </span>

        <span className="text-xs font-semibold tabular-nums text-slate-600">
          {progress}% complete
        </span>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={`${project.name} completion`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div
          className="h-full rounded-full bg-violet-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CalendarDays size={15} aria-hidden="true" />
          <span>Due {formatDate(project.due_date)}</span>
        </div>

        <Link
          to={`/projects/${project.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 transition hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
        >
          View project
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export default function ProjectOverview({ projects = [] }) {
  const visibleProjects = Array.isArray(projects)
    ? projects.slice(0, 4)
    : [];

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Project overview
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Track progress across your workspace.
          </p>
        </div>

        <Link
          to="/projects"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-semibold text-violet-600 transition hover:bg-violet-50 hover:text-violet-800"
        >
          View all
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      {visibleProjects.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleProjects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-5 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <FolderKanban size={23} aria-hidden="true" />
          </div>

          <h3 className="mt-4 font-semibold text-slate-900">
            No projects yet
          </h3>

          <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
            Create your first project to organize tasks and collaborate
            with your team.
          </p>

          <Link
            to="/projects"
            className="mt-4 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
          >
            Create project
          </Link>
        </div>
      )}
    </section>
  );
}

