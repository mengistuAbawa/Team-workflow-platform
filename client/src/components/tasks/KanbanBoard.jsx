import { useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  CirclePlus,
  ClipboardList,
  LoaderCircle,
} from "lucide-react";
import TaskCard from "./TaskCard";

const COLUMNS = [
  {
    id: "todo",
    title: "To Do",
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-600",
  },
  {
    id: "in_progress",
    title: "In Progress",
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700",
  },
  {
    id: "in_review",
    title: "In Review",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700",
  },
  {
    id: "done",
    title: "Done",
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
  },
];

function normalizeStatus(status) {
  const normalized = String(status || "todo")
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");

  if (["inprogress", "progress"].includes(normalized)) {
    return "in_progress";
  }

  if (["review", "inreview"].includes(normalized)) {
    return "in_review";
  }

  if (["complete", "completed", "finished"].includes(normalized)) {
    return "done";
  }

  if (["todo", "in_progress", "in_review", "done"].includes(normalized)) {
    return normalized;
  }

  return "todo";
}

export default function KanbanBoard({
  tasks = [],
  onTaskClick,
  onTaskStatusChange,
  onCreateTask,
  updatingTaskId = null,
  loading = false,
  canApprove = true,
}) {
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [search, setSearch] = useState("");

  const safeTasks = Array.isArray(tasks) ? tasks : [];

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return safeTasks.filter((task) => {
      const matchesPriority =
        priorityFilter === "all" ||
        String(task.priority || "medium").toLowerCase() === priorityFilter;

      const searchableText = [
        task.title,
        task.description,
        task.assignee_name,
        task.project_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return matchesPriority && (!query || searchableText.includes(query));
    });
  }, [safeTasks, priorityFilter, search]);

  const groupedTasks = useMemo(() => {
    return COLUMNS.reduce((groups, column) => {
      groups[column.id] = filteredTasks.filter(
        (task) => normalizeStatus(task.status) === column.id,
      );

      return groups;
    }, {});
  }, [filteredTasks]);

  async function handleStatusChange(task, nextStatus) {
    if (!onTaskStatusChange || normalizeStatus(task.status) === nextStatus) {
      return;
    }

    await onTaskStatusChange(task, nextStatus);
  }

  return (
    <section className="space-y-5">
      {/* Board toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Task board</h2>
          <p className="mt-1 text-sm text-slate-500">
            {filteredTasks.length}{" "}
            {filteredTasks.length === 1 ? "task" : "tasks"} displayed
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative">
            <span className="sr-only">Filter tasks by priority</span>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm text-slate-700 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 sm:w-44"
            >
              <option value="all">All priorities</option>
              <option value="urgent">Urgent priority</option>
              <option value="high">High priority</option>
              <option value="medium">Medium priority</option>
              <option value="low">Low priority</option>
            </select>
            <ChevronDown
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </label>

          <label className="relative">
            <span className="sr-only">Search tasks</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tasks..."
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100 sm:w-52"
            />
          </label>

          {onCreateTask && (
            <button
              type="button"
              onClick={onCreateTask}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
            >
              <CirclePlus size={17} aria-hidden="true" />
              Add task
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div
          role="status"
          className="flex min-h-52 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm text-slate-500"
        >
          <LoaderCircle
            size={22}
            className="animate-spin text-violet-600"
            aria-hidden="true"
          />
          Loading tasks...
        </div>
      ) : (
        /* Four Kanban columns */
        <div className="grid min-w-0 grid-cols-1 items-start gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {COLUMNS.map((column) => {
            const columnTasks = groupedTasks[column.id] || [];

            return (
              <section
                key={column.id}
                aria-labelledby={`kanban-${column.id}`}
                className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
              >
                <header className="mb-4 flex items-center justify-between gap-2 px-1 pt-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`size-2.5 shrink-0 rounded-full ${column.dot}`}
                      aria-hidden="true"
                    />

                    <h3
                      id={`kanban-${column.id}`}
                      className="truncate text-sm font-bold text-slate-800"
                    >
                      {column.title}
                    </h3>

                    <span
                      className={`inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${column.badge}`}
                    >
                      {columnTasks.length}
                    </span>
                  </div>
                </header>

                <div className="space-y-3">
                  {columnTasks.map((task) => (
                    <div key={task.id} className="relative">
                      <TaskCard
                        task={task}
                        onClick={() => onTaskClick?.(task)}
                      />

                      {updatingTaskId === task.id && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/75">
                          <LoaderCircle
                            size={22}
                            className="animate-spin text-violet-600"
                            aria-label="Updating task status"
                          />
                        </div>
                      )}

                      <div className="mt-2 flex items-center justify-between gap-2 px-1">
                        <label
                          className="sr-only"
                          htmlFor={`status-${task.id}`}
                        >
                          Change status for {task.title}
                        </label>

                        <select
                          id={`status-${task.id}`}
                          value={normalizeStatus(task.status)}
                          disabled={
                            !onTaskStatusChange || updatingTaskId === task.id
                          }
                          onChange={(event) =>
                            handleStatusChange(task, event.target.value)
                          }
                          className="min-w-0 max-w-full cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {COLUMNS.filter(
                            (option) => canApprove || option.id !== "done",
                          ).map((option) => (
                            <option key={option.id} value={option.id}>
                              {!canApprove && option.id === "in_review"
                                ? "Submit for Review"
                                : `Move to ${option.title}`}
                            </option>
                          ))}
                        </select>

                        {column.id === "done" && (
                          <Check
                            size={16}
                            aria-label="Completed"
                            className="shrink-0 text-emerald-600"
                          />
                        )}
                      </div>
                    </div>
                  ))}

                  {columnTasks.length === 0 && (
                    <div className="flex min-h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/70 px-3 py-6 text-center">
                      <ClipboardList
                        size={22}
                        aria-hidden="true"
                        className="text-slate-300"
                      />

                      <p className="mt-2 text-xs font-medium text-slate-500">
                        No tasks in {column.title.toLowerCase()}
                      </p>
                    </div>
                  )}

                  {onCreateTask && (
                    <button
                      type="button"
                      onClick={onCreateTask}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 py-2.5 text-xs font-semibold text-slate-500 transition hover:border-violet-300 hover:bg-white hover:text-violet-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                    >
                      <CirclePlus size={15} aria-hidden="true" />
                      Add task
                    </button>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
