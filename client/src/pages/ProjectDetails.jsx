import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  FolderKanban,
  RefreshCw,
  MessageCircle,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  ListTodo,
  Users,
  Plus,
  Send,
  Trash2,
  Flag,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/common/Modal";
import api from "../services/api";
import Loader from "../components/common/Loader";
import KanbanBoard from "../components/tasks/KanbanBoard";

function formatDate(value) {
  if (!value) return "Not set";
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  const date = match ? new Date(`${match[1]}T12:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  // Task creation modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assignee_id: "",
    priority: "medium",
    due_date: "",
  });

  // Task details / comments modal
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskComments, setTaskComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingTaskId, setUpdatingTaskId] = useState(null);

  const loadProject = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [projectResponse, tasksResponse, membersResponse] =
        await Promise.all([
          api.get(`/projects/${id}`),
          api.get(`/projects/${id}/tasks`),
          api.get(`/projects/${id}/members`),
        ]);

      const projectPayload = projectResponse.data?.data;
      const taskPayload = tasksResponse.data?.data;

      setProject(projectPayload?.project ?? projectPayload);
      const memberPayload = membersResponse.data?.data;
      setMembers(
        Array.isArray(memberPayload)
          ? memberPayload
          : memberPayload?.members ?? []
      );
      setTasks(
        Array.isArray(taskPayload)
          ? taskPayload
          : taskPayload?.tasks ?? projectPayload?.tasks ?? []
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not load this project. Check your connection."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  async function addCollaborator(event) {
    event.preventDefault();
    if (!selectedMember) return;
    setAddingMember(true);
    try {
      await api.post(`/projects/${id}/members`, {
        user_id: Number(selectedMember),
      });
      setSelectedMember("");
      await loadProject();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not add this teammate to the project."
      );
    } finally {
      setAddingMember(false);
    }
  }

  async function loadTeamMembers() {
    if (teamMembers.length) return;
    try {
      const response = await api.get("/team");
      const payload = response.data?.data;
      setTeamMembers(
        Array.isArray(payload) ? payload : payload?.members ?? []
      );
    } catch (err) {
      setError(err.response?.data?.message || "Could not load team members.");
    }
  }

  async function openProjectChat() {
    try {
      const response = await api.post("/conversations", {
        conversation_type: "project",
        project_id: Number(id),
      });
      const conversationId = response.data?.data?.conversation_id;
      if (conversationId) navigate(`/messages?conversation=${conversationId}`);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not open the project conversation."
      );
    }
  }

  async function createTask(event) {
    event.preventDefault();
    setCreatingTask(true);
    setError("");
    try {
      const response = await api.post("/tasks", {
        project_id: Number(id),
        ...taskForm,
        assignee_id: taskForm.assignee_id ? Number(taskForm.assignee_id) : null,
        due_date: taskForm.due_date || null,
      });

      const task = response.data?.data?.task || response.data?.data;
      if (task) setTasks((current) => [task, ...current]);

      setTaskForm({
        title: "",
        description: "",
        assignee_id: "",
        priority: "medium",
        due_date: "",
      });
      setTaskModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create this task.");
    } finally {
      setCreatingTask(false);
    }
  }

  async function updateTaskStatus(task, nextStatus) {
    const previousTasks = tasks;
    setUpdatingTaskId(task.id);
    setTasks((current) =>
      current.map((item) =>
        item.id === task.id ? { ...item, status: nextStatus } : item
      )
    );

    try {
      await api.patch(`/tasks/${task.id}/status`, { status: nextStatus });
      if (selectedTask && selectedTask.id === task.id) {
        setSelectedTask((prev) => ({ ...prev, status: nextStatus }));
      }
    } catch (err) {
      setTasks(previousTasks);
      setError(err.response?.data?.message || "Could not update task status.");
    } finally {
      setUpdatingTaskId(null);
    }
  }

  async function openTaskDetails(task) {
    setSelectedTask(task);
    setCommentDraft("");
    setLoadingComments(true);
    try {
      const res = await api.get(`/tasks/${task.id}/comments`);
      const payload = res.data?.data?.comments ?? res.data?.data ?? [];
      setTaskComments(Array.isArray(payload) ? payload : []);
    } catch {
      setTaskComments([]);
    } finally {
      setLoadingComments(false);
    }
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!commentDraft.trim() || !selectedTask || postingComment) return;
    setPostingComment(true);
    try {
      const res = await api.post(`/tasks/${selectedTask.id}/comments`, {
        content: commentDraft.trim(),
      });
      const newComment = res.data?.data?.comment || res.data?.data;
      if (newComment) {
        setTaskComments((prev) => [...prev, newComment]);
        setTasks((prev) =>
          prev.map((t) =>
            t.id === selectedTask.id
              ? { ...t, comment_count: (Number(t.comment_count) || 0) + 1 }
              : t
          )
        );
      }
      setCommentDraft("");
    } catch (err) {
      setError(err.response?.data?.message || "Could not post comment.");
    } finally {
      setPostingComment(false);
    }
  }

  async function handleDeleteComment(commentId) {
    if (!selectedTask) return;
    try {
      await api.delete(`/tasks/${selectedTask.id}/comments/${commentId}`);
      setTaskComments((prev) => prev.filter((c) => c.id !== commentId));
      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTask.id
            ? {
                ...t,
                comment_count: Math.max(0, (Number(t.comment_count) || 1) - 1),
              }
            : t
        )
      );
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete comment.");
    }
  }

  async function handleDeleteTask(taskId) {
    if (!window.confirm("Are you sure you want to delete this task?")) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSelectedTask(null);
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete task.");
    }
  }

  if (loading) return <Loader label="Loading project details..." />;

  if (error && !project) {
    return (
      <div className="space-y-4 rounded-2xl border border-rose-100 bg-white p-6">
        <div role="alert" className="flex items-center gap-2 text-sm text-rose-700">
          <AlertCircle size={18} /> {error}
        </div>
        <button
          onClick={loadProject}
          className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Try again
        </button>
        <Link
          to="/projects"
          className="ml-3 text-sm font-semibold text-slate-600 hover:text-violet-700"
        >
          Back to projects
        </Link>
      </div>
    );
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task) => task.status === "done").length;
  const progress = totalTasks
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0;
  const currentMembership = members.find(
    (member) => Number(member.id) === Number(user?.id)
  );
  const canManageTasks =
    user?.role === "admin" ||
    user?.role === "manager" ||
    Number(project?.owner_id) === Number(user?.id) ||
    currentMembership?.project_role === "manager";

  return (
    <div className="space-y-6">
      <Link
        to="/projects"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-violet-700"
      >
        <ArrowLeft size={17} /> Back to projects
      </Link>

      {error && (
        <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* Project Workspace Banner */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
              style={{ backgroundColor: project?.color || "#7C3AED" }}
            >
              <FolderKanban size={28} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-violet-600">
                Project workspace
              </p>
              <h1 className="mt-1 break-words text-2xl font-bold text-slate-900">
                {project?.name || "Project details"}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                {project?.description || "No project description has been added."}
              </p>
              <span className="mt-3 inline-flex rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold capitalize text-emerald-700">
                {String(project?.status || "planning").replaceAll("_", " ")}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={openProjectChat}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
            >
              <MessageCircle size={16} /> Project chat
            </button>
            <button
              onClick={loadProject}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>

        {/* Collaborators row */}
        <div className="mt-6 border-t border-slate-100 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900">Project collaborators</h2>
              <p className="mt-1 text-sm text-slate-500">
                {members.map((m) => m.full_name).join(", ") ||
                  "No collaborators yet"}
              </p>
            </div>
            <form onSubmit={addCollaborator} className="flex flex-wrap gap-2">
              <select
                value={selectedMember}
                onFocus={loadTeamMembers}
                onChange={(event) => setSelectedMember(event.target.value)}
                className="h-10 min-w-48 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-500"
              >
                <option value="">Choose a teammate</option>
                {teamMembers
                  .filter(
                    (member) =>
                      !members.some(
                        (current) => Number(current.id) === Number(member.id)
                      )
                  )
                  .map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name} &middot; {member.email}
                    </option>
                  ))}
              </select>
              <button
                disabled={!selectedMember || addingMember}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <UserPlus size={15} />{" "}
                {addingMember ? "Adding..." : "Add teammate"}
              </button>
            </form>
          </div>
        </div>

        {/* Stats grid */}
        <div className="mt-7 grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <ListTodo size={17} /> Total tasks
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{totalTasks}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CheckCircle2 size={17} /> Completed
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {completedTasks}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Users size={17} /> Members
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {members.length}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CalendarDays size={17} /> Due date
            </div>
            <p className="mt-2 text-base font-bold text-slate-900">
              {formatDate(project?.due_date)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-600">Project progress</span>
            <span className="font-bold text-violet-700">{progress}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-violet-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </section>

      {/* Kanban Board Section */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Project tasks</h2>
            <p className="mt-1 text-sm text-slate-500">
              Track work from planning to completion.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setTaskModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
          >
            <Plus size={18} /> Add task
          </button>
        </div>

        <KanbanBoard
          tasks={tasks}
          onTaskStatusChange={updateTaskStatus}
          onTaskClick={openTaskDetails}
          onCreateTask={() => setTaskModalOpen(true)}
          updatingTaskId={updatingTaskId}
        />
      </section>

      {/* Task Creation Modal */}
      <Modal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title="Create task for this project"
        description="Add a deliverable and assign it to a teammate."
      >
        <form onSubmit={createTask} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Task title *
            </label>
            <input
              required
              maxLength={200}
              value={taskForm.title}
              onChange={(e) =>
                setTaskForm({ ...taskForm, title: e.target.value })
              }
              placeholder="e.g. Design user interface layout"
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Description
            </label>
            <textarea
              rows={3}
              value={taskForm.description}
              onChange={(e) =>
                setTaskForm({ ...taskForm, description: e.target.value })
              }
              placeholder="Details, requirements, and instructions..."
              className="w-full resize-y rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Assignee
              </label>
              <select
                value={taskForm.assignee_id}
                onFocus={loadTeamMembers}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, assignee_id: e.target.value })
                }
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-500"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.role})
                  </option>
                ))}
                {teamMembers
                  .filter((tm) => !members.some((m) => m.id === tm.id))
                  .map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.full_name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Priority
              </label>
              <select
                value={taskForm.priority}
                onChange={(e) =>
                  setTaskForm({ ...taskForm, priority: e.target.value })
                }
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Due date
            </label>
            <input
              type="date"
              value={taskForm.due_date}
              onChange={(e) =>
                setTaskForm({ ...taskForm, due_date: e.target.value })
              }
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setTaskModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingTask}
              className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-violet-700 disabled:opacity-60"
            >
              {creatingTask ? "Creating..." : "Create task"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Task Details and Comments Modal */}
      {selectedTask && (
        <Modal
          isOpen={Boolean(selectedTask)}
          onClose={() => setSelectedTask(null)}
          title={selectedTask.title || "Task details"}
          size="lg"
        >
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Status:</span>
                <select
                  value={selectedTask.status}
                  onChange={(e) => updateTaskStatus(selectedTask, e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="in_review">In Review</option>
                  <option value="done">Done</option>
                </select>
              </div>

              {canManageTasks && (
                <button
                  type="button"
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 size={14} /> Delete task
                </button>
              )}
            </div>

            {selectedTask.description && (
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Description
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                  {selectedTask.description}
                </p>
              </div>
            )}

            <div className="grid gap-3 border-y border-slate-100 py-3 sm:grid-cols-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Flag size={14} className="text-slate-400" />
                <span className="capitalize">
                  Priority: <strong>{selectedTask.priority || "medium"}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays size={14} className="text-slate-400" />
                <span>
                  Due: <strong>{formatDate(selectedTask.due_date)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={14} className="text-slate-400" />
                <span>
                  Assignee:{" "}
                  <strong>
                    {selectedTask.assignee_name || "Unassigned"}
                  </strong>
                </span>
              </div>
            </div>

            {/* Comments Section */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900">Task Discussion</h3>

              {loadingComments ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  Loading comments...
                </div>
              ) : taskComments.length > 0 ? (
                <div className="max-h-64 space-y-3 overflow-y-auto">
                  {taskComments.map((comment) => {
                    const isAuthor =
                      Number(comment.user_id) === Number(user?.id);
                    return (
                      <div
                        key={comment.id}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">
                            {comment.user_name || "Teammate"}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400">
                              {new Date(comment.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {(isAuthor || canManageTasks) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="mt-1 text-sm text-slate-700">
                          {comment.content}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-2 text-xs text-slate-400">
                  No comments yet. Be the first to start the discussion!
                </p>
              )}

              {/* Add comment form */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder="Write a comment..."
                  className="h-10 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-violet-500"
                />
                <button
                  type="submit"
                  disabled={!commentDraft.trim() || postingComment}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  <Send size={15} />
                  Send
                </button>
              </form>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
