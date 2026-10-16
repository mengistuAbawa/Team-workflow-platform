import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowUp, MessageCircle, MessagesSquare, RefreshCw, Send, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import Loader from "../components/common/Loader";

function conversationLabel(conversation) {
  if (conversation.conversation_type === "project") return conversation.project_name || "Project conversation";
  if (conversation.conversation_type === "private") return conversation.other_user_name || "Direct message";
  return conversation.name || "Group conversation";
}

function displayTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function Messages() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("conversation");
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const loadConversations = useCallback(async () => {
    try {
      const response = await api.get("/conversations");
      const list = response.data?.data?.conversations ?? [];
      setConversations(list);
      if (!selectedId && list.length) setSearchParams({ conversation: String(list[0].id) }, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Could not load conversations.");
    } finally {
      setLoading(false);
    }
  }, [selectedId, setSearchParams]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const loadMessages = useCallback(async () => {
    if (!selectedId) { setMessages([]); return; }
    try {
      const response = await api.get(`/conversations/${selectedId}/messages`);
      setMessages(response.data?.data?.messages ?? []);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load messages.");
    }
  }, [selectedId]);

  useEffect(() => {
    loadMessages();
    const timer = window.setInterval(() => {
      loadMessages();
      loadConversations();
    }, 7000);
    return () => window.clearInterval(timer);
  }, [loadMessages, loadConversations]);

  async function sendMessage(event) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !selectedId || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await api.post(`/conversations/${selectedId}/messages`, { content });
      const message = response.data?.data?.message;
      if (message) setMessages((current) => [...current, message]);
      setDraft("");
      loadConversations();
    } catch (err) {
      setError(err.response?.data?.message || "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  const activeConversation = conversations.find((item) => String(item.id) === String(selectedId));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-violet-600">Work together</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Messages</h1>
          <p className="mt-1 text-sm text-slate-500">Coordinate with teammates and keep project discussions in one place.</p>
        </div>
        <button onClick={() => { loadConversations(); loadMessages(); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={16} /> Refresh</button>
      </header>

      {error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}

      <section className="grid min-h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-100 p-4"><h2 className="font-bold text-slate-900">Conversations</h2><p className="mt-1 text-xs text-slate-500">Direct chats and project rooms</p></div>
          {loading ? <Loader label="Loading conversations..." /> : conversations.length ? <div className="max-h-[560px] overflow-y-auto p-2">
            {conversations.map((conversation) => {
              const selected = String(conversation.id) === String(selectedId);
              return <button key={conversation.id} onClick={() => setSearchParams({ conversation: String(conversation.id) })} className={`mb-1 w-full rounded-xl p-3 text-left transition ${selected ? "bg-violet-50 ring-1 ring-violet-100" : "hover:bg-slate-50"}`}>
                <div className="flex items-start gap-3"><span className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl ${selected ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>{conversation.conversation_type === "private" ? <MessageCircle size={18} /> : <Users size={18} />}</span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-slate-800">{conversationLabel(conversation)}</span>{Number(conversation.unread_count) > 0 && <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{conversation.unread_count}</span>}</span><span className="mt-1 block truncate text-xs text-slate-500">{conversation.last_message || "Start the conversation"}</span></span></div>
              </button>;
            })}
          </div> : <div className="p-6 text-center"><MessagesSquare size={28} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">No conversations yet</p><Link to="/team" className="mt-2 inline-block text-sm font-semibold text-violet-600">Find a teammate</Link></div>}
        </aside>

        <div className="flex min-h-[520px] min-w-0 flex-col">
          {activeConversation ? <>
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4"><span className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><MessagesSquare size={19} /></span><div><h2 className="font-bold text-slate-900">{conversationLabel(activeConversation)}</h2><p className="text-xs capitalize text-slate-500">{activeConversation.conversation_type} conversation</p></div></div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4 sm:p-6">
              {messages.map((message) => {
                const mine = Number(message.sender_id) === Number(user?.id);
                return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%] ${mine ? "rounded-br-md bg-violet-600 text-white" : "rounded-bl-md border border-slate-100 bg-white text-slate-800"}`}><div className={`mb-1 flex items-center gap-3 text-[11px] ${mine ? "text-violet-100" : "text-slate-400"}`}><span className="font-semibold">{mine ? "You" : message.sender_name}</span><time>{displayTime(message.created_at)}</time></div><p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p></div></div>;
              })}
              {!messages.length && <div className="grid h-full place-items-center text-center"><div><MessagesSquare size={30} className="mx-auto text-slate-300" /><p className="mt-3 text-sm text-slate-500">No messages yet. Start the conversation.</p></div></div>}
            </div>
            <form onSubmit={sendMessage} className="flex items-end gap-3 border-t border-slate-100 p-4"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form.requestSubmit(); } }} rows={1} maxLength={10000} placeholder="Write a message..." className="max-h-32 min-h-11 flex-1 resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100" /><button type="submit" disabled={!draft.trim() || sending} className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Send message">{sending ? <ArrowUp size={18} className="animate-pulse" /> : <Send size={17} />}</button></form>
          </> : <div className="grid flex-1 place-items-center p-8 text-center"><div><MessagesSquare size={34} className="mx-auto text-slate-300" /><h2 className="mt-3 font-bold text-slate-800">Choose a conversation</h2><p className="mt-1 text-sm text-slate-500">Contact a teammate or open a project chat to collaborate.</p><Link to="/team" className="mt-4 inline-flex rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">Browse team</Link></div></div>}
        </div>
      </section>
    </div>
  );
}
