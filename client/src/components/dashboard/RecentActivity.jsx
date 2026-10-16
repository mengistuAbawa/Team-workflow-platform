
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  FileText,
  FolderKanban,
  MessageCircle,
  Pencil,
  UserPlus,
} from "lucide-react";

const activityTypes = [
  {
    keywords: ["create", "created", "project"],
    icon: FolderKanban,
    color: "bg-violet-50 text-violet-600",
  },
  {
    keywords: ["complete", "completed", "done"],
    icon: CheckCircle2,
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    keywords: ["comment", "commented", "reply"],
    icon: MessageCircle,
    color: "bg-sky-50 text-sky-600",
  },
  {
    keywords: ["member", "joined", "invite", "assigned"],
    icon: UserPlus,
    color: "bg-orange-50 text-orange-600",
  },
  {
    keywords: ["update", "updated", "edit", "edited"],
    icon: Pencil,
    color: "bg-amber-50 text-amber-600",
  },
  {
    keywords: ["task", "document"],
    icon: FileText,
    color: "bg-indigo-50 text-indigo-600",
  },
];

function getActivityStyle(item) {
  const action = String(item.action || "").toLowerCase();
  const details =
    typeof item.details === "string"
      ? item.details.toLowerCase()
      : "";

  const text = `${action} ${details}`;

  return (
    activityTypes.find((type) =>
      type.keywords.some((keyword) => text.includes(keyword))
    ) || {
      icon: Activity,
      color: "bg-slate-100 text-slate-600",
    }
  );
}


function formatTime(date) {
  if (!date) return "Recently";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Recently";
  }

  const difference = Date.now() - parsedDate.getTime();

  if (difference < 0) {
    return parsedDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return parsedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      parsedDate.getFullYear() !== new Date().getFullYear()
        ? "numeric"
        : undefined,
  });
}

function getDescription(item) {
  const details = item.details;

  if (typeof details === "string" && details.trim()) {
    return details;
  }

  if (details && typeof details === "object") {
    if (typeof details.description === "string") {
      return details.description;
    }

    if (typeof details.message === "string") {
      return details.message;
    }

    if (typeof details.title === "string") {
      return details.title;
    }
  }

  if (item.action) {
    return String(item.action)
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  return "Workspace activity";
}

function ActivityItem({ item, index }) {
  const { icon: Icon, color } = getActivityStyle(item);

  const userName =
    item.user_name ||
    item.full_name ||
    item.actor_name ||
    "A team member";

  const description = getDescription(item);
  const projectName = item.project_name;
  const timestamp =
    item.created_at || item.timestamp || item.date;

  return (
    <li className="relative flex gap-3 pb-6 last:pb-0">
      {index !== undefined && (
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-[19px] top-10 w-px bg-slate-100 last:hidden"
        />
      )}

      <div
        className={`relative z-10 flex size-10 shrink-0 items-center justify-center rounded-xl ${color}`}
      >
        <Icon size={18} aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-sm leading-5 text-slate-700">
            <span className="font-semibold text-slate-900">
              {userName}
            </span>{" "}
            <span>{description}</span>
          </p>

          <time
            dateTime={timestamp || undefined}
            className="shrink-0 text-xs text-slate-400"
          >
            {formatTime(timestamp)}
          </time>
        </div>

        {projectName && (
          <p className="mt-1 truncate text-xs text-slate-500">
            In project:{" "}
            <span className="font-medium text-violet-600">
              {projectName}
            </span>
          </p>
        )}

        {item.task_title && (
          <p className="mt-1 truncate text-xs text-slate-500">
            Task: {item.task_title}
          </p>
        )}
      </div>
    </li>
  );
}

export default function RecentActivity({ items = [] }) {
  const activities = Array.isArray(items) ? items.slice(0, 6) : [];

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900">
            Recent activity
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            The latest updates from your team.
          </p>
        </div>

        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <Activity size={20} aria-hidden="true" />
        </div>
      </div>

      {activities.length > 0 ? (
        <>
          <ol className="space-y-0">
            {activities.map((item, index) => (
              <ActivityItem
                key={item.id ?? `${item.action ?? "activity"}-${index}`}
                item={item}
                index={index}
              />
            ))}
          </ol>

          <div className="mt-5 border-t border-slate-100 pt-4">
            <Link
              to="/notifications"
              className="inline-flex items-center gap-2 text-sm font-semibold text-violet-600 transition hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            >
              View notifications
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-5 py-10 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Activity size={22} aria-hidden="true" />
          </div>

          <h3 className="mt-4 font-semibold text-slate-900">
            No recent activity
          </h3>

          <p className="mt-1 max-w-xs text-sm leading-6 text-slate-500">
            Project updates, task changes, and team activity will appear
            here as your workspace gets busy.
          </p>
        </div>
      )}
    </section>
  );
}
