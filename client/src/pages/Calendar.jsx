
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock3,
  RefreshCw, AlertCircle
} from "lucide-react";
import api from "../services/api";
import Loader from "../components/common/Loader";

const pad = (n) => String(n).padStart(2, "0");
const dateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function taskDate(task) {
  const raw = task.due_date;
  if (!raw) return null;

  // Handle MySQL DATE values without timezone shifting.
  const match = String(raw).match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : dateKey(date);
}

export default function Calendar() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/tasks");
      const payload = response.data?.data;
      setTasks(Array.isArray(payload) ? payload : payload?.tasks ?? []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load calendar tasks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const tasksByDate = useMemo(() => {
    const grouped = {};
    tasks.forEach((task) => {
      const key = taskDate(task);
      if (key) (grouped[key] ??= []).push(task);
    });
    return grouped;
  }, [tasks]);

  const days = useMemo(() => {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(
      firstDay.getFullYear(),
      firstDay.getMonth(),
      1 - firstDay.getDay()
    );

    return Array.from({ length: 42 }, (_, i) => {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      return day;
    });
  }, [month]);

  const selectedTasks = tasksByDate[selectedDate] || [];

  function changeMonth(offset) {
    setMonth((current) =>
      new Date(current.getFullYear(), current.getMonth() + offset, 1)
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-600">Plan your work</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Calendar</h1>
          <p className="mt-1 text-sm text-slate-500">
            View task deadlines across your workspace.
          </p>
        </div>
        <button onClick={loadTasks} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} /> {error}
          <button onClick={loadTasks} className="ml-auto font-semibold underline">Retry</button>
        </div>
      )}

      {loading ? <Loader label="Loading calendar..." /> : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                </h2>
                <p className="text-sm text-slate-500">Select a day to view its tasks.</p>
              </div>
              <div className="flex gap-2">
                <button aria-label="Previous month" onClick={() => changeMonth(-1)} className="rounded-lg border p-2 hover:bg-slate-50"><ChevronLeft size={18} /></button>
                <button onClick={() => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelectedDate(dateKey(now)); }} className="rounded-lg border px-3 text-sm font-medium hover:bg-slate-50">Today</button>
                <button aria-label="Next month" onClick={() => changeMonth(1)} className="rounded-lg border p-2 hover:bg-slate-50"><ChevronRight size={18} /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center text-xs font-semibold uppercase text-slate-400">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="py-3">{day}</div>)}
            </div>

            <div className="grid grid-cols-7 overflow-hidden rounded-xl border-l border-t border-slate-100">
              {days.map((day) => {
                const key = dateKey(day);
                const isCurrentMonth = day.getMonth() === month.getMonth();
                const isSelected = key === selectedDate;
                const isToday = key === dateKey(new Date());
                const count = (tasksByDate[key] || []).length;

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDate(key)}
                    aria-pressed={isSelected}
                    className={[
                      "flex min-h-20 flex-col items-center gap-2 border-b border-r border-slate-100 p-2 text-sm transition sm:min-h-24",
                      isCurrentMonth ? "bg-white text-slate-800" : "bg-slate-50 text-slate-300",
                      isSelected ? "ring-2 ring-inset ring-violet-500" : "hover:bg-violet-50",
                    ].join(" ")}
                  >
                    <span className={[
                      "flex size-7 items-center justify-center rounded-full",
                      isToday ? "bg-violet-600 font-bold text-white" : "",
                    ].join(" ")}>{day.getDate()}</span>
                    {count > 0 && (
                      <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 sm:text-xs">
                        <span className="size-1.5 rounded-full bg-violet-500" />
                        {count} <span className="hidden sm:inline">{count === 1 ? "task" : "tasks"}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><CalendarDays size={22} /></div>
              <div>
                <h2 className="font-bold text-slate-900">Tasks for the day</h2>
                <p className="text-sm text-slate-500">
                  {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {selectedTasks.length ? selectedTasks.map((task) => (
                <Link key={task.id} to={task.project_id ? `/projects/${task.project_id}` : "/tasks"} className="block rounded-xl border border-slate-100 p-4 transition hover:border-violet-200 hover:bg-violet-50/40">
                  <p className="font-semibold text-slate-800">{task.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <Clock3 size={13} />
                    {(task.status || "todo").replaceAll("_", " ")}
                    {task.priority && <span className="rounded-full bg-slate-100 px-2 py-1">{task.priority}</span>}
                  </div>
                </Link>
              )) : (
                <div className="py-10 text-center">
                  <CalendarDays size={26} className="mx-auto text-slate-300" />
                  <p className="mt-3 text-sm font-medium text-slate-700">No tasks due this day</p>
                  <p className="mt-1 text-xs text-slate-500">Choose another date to see its deadlines.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
