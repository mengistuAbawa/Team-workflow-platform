
import {
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock3,
  Flag,
  MessageCircle,
  MoreHorizontal,
  UserRound,
} from "lucide-react";

const priorityStyles = {
  low: {
    label: "Low",
    className: "bg-slate-100 text-slate-600",
    iconClass: "text-slate-500",
  },
  medium: {
    label: "Medium",
    className: "bg-blue-50 text-blue-700",
    iconClass: "text-blue-600",
  },
  high: {
    label: "High",
    className: "bg-orange-50 text-orange-700",
    iconClass: "text-orange-600",
  },
  urgent: {
    label: "Urgent",
    className: "bg-rose-50 text-rose-700",
    iconClass: "text-rose-600",
  },
};

function formatDate(date) {
  if (!date) return null;

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function isOverdue(date, status) {
  if (!date || status === "done") return false;

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return false;

  const deadline = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate()
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return deadline < today;
}

function getInitials(name) {
  if (!name) return "";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function TaskCard({
  task = {},
  onClick,
  onMenuClick,
  showProject = false,
}) {
  const priorityKey = String(task.priority || "medium").toLowerCase();
  const priority =
    priorityStyles[priorityKey] || priorityStyles.medium;

  const status = String(task.status || "todo")
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");

  const dueDate = formatDate(task.due_date);
  const overdue = isOverdue(task.due_date, status);

  const assigneeName =
    task.assignee_name ||
    task.assignee_full_name ||
    task.assignee?.full_name ||
    task.assignee?.name ||
    "";

  const assigneeAvatar =
    task.assignee_avatar || task.assignee?.avatar || "";

  const commentCount = Number(task.comment_count ?? 0);

  return (
    <article
      className={[
        "group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200",
        "hover:border-violet-200 hover:shadow-md hover:shadow-slate-200/50",
        onClick ? "cursor-pointer" : "",
      ].join(" ")}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ${priority.className}`}
        >
          <Flag
            size={12}
            aria-hidden="true"
            className={priority.iconClass}
          />
          {priority.label}
        </span>

        <button
          type="button"
          aria-label={`More options for ${task.title || "task"}`}
          onClick={(event) => {
            event.stopPropagation();
            onMenuClick?.(task);
          }}
          className="flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-70 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        >
          <MoreHorizontal size={18} aria-hidden="true" />
        </button>
      </div>

      <div
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={(event) => {
          if (!onClick) return;

          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        }}
        className={
          onClick
            ? "rounded-md outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            : ""
        }
      >
        <h3 className="line-clamp-2 text-sm font-semibold leading-5 text-slate-800 transition group-hover:text-violet-700">
          {task.title || "Untitled task"}
        </h3>

        {task.description && (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
            {task.description}
          </p>
        )}
      </div>

      {showProject && task.project_name && (
        <p className="mt-3 truncate text-xs font-medium text-violet-600">
          {task.project_name}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 pt-3">
        {dueDate && (
          <span
            className={[
              "inline-flex items-center gap-1.5 text-xs",
              overdue
                ? "font-semibold text-rose-600"
                : "text-slate-500",
            ].join(" ")}
            title={
              overdue
                ? "This task is overdue"
                : `Due ${dueDate}`
            }
          >
            <CalendarDays size={14} aria-hidden="true" />
            {overdue ? "Overdue" : dueDate}
          </span>
        )}

        {commentCount > 0 && (
          <span
            className="inline-flex items-center gap-1 text-xs text-slate-500"
            aria-label={`${commentCount} comments`}
          >
            <MessageCircle size={13} aria-hidden="true" />
            {commentCount}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {assigneeName ? (
            <>
              {assigneeAvatar ? (
                <img
                  src={assigneeAvatar}
                  alt=""
                  className="size-7 shrink-0 rounded-full object-cover ring-2 ring-white"
                />
              ) : (
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 ring-2 ring-white"
                  aria-hidden="true"
                >
                  {getInitials(assigneeName)}
                </span>
              )}

              <span className="truncate text-xs font-medium text-slate-600">
                {assigneeName}
              </span>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <UserRound size={14} aria-hidden="true" />
              Unassigned
            </span>
          )}
        </div>

        {status === "done" ? (
          <CheckCircle2
            size={17}
            aria-label="Completed"
            className="shrink-0 text-emerald-500"
          />
        ) : status === "in_progress" ? (
          <Clock3
            size={16}
            aria-label="In progress"
            className="shrink-0 text-blue-500"
          />
        ) : (
          <Circle
            size={16}
            aria-hidden="true"
            className="shrink-0 text-slate-300"
          />
        )}
      </div>

      {task.id != null && (
        <p className="mt-3 text-[10px] font-medium tracking-wide text-slate-400">
          TASK-{task.id}
        </p>
      )}
    </article>
  );
}
