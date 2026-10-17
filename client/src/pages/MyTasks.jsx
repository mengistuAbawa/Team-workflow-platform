import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ListTodo, RefreshCw, Search, AlertCircle } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/common/Loader";
import KanbanBoard from "../components/tasks/KanbanBoard";

export default function MyTasks() {
  const { user } = useAuth();
  const canApprove = user?.role === "admin" || user?.role === "manager";
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState("list");
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/tasks", {
        params: { assigned_to_me: true },
      });
      const payload = response.data?.data;
      setTasks(Array.isArray(payload) ? payload : (payload?.tasks ?? []));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const taskStatus = String(task.status || "todo")
        .toLowerCase()
        .replaceAll("-", "_")
        .replaceAll(" ", "_");

      const matchesStatus = status === "all" || taskStatus === status;
      const matchesSearch = [
        task.title,
        task.description,
        task.project_name,
        task.assignee_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [tasks, search, status]);

  async function updateStatus(task, nextStatus) {
    const previousTasks = tasks;
    setUpdatingTaskId(task.id);
    setError("");

    // Optimistic update; revert if the API request fails.
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, status: nextStatus } : item,
      ),
    );

    try {
      await api.patch(`/tasks/${task.id}/status`, { status: nextStatus });
    } catch (err) {
      setTasks(previousTasks);
      setError(
        err.response?.data?.message ||
          "Could not update task status. Check that your backend supports this endpoint.",
      );
    } finally {
      setUpdatingTaskId(null);
    }
  }

  const counts = {
    all: tasks.length,
    todo: tasks.filter((t) =>
      ["todo", "to_do"].includes(String(t.status).toLowerCase()),
    ).length,
    in_progress: tasks.filter(
      (t) =>
        String(t.status).toLowerCase().replaceAll(" ", "_") === "in_progress",
    ).length,
    done: tasks.filter((t) => String(t.status).toLowerCase() === "done").length,
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-600">Stay organized</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">My Tasks</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage work and track your progress.
          </p>
        </div>
        <button
          onClick={loadTasks}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={16} /> Refresh
        </button>
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

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "All tasks", value: counts.all },
          { label: "In progress", value: counts.in_progress },
          { label: "Completed", value: counts.done },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative w-full lg:max-w-sm">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <span className="sr-only">Search tasks</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <label className="sr-only" htmlFor="task-status-filter">
              Filter by status
            </label>
            <select
              id="task-status-filter"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-500"
            >
              <option value="all">All statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
            </select>

            <div className="flex rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => setView("list")}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${view === "list" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}
              >
                List
              </button>
              <button
                onClick={() => setView("board")}
                className={`rounded-lg px-3 py-2 text-xs font-semibold ${view === "board" ? "bg-white text-violet-700 shadow-sm" : "text-slate-500"}`}
              >
                Board
              </button>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <Loader label="Loading your tasks..." />
      ) : view === "board" ? (
        <KanbanBoard
          tasks={filteredTasks}
          onTaskStatusChange={updateStatus}
          updatingTaskId={updatingTaskId}
          loading={false}
          canApprove={canApprove}
        />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold text-slate-900">Task list</h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredTasks.length} matching tasks
            </p>
          </div>

          {filteredTasks.length ? (
            <div className="divide-y divide-slate-100">
              {filteredTasks.map((task) => (
                <article
                  key={task.id}
                  className="flex flex-col gap-3 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      to={
                        task.project_id
                          ? `/projects/${task.project_id}`
                          : "/tasks"
                      }
                      className="font-semibold text-slate-800 hover:text-violet-700"
                    >
                      {task.title}
                    </Link>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                      {task.description ||
                        task.project_name ||
                        "No description provided."}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      {task.project_name && <span>{task.project_name}</span>}
                      {task.due_date && (
                        <span>Due {String(task.due_date).slice(0, 10)}</span>
                      )}
                      {task.priority && (
                        <span className="rounded-full bg-slate-100 px-2 py-1">
                          {task.priority}
                        </span>
                      )}
                    </div>
                  </div>
                  <label className="shrink-0">
                    <span className="sr-only">Status for {task.title}</span>
                    <select
                      value={String(task.status || "todo")
                        .toLowerCase()
                        .replaceAll(" ", "_")}
                      onChange={(e) => updateStatus(task, e.target.value)}
                      disabled={updatingTaskId === task.id}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-500 disabled:opacity-60 sm:w-40"
                    >
                      <option value="todo">To Do</option>
                      <option value="in_progress">In Progress</option>
                      <option value="in_review">
                        {canApprove ? "In Review" : "Submit for Review"}
                      </option>
                      {canApprove && <option value="done">Done</option>}
                    </select>
                  </label>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-14 text-center">
              <ListTodo size={28} className="mx-auto text-slate-300" />
              <p className="mt-3 font-semibold text-slate-800">
                No tasks found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try another search or status filter.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
