import { useCallback, useEffect, useState } from "react";
import { CalendarDays, FileText, RefreshCw, Send } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/common/Loader";
import api from "../services/api";

const today = new Date().toISOString().slice(0, 10);

const stageLabels = {
  manager_review: "Waiting for manager",
  member_action: "Changes requested",
  admin_review: "Waiting for admin",
  approved: "Approved",
};

const stageStyles = {
  manager_review: "bg-amber-50 text-amber-700",
  member_action: "bg-rose-50 text-rose-700",
  admin_review: "bg-blue-50 text-blue-700",
  approved: "bg-emerald-50 text-emerald-700",
};

function formatDate(value) {
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function getErrorMessage(error) {
  return error.response?.data?.message || error.message || "Something went wrong.";
}

export default function ActivityReports() {
  const { user } = useAuth();
  const isManager = user?.role === "manager";
  const isAdmin = user?.role === "admin";
  const canSubmit = user?.role === "member";
  const [reports, setReports] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [activityDate, setActivityDate] = useState(today);
  const [content, setContent] = useState("");
  const [reviewDrafts, setReviewDrafts] = useState({});
  const [editDrafts, setEditDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [reportResponse, projectResponse] = await Promise.all([
        api.get("/reports"),
        canSubmit ? api.get("/projects") : Promise.resolve(null),
      ]);
      const reportList = reportResponse.data?.data?.reports ?? [];
      setReports(Array.isArray(reportList) ? reportList : []);

      if (projectResponse) {
        const projectList = projectResponse.data?.data?.projects ?? [];
        setProjects(Array.isArray(projectList) ? projectList : []);
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [canSubmit]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  async function submitReport(event) {
    event.preventDefault();
    if (!projectId || !content.trim()) {
      setError("Choose a project and describe your daily activity.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.post("/reports", {
        project_id: Number(projectId),
        activity_date: activityDate,
        content: content.trim(),
      });
      setContent("");
      setSuccess("Daily report sent to your project manager.");
      await loadReports();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function reviewReport(report, decision) {
    const comment = reviewDrafts[report.id] || "";
    if (!isAdmin && !comment.trim()) {
      setError("Add your evaluation before reviewing this report.");
      return;
    }
    if (decision === "changes_requested" && !comment.trim()) {
      setError("Explain what changes are required.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/reports/${report.id}/review`, { decision, comment });
      setSuccess(
        decision === "forwarded"
          ? "Report evaluated and forwarded to the admin."
          : decision === "approved"
            ? "Report approved."
            : "Changes requested.",
      );
      await loadReports();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function resubmitReport(report) {
    const draft = editDrafts[report.id] || {
      activity_date: String(report.activity_date).slice(0, 10),
      content: report.content,
    };
    if (!draft.content.trim()) {
      setError("Describe your daily activity before resubmitting.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await api.patch(`/reports/${report.id}`, {
        activity_date: draft.activity_date,
        content: draft.content.trim(),
      });
      setSuccess("Updated report sent back to your manager.");
      await loadReports();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-600">Team workflow</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Daily activity reports
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin
              ? "Review reports evaluated and forwarded by project managers."
              : isManager
                ? "Review your team's daily updates and forward them to the admin."
                : "Share what you worked on each day with your project manager."}
          </p>
        </div>
        <button
          type="button"
          onClick={loadReports}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </header>

      {error && (
        <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}

      {canSubmit && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <FileText size={22} />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">Submit today's activity</h2>
              <p className="text-sm text-slate-500">
                Describe the work completed, progress, and any blockers.
              </p>
            </div>
          </div>
          <form onSubmit={submitReport} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                Project
                <select
                  required
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-normal"
                >
                  <option value="">Choose a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1.5 text-sm font-semibold text-slate-700">
                Activity date
                <span className="relative block">
                  <CalendarDays
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    required
                    type="date"
                    value={activityDate}
                    onChange={(event) => setActivityDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 font-normal"
                  />
                </span>
              </label>
            </div>
            <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
              What did you work on?
              <textarea
                required
                maxLength={10000}
                rows={4}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Summarize your day-to-day activity, progress, and blockers..."
                className="w-full resize-y rounded-xl border border-slate-200 p-3 font-normal"
              />
            </label>
            <button
              type="submit"
              disabled={saving || !projects.length}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              <Send size={16} />
              {saving ? "Submitting..." : "Submit daily report"}
            </button>
            {!projects.length && !loading && (
              <p className="text-sm text-amber-700">
                You need to be added to a project before submitting a report.
              </p>
            )}
          </form>
        </section>
      )}

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {canSubmit ? "Your reports" : "Team reports"}
          </h2>
          <p className="text-sm text-slate-500">
            {reports.length} report{reports.length === 1 ? "" : "s"}
          </p>
        </div>

        {loading ? (
          <Loader label="Loading activity reports..." />
        ) : reports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            No daily activity reports yet.
          </div>
        ) : (
          reports.map((report) => {
            const canManagerReview =
              isManager && report.review_stage === "manager_review";
            const canAdminReview =
              isAdmin && report.review_stage === "admin_review";
            const canEdit =
              canSubmit &&
              Number(report.user_id) === Number(user?.id) &&
              report.review_stage === "member_action";
            const draft = editDrafts[report.id] || {
              activity_date: String(report.activity_date).slice(0, 10),
              content: report.content,
            };

            return (
              <article
                key={report.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {report.project_name}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {report.author_name} · {formatDate(report.activity_date)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      stageStyles[report.review_stage] || "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {stageLabels[report.review_stage] || report.review_stage}
                  </span>
                </div>

                {canEdit ? (
                  <div className="mt-4 space-y-3">
                    <label className="block text-sm font-semibold text-slate-700">
                      Activity date
                      <input
                        type="date"
                        value={draft.activity_date}
                        onChange={(event) =>
                          setEditDrafts((current) => ({
                            ...current,
                            [report.id]: { ...draft, activity_date: event.target.value },
                          }))
                        }
                        className="mt-1 block w-full rounded-xl border border-slate-200 px-3 py-2 sm:max-w-xs"
                      />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                      Update your report
                      <textarea
                        rows={4}
                        maxLength={10000}
                        value={draft.content}
                        onChange={(event) =>
                          setEditDrafts((current) => ({
                            ...current,
                            [report.id]: { ...draft, content: event.target.value },
                          }))
                        }
                        className="mt-1 w-full resize-y rounded-xl border border-slate-200 p-3 font-normal"
                      />
                    </label>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => resubmitReport(report)}
                      className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      Resubmit to manager
                    </button>
                  </div>
                ) : (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {report.content}
                  </p>
                )}

                {report.manager_comment && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
                    <p className="font-semibold text-slate-700">
                      Manager evaluation{report.manager_name ? ` · ${report.manager_name}` : ""}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-600">
                      {report.manager_comment}
                    </p>
                  </div>
                )}
                {report.admin_comment && (
                  <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm">
                    <p className="font-semibold text-blue-800">
                      Admin review{report.admin_name ? ` · ${report.admin_name}` : ""}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-blue-700">
                      {report.admin_comment}
                    </p>
                  </div>
                )}

                {(canManagerReview || canAdminReview) && (
                  <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                    <label className="block text-sm font-semibold text-slate-700">
                      {canManagerReview ? "Your evaluation" : "Admin review comment"}
                      <textarea
                        rows={3}
                        maxLength={5000}
                        value={reviewDrafts[report.id] || ""}
                        onChange={(event) =>
                          setReviewDrafts((current) => ({
                            ...current,
                            [report.id]: event.target.value,
                          }))
                        }
                        className="mt-1 w-full resize-y rounded-xl border border-slate-200 p-3 font-normal"
                        placeholder={
                          canManagerReview
                            ? "Evaluate the work before forwarding it to the admin..."
                            : "Add a comment or explain any requested changes..."
                        }
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {canManagerReview ? (
                        <>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => reviewReport(report, "forwarded")}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            Evaluate and forward to admin
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => reviewReport(report, "changes_requested")}
                            className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50"
                          >
                            Request changes
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => reviewReport(report, "approved")}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            Approve report
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => reviewReport(report, "changes_requested")}
                            className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50"
                          >
                            Request changes
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
