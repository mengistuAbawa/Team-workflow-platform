
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  ClipboardList,
  UserRound,
  CalendarDays,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("teamflow_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const initialForm = {
  title: "",
  description: "",
  assignee_id: "",
  priority: "medium",
  due_date: "",
};

const statusLabels = {
  todo: "To do",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
};

const priorityStyles = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function getErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.message ||
    "Something went wrong. Please try again."
  );
}

export default function ProjectTasks({ project: projectProp }) {
  const { projectId } = useParams();
  const project = projectProp;
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [assignments, setAssignments] = useState({});
  const [assigningId, setAssigningId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [taskResponse, teamResponse] = await Promise.all([
        api.get("/tasks"),
        api.get("/team"),
      ]);

      const taskPayload = taskResponse.data?.data;
      const allTasks = Array.isArray(taskPayload)
        ? taskPayload
        : taskPayload?.tasks || [];

      const teamPayload = teamResponse.data?.data;
      const teamMembers = Array.isArray(teamPayload)
        ? teamPayload
        : teamPayload?.members || [];

      setTasks(
        allTasks.filter(
          (task) => Number(task.project_id) === Number(projectId)
        )
      );

      setMembers(teamMembers);

      setAssignments((previous) => {
        const next = { ...previous };

        for (const task of allTasks) {
          if (Number(task.project_id) === Number(projectId)) {
            next[task.id] = String(task.assignee_id || "");
          }
        }

        return next;
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleCreateTask(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Enter a task title.");
      return;
    }

    if (!form.assignee_id) {
      setError("Choose a team member to assign this task.");
      return;
    }

    setSaving(true);

    try {
      await api.post("/tasks", {
        project_id: Number(projectId),
        title: form.title.trim(),
        description: form.description.trim(),
        assignee_id: Number(form.assignee_id),
        priority: form.priority,
        due_date: form.due_date || null,
      });

      setForm(initialForm);
      setShowForm(false);
      setSuccess("Task created and assigned successfully.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleReassign(taskId) {
    const assigneeId = assignments[taskId];

    if (!assigneeId) {
      setError("Choose a team member before reassigning.");
      return;
    }

    setError("");
    setSuccess("");
    setAssigningId(taskId);

    try {
      await api.patch(`/tasks/${taskId}/assign`, {
        assignee_id: Number(assigneeId),
      });

      setSuccess("Task reassigned successfully.");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setAssigningId(null);
    }
  }

  const completedCount = tasks.filter(
    (task) => task.status === "done"
  ).length;

  const inProgressCount = tasks.filter(
    (task) => task.status === "in_progress"
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600"
        >
          <ArrowLeft size={17} />
          Back to projects
        </Link>

        <section className="flex flex-col justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-blue-600">
              <ClipboardList size={18} />
              Project task management
            </div>

            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              {project?.title || project?.name || "Project tasks"}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Create tasks, assign owners, and track progress.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowForm((current) => !current);
              setError("");
              setSuccess("");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={19} />
            Add Task
          </button>
        </section>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total tasks" value={tasks.length} />
          <StatCard label="In progress" value={inProgressCount} />
          <StatCard label="Completed" value={completedCount} />
        </section>

        {showForm && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-bold text-slate-900">
              Create task for this project
            </h2>

            <form onSubmit={handleCreateTask} className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Task title">
                  <input
                    name="title"
                    value={form.title}
                    onChange={updateForm}
                    placeholder="e.g. Build the login page"
                    maxLength={200}
                    required
                    className="form-input"
                  />
                </Field>

                <Field label="Assign to team member">
                  <select
                    name="assignee_id"
                    value={form.assignee_id}
                    onChange={updateForm}
                    required
                    className="form-input"
                  >
                    <option value="">Select a team member</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.full_name || member.name || member.email}
                        {" — "}
                        {member.role}
                      </option>
                    ))}
                  </select>
                  {members.length === 0 && (
                    <p className="mt-2 text-xs text-amber-700">
                      No team members were returned. Check your team API.
                    </p>
                  )}
                </Field>

                <Field label="Priority">
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={updateForm}
                    className="form-input"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </Field>

                <Field label="Due date">
                  <input
                    type="date"
                    name="due_date"
                    value={form.due_date}
                    onChange={updateForm}
                    className="form-input"
                  />
                </Field>
              </div>

              <Field label="Task description">
                <textarea
                  name="description"
                  value={form.description}
                  onChange={updateForm}
                  placeholder="Describe the work, requirements, and expected result..."
                  rows={4}
                  className="form-input resize-y"
                />
              </Field>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving || members.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <LoaderCircle className="animate-spin" size={18} />
                  ) : (
                    <Plus size={18} />
                  )}
                  {saving ? "Creating..." : "Create and assign task"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-slate-300 px-5 py-3 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 p-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Tasks for this project
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Each task is connected to project {projectId}.
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              title="Refresh tasks"
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
            >
              <RefreshCw
                size={18}
                className={loading ? "animate-spin" : ""}
              />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 p-12 text-slate-500">
              <LoaderCircle className="animate-spin" />
              Loading tasks...
            </div>
          ) : tasks.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList
                className="mx-auto mb-4 text-slate-300"
                size={44}
              />
              <h3 className="font-semibold text-slate-800">
                No tasks created yet
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Add your first task and assign it to a team member.
              </p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-5 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700"
              >
                + Add your first task
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <article key={task.id} className="p-5">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {task.title}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            priorityStyles[task.priority] ||
                            priorityStyles.medium
                          }`}
                        >
                          {task.priority || "medium"}
                        </span>
                      </div>

                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                        {task.description || "No description provided."}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <UserRound size={15} />
                          {task.assignee_name || "Assigned member"}
                        </span>

                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays size={15} />
                          {task.due_date
                            ? String(task.due_date).slice(0, 10)
                            : "No due date"}
                        </span>
                      </div>

                      <p className="mt-3 text-xs font-medium text-slate-500">
                        Status: {statusLabels[task.status] || task.status}
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row lg:w-80">
                      <select
                        aria-label={`Reassign ${task.title}`}
                        value={assignments[task.id] || ""}
                        onChange={(event) =>
                          setAssignments((current) => ({
                            ...current,
                            [task.id]: event.target.value,
                          }))
                        }
                        className="form-input min-w-0 flex-1"
                      >
                        <option value="">Choose assignee</option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.full_name || member.name || member.email}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        disabled={
                          assigningId === task.id ||
                          !assignments[task.id] ||
                          String(assignments[task.id]) ===
                            String(task.assignee_id)
                        }
                        onClick={() => handleReassign(task.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {assigningId === task.id ? (
                          <LoaderCircle className="animate-spin" size={16} />
                        ) : (
                          <UserRound size={16} />
                        )}
                        Assign
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <style>{`
        .form-input {
          display: block;
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 0.75rem;
          background: white;
          padding: 0.7rem 0.85rem;
          color: #0f172a;
          outline: none;
        }
        .form-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgb(37 99 235 / 12%);
        }
      `}</style>
    </main>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
