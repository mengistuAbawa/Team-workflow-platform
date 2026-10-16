
import { useCallback, useEffect, useState } from "react";
import {
  Bell, CheckCheck, CheckCircle2, Inbox, RefreshCw,
  AlertCircle, Trash2
} from "lucide-react";
import api from "../services/api";
import Loader from "../components/common/Loader";

function notificationDate(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/notifications");
      const payload = response.data?.data;
      setItems(Array.isArray(payload) ? payload : payload?.notifications ?? []);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const unreadCount = items.filter((item) => !item.is_read).length;
  const visibleItems = items.filter((item) =>
    filter === "unread" ? !item.is_read : true
  );

  async function markRead(item) {
    if (item.is_read) return;

    const previous = items;
    setItems((current) =>
      current.map((notification) =>
        notification.id === item.id
          ? { ...notification, is_read: 1 }
          : notification
      )
    );

    try {
      await api.patch(`/notifications/${item.id}/read`);
    } catch (err) {
      setItems(previous);
      setError(err.response?.data?.message || "Could not mark notification as read.");
    }
  }

  async function markAllRead() {
    if (!unreadCount) return;

    const previous = items;
    setBusy(true);
    setError("");
    setItems((current) => current.map((item) => ({ ...item, is_read: 1 })));

    try {
      await api.patch("/notifications/read-all");
    } catch (err) {
      setItems(previous);
      setError(err.response?.data?.message || "Could not update notifications.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteNotification(id) {
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== id));
    setError("");

    try {
      await api.delete(`/notifications/${id}`);
    } catch (err) {
      setItems(previous);
      setError(err.response?.data?.message || "Could not delete notification.");
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-violet-600">Stay up to date</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">Updates about your projects and tasks.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={loadNotifications} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={markAllRead} disabled={!unreadCount || busy} className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">
            <CheckCheck size={16} /> Mark all read
          </button>
        </div>
      </header>

      {error && <div role="alert" className="flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm text-rose-700"><AlertCircle size={18} />{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Bell size={21} /></div>
            <div><p className="text-sm text-slate-500">Total notifications</p><p className="text-2xl font-bold text-slate-900">{items.length}</p></div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600"><Inbox size={21} /></div>
            <div><p className="text-sm text-slate-500">Unread</p><p className="text-2xl font-bold text-slate-900">{unreadCount}</p></div>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bold text-slate-900">Your updates</h2>
            <p className="mt-1 text-sm text-slate-500">Review the latest activity.</p>
          </div>
          <label>
            <span className="sr-only">Filter notifications</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-500">
              <option value="all">All</option>
              <option value="unread">Unread only</option>
            </select>
          </label>
        </div>

        {loading ? <Loader label="Loading notifications..." /> : visibleItems.length ? (
          <div className="divide-y divide-slate-100">
            {visibleItems.map((item) => (
              <article key={item.id} className={`flex gap-3 px-5 py-5 transition hover:bg-slate-50 ${!item.is_read ? "bg-violet-50/30" : ""}`}>
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${item.is_read ? "bg-slate-100 text-slate-500" : "bg-violet-100 text-violet-700"}`}>
                  <Bell size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-slate-800">{item.title || "TeamFlow update"}</h3>
                    {!item.is_read && <span className="size-2 rounded-full bg-violet-600" aria-label="Unread" />}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.message || "You have a new notification."}</p>
                  <p className="mt-2 text-xs text-slate-400">{notificationDate(item.created_at)}</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    {!item.is_read && (
                      <button onClick={() => markRead(item)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-800">
                        <CheckCircle2 size={14} /> Mark as read
                      </button>
                    )}
                    {item.link && (
                      <a href={item.link} className="text-xs font-semibold text-slate-600 hover:text-violet-700">Open link</a>
                    )}
                  </div>
                </div>
                <button onClick={() => deleteNotification(item.id)} aria-label="Delete notification" className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 size={16} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-5 py-16 text-center">
            <Inbox size={30} className="mx-auto text-slate-300" />
            <h3 className="mt-3 font-semibold text-slate-800">{filter === "unread" ? "You're all caught up" : "No notifications yet"}</h3>
            <p className="mt-1 text-sm text-slate-500">New workspace updates will appear here.</p>
          </div>
        )}
      </section>
    </div>
  );
}
