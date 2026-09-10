import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Loader, EmptyState } from "@/components/common/States";
import { ImageWithFallback } from "@/components/common/ImageWithFallback";
import { MessageSquare, Send, ArrowLeft } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

export default function Messages() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [convos, setConvos] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const active = convos.find((c) => c.id === id);
  const endRef = useRef(null);

  const loadConvos = () => api.get("/conversations").then(({ data }) => setConvos(data)).finally(() => setLoading(false));
  useEffect(() => { loadConvos(); }, []);
  useEffect(() => {
    if (!id) { setMessages([]); return; }
    const load = () => api.get(`/conversations/${id}/messages`).then(({ data }) => setMessages(data)).catch(() => {});
    load(); const i = setInterval(load, 5000); return () => clearInterval(i);
  }, [id]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !id) return;
    const t = text; setText("");
    try { const { data } = await api.post(`/conversations/${id}/messages`, { text: t }); setMessages((m) => [...m, data]); loadConvos(); }
    catch (_) { setText(t); }
  };

  return (
    <div data-testid="messages-page">
      <h1 className="mb-4 font-display text-2xl font-bold tracking-tight text-foreground">Messages</h1>
      <div className="grid overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-3" style={{ height: "70vh" }}>
        {/* Conversation list */}
        <div className={cn("border-r border-border overflow-y-auto", id && "hidden lg:block")}>
          {loading ? <Loader /> : convos.length === 0 ? <div className="p-6 text-center text-sm text-muted-foreground">No conversations yet</div> : (
            convos.map((c) => (
              <button key={c.id} onClick={() => nav(`/messages/${c.id}`)} data-testid={`convo-${c.id}`}
                className={cn("flex w-full items-center gap-3 border-b border-border p-4 text-left transition-colors hover:bg-secondary", c.id === id && "bg-secondary")}>
                <ImageWithFallback src={c.other?.photo} alt="" className="h-11 w-11 rounded-full object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between"><span className="truncate font-semibold text-foreground">{c.other?.business_name || c.other?.name}</span>{c.unread > 0 && <span className="rounded-full bg-[hsl(var(--primary))] px-1.5 text-[10px] text-white">{c.unread}</span>}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.last_message || "Start the conversation"}</div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Thread */}
        <div className={cn("flex flex-col lg:col-span-2", !id && "hidden lg:flex")}>
          {!id ? (
            <div className="grid flex-1 place-items-center"><EmptyState icon={MessageSquare} title="Select a conversation" description="Choose a chat to start messaging." testId="messages-empty" /></div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border p-4">
                <button onClick={() => nav("/messages")} className="lg:hidden"><ArrowLeft size={18} /></button>
                <ImageWithFallback src={active?.other?.photo} alt="" className="h-9 w-9 rounded-full object-cover" />
                <div className="font-semibold text-foreground">{active?.other?.business_name || active?.other?.name || "Chat"}</div>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {messages.map((m) => {
                  const mine = m.sender_id === user.id;
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")} data-testid={`message-${m.id}`}>
                      <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2 text-sm", mine ? "bg-[hsl(var(--primary))] text-white" : "bg-secondary text-foreground")}>
                        {m.text}
                        <div className={cn("mt-0.5 text-[10px]", mine ? "text-white/60" : "text-muted-foreground")}>{timeAgo(m.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
                <input data-testid="message-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none" />
                <button type="submit" data-testid="message-send" className="grid h-10 w-10 place-items-center rounded-full bg-[hsl(var(--primary))] text-white"><Send size={16} /></button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
