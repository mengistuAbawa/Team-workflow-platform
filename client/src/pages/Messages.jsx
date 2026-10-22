import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowUp,
  Check,
  MessageCircle,
  MessagesSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";
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
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function dayKey(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toDateString();
}

function dayLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export default function Messages() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("conversation");

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const [showComposer, setShowComposer] = useState(false);
  const [composerMode, setComposerMode] = useState("private");
  const [groupName, setGroupName] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [creating, setCreating] = useState(false);

  const threadRef = useRef(null);
  const pollingRef = useRef(false);

  const loadConversations = useCallback(async ({ autoselect = false } = {}) => {
    try {
      const response = await api.get("/conversations");
      const list = response.data?.data?.conversations ?? [];
      setConversations(list);
      return list;
    } catch (err) {
      setError(err.response?.data?.message || "Could not load conversations.");
      return [];
    } finally {
      if (autoselect) setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(
    async (conversationId, { silent = false } = {}) => {
      if (!conversationId) {
        setMessages([]);
        return;
      }
      if (!silent) setLoadingMessages(true);
      try {
        const response = await api.get(`/conversations/${conversationId}/messages`);
        setMessages(response.data?.data?.messages ?? []);
      } catch (err) {
        if (!silent) setError(err.response?.data?.message || "Could not load messages.");
      } finally {
        if (!silent) setLoadingMessages(false);
      }
    },
    []
  );

  // Initial load + default selection
  useEffect(() => {
    let active = true;
    (async () => {
      const list = await loadConversations();
      if (!active) return;
      setLoading(false);
      if (list.length && !selectedId) {
        setSearchParams({ conversation: String(list[0].id) }, { replace: true });
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the opened thread
  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    setError("");
    loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  // Team members for the new-conversation composer
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await api.get("/team");
        if (active) setMembers(response.data?.data?.members ?? []);
      } catch {
        /* non-blocking: composer just shows no options */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Poll the open thread + conversation list (no overlapping requests)
  useEffect(() => {
    if (!selectedId) return undefined;
    const timer = window.setInterval(async () => {
      if (document.hidden || pollingRef.current) return;
      pollingRef.current = true;
      try {
        await Promise.all([loadMessages(selectedId, { silent: true }), loadConversations()]);
      } finally {
        pollingRef.current = false;
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [selectedId, loadMessages, loadConversations]);

  // Keep the thread pinned to the newest message
  useEffect(() => {
    const node = threadRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  async function sendMessage(event) {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;

    if (!selectedId) {
      setError("Select or start a conversation first, then send your message.");
      return;
    }
    if (sending) return;

    setSending(true);
    setError("");

    // Optimistic bubble so the message appears immediately.
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      conversation_id: Number(selectedId),
      sender_id: user?.id,
      sender_name: user?.full_name || "You",
      content,
      created_at: new Date().toISOString(),
      pending: true,
    };
    setMessages((current) => [...current, optimistic]);
    setDraft("");

    try {
      const response = await api.post(`/conversations/${selectedId}/messages`, { content });
      const saved = response.data?.data?.message;
      setMessages((current) =>
        current.map((item) => (item.id === tempId ? { ...(saved || item), pending: false } : item))
      );
      loadConversations();
    } catch (err) {
      setMessages((current) => current.filter((item) => item.id !== tempId));
      setDraft(content);
      setError(err.response?.data?.message || "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  function openConversation(id) {
    setDraft("");
    setError("");
    setSearchParams({ conversation: String(id) });
  }

  async function startConversation() {
    setError("");
    if (composerMode === "private") {
      if (selectedMemberIds.length !== 1) {
        setError("Pick exactly one teammate for a direct message.");
        return;
      }
    } else {
      if (!groupName.trim()) {
        setError("Give the group a name.");
        return;
      }
      if (!selectedMemberIds.length) {
        setError("Pick at least one teammate for the group.");
        return;
      }
    }

    setCreating(true);
    try {
      const payload =
        composerMode === "private"
          ? { conversation_type: "private", recipient_id: selectedMemberIds[0] }
          : {
              conversation_type: "group",
              name: groupName.trim(),
              member_ids: selectedMemberIds,
            };

      const response = await api.post("/conversations", payload);
      const conversationId = response.data?.data?.conversation_id;
      await loadConversations();
      setShowComposer(false);
      setGroupName("");
      setSelectedMemberIds([]);
      setMemberQuery("");
      if (conversationId) openConversation(conversationId);
    } catch (err) {
      setError(err.response?.data?.message || "Could not start the conversation.");
    } finally {
      setCreating(false);
    }
  }

  function toggleMember(id) {
    setSelectedMemberIds((current) => {
      if (composerMode === "private") return current.includes(id) ? [] : [id];
      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    });
  }

  const filteredMembers = useMemo(() => {
    const query = memberQuery.trim().toLowerCase();
    if (!query) return members;
    return members.filter(
      (member) =>
        member.full_name?.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query)
    );
  }, [members, memberQuery]);

  const activeConversation = conversations.find(
    (item) => String(item.id) === String(selectedId)
  );

  const groupedMessages = useMemo(() => {
    const groups = [];
    messages.forEach((message) => {
      const key = dayKey(message.created_at);
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.items.push(message);
      else groups.push({ key, label: dayLabel(message.created_at), items: [message] });
    });
    return groups;
  }, [messages]);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-violet-600">Work together</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Messages</h1>
          <p className="mt-1 text-sm text-slate-500">
            Coordinate with teammates and keep project discussions in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowComposer((value) => !value); setError(""); }}
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <Plus size={16} /> New message
          </button>
          <button
            onClick={() => { loadConversations(); if (selectedId) loadMessages(selectedId); }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss" className="shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      {showComposer && (
        <section className="rounded-2xl border border-violet-100 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold text-slate-900">Start a conversation</h2>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 text-sm font-semibold">
              {["private", "group"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => { setComposerMode(mode); setSelectedMemberIds([]); }}
                  className={`rounded-lg px-3 py-1.5 capitalize transition ${
                    composerMode === mode ? "bg-white text-violet-700 shadow-sm" : "text-slate-600"
                  }`}
                >
                  {mode === "private" ? "Direct" : "Group"}
                </button>
              ))}
            </div>
          </div>

          {composerMode === "group" && (
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              maxLength={150}
              placeholder="Group name"
              className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
            />
          )}

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 px-3">
            <Search size={16} className="text-slate-400" />
            <input
              value={memberQuery}
              onChange={(event) => setMemberQuery(event.target.value)}
              placeholder="Search teammates"
              className="w-full bg-transparent py-2.5 text-sm outline-none"
            />
          </div>

          <div className="mt-3 max-h-52 overflow-y-auto rounded-xl border border-slate-100">
            {filteredMembers.length ? (
              filteredMembers.map((member) => {
                const checked = selectedMemberIds.includes(member.id);
                return (
                  <button
                    key={member.id}
                    onClick={() => toggleMember(member.id)}
                    className={`flex w-full items-center gap-3 border-b border-slate-50 px-3 py-2.5 text-left last:border-b-0 ${
                      checked ? "bg-violet-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                      {initials(member.full_name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">{member.full_name}</span>
                      <span className="block truncate text-xs text-slate-500">{member.email}</span>
                    </span>
                    {checked && <Check size={16} className="shrink-0 text-violet-600" />}
                  </button>
                );
              })
            ) : (
              <p className="p-4 text-sm text-slate-500">No teammates found.</p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={() => { setShowComposer(false); setSelectedMemberIds([]); setGroupName(""); }}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={startConversation}
              disabled={creating}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {creating ? "Starting..." : "Start conversation"}
            </button>
          </div>
        </section>
      )}

      <section className="grid min-h-[620px] overflow-hidden rounded-2xl border border-slate-200 bg-white lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
          <div className="border-b border-slate-100 p-4">
            <h2 className="font-bold text-slate-900">Conversations</h2>
            <p className="mt-1 text-xs text-slate-500">Direct chats and project rooms</p>
          </div>
          {loading ? (
            <Loader label="Loading conversations..." />
          ) : conversations.length ? (
            <div className="max-h-[560px] overflow-y-auto p-2">
              {conversations.map((conversation) => {
                const selected = String(conversation.id) === String(selectedId);
                return (
                  <button
                    key={conversation.id}
                    onClick={() => openConversation(conversation.id)}
                    className={`mb-1 w-full rounded-xl p-3 text-left transition ${
                      selected ? "bg-violet-50 ring-1 ring-violet-100" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl ${
                          selected ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {conversation.conversation_type === "private" ? <MessageCircle size={18} /> : <Users size={18} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-slate-800">
                            {conversationLabel(conversation)}
                          </span>
                          {Number(conversation.unread_count) > 0 && (
                            <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {conversation.unread_count}
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block truncate text-xs text-slate-500">
                          {conversation.last_message || "Start the conversation"}
                        </span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center">
              <MessagesSquare size={28} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">No conversations yet</p>
              <button
                onClick={() => setShowComposer(true)}
                className="mt-2 inline-block text-sm font-semibold text-violet-600"
              >
                Start your first chat
              </button>
            </div>
          )}
        </aside>

        <div className="flex min-h-[520px] min-w-0 flex-col">
          {activeConversation ? (
            <>
              <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <MessagesSquare size={19} />
                </span>
                <div>
                  <h2 className="font-bold text-slate-900">{conversationLabel(activeConversation)}</h2>
                  <p className="text-xs capitalize text-slate-500">
                    {activeConversation.conversation_type} conversation
                  </p>
                </div>
              </div>

              <div ref={threadRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4 sm:p-6">
                {loadingMessages && !messages.length ? (
                  <Loader label="Loading messages..." />
                ) : null}

                {groupedMessages.map((group) => (
                  <div key={group.key || "group"} className="space-y-3">
                    {group.label && (
                      <div className="flex items-center gap-3">
                        <span className="h-px flex-1 bg-slate-200" />
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          {group.label}
                        </span>
                        <span className="h-px flex-1 bg-slate-200" />
                      </div>
                    )}
                    {group.items.map((message) => {
                      const mine = Number(message.sender_id) === Number(user?.id);
                      return (
                        <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%] ${
                              mine
                                ? "rounded-br-md bg-violet-600 text-white"
                                : "rounded-bl-md border border-slate-100 bg-white text-slate-800"
                            } ${message.pending ? "opacity-70" : ""}`}
                          >
                            <div
                              className={`mb-1 flex items-center gap-3 text-[11px] ${
                                mine ? "text-violet-100" : "text-slate-400"
                              }`}
                            >
                              <span className="font-semibold">{mine ? "You" : message.sender_name}</span>
                              <time>{message.pending ? "Sending..." : displayTime(message.created_at)}</time>
                            </div>
                            <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}

                {!messages.length && !loadingMessages && (
                  <div className="grid h-full place-items-center text-center">
                    <div>
                      <MessagesSquare size={30} className="mx-auto text-slate-300" />
                      <p className="mt-3 text-sm text-slate-500">No messages yet. Start the conversation.</p>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={sendMessage} className="flex items-end gap-3 border-t border-slate-100 p-4">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form.requestSubmit();
                    }
                  }}
                  rows={1}
                  maxLength={10000}
                  placeholder="Write a message..."
                  className="max-h-32 min-h-11 flex-1 resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
                <button
                  type="submit"
                  disabled={!draft.trim() || sending}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Send message"
                >
                  {sending ? <ArrowUp size={18} className="animate-pulse" /> : <Send size={17} />}
                </button>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center">
              <div>
                <MessagesSquare size={34} className="mx-auto text-slate-300" />
                <h2 className="mt-3 font-bold text-slate-800">Choose a conversation</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Contact a teammate or open a project chat to collaborate.
                </p>
                <button
                  onClick={() => setShowComposer(true)}
                  className="mt-4 inline-flex rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  New message
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
