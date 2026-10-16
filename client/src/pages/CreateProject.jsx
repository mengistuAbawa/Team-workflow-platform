import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FolderKanban } from "lucide-react";
import projectService from "../services/projectService";

export default function CreateProject() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "planning",
    due_date: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const response = await projectService.create({
        ...form,
        due_date: form.due_date || null,
      });
      const project = response.data?.data?.project ?? response.data?.project ?? response.data?.data ?? response.data;
      const projectId = project?.id ?? project?.insertId;

      if (projectId) {
        navigate(`/projects/${projectId}`);
      } else {
        navigate("/projects");
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not create the project.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link to="/projects" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-violet-700">
        <ArrowLeft size={17} /> Back to projects
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <FolderKanban size={23} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Create a project</h1>
            <p className="mt-1 text-sm text-slate-500">Set up a workspace for your team.</p>
          </div>
        </div>

        {error && <p role="alert" className="mb-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Project name</span>
            <input name="name" value={form.name} onChange={updateField} required maxLength={150} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" placeholder="e.g. Website redesign" />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-semibold text-slate-700">Description</span>
            <textarea name="description" value={form.description} onChange={updateField} rows={4} className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" placeholder="What is this project about?" />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Status</span>
              <select name="status" value={form.status} onChange={updateField} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100">
                <option value="planning">Planning</option>
                <option value="active">Active</option>
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-semibold text-slate-700">Due date</span>
              <input type="date" name="due_date" value={form.due_date} onChange={updateField} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
            </label>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <Link to="/projects" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</Link>
            <button type="submit" disabled={saving} className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-wait disabled:opacity-60">
              {saving ? "Creating..." : "Create project"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

