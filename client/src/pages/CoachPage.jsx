/* global fetch, TextDecoder, navigator */
import { Bot, Copy, MessageCircle, Plus, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.js";

function formatInline(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={index}>{part.slice(1, -1)}</code>;
    return part;
  });
}

function CoachMarkdown({ content }) {
  const lines = content.split(/\r?\n/);
  return (
    <div className="coach-markdown">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div className="markdown-spacer" key={index} />;
        if (trimmed.startsWith("### "))
          return <h4 key={index}>{formatInline(trimmed.slice(4))}</h4>;
        if (trimmed.startsWith("## "))
          return <h3 key={index}>{formatInline(trimmed.slice(3))}</h3>;
        if (trimmed.startsWith("# "))
          return <h2 key={index}>{formatInline(trimmed.slice(2))}</h2>;
        if (/^[-*]\s+/.test(trimmed))
          return (
            <div className="markdown-list-item" key={index}>
              <span>•</span>
              <span>{formatInline(trimmed.replace(/^[-*]\s+/, ""))}</span>
            </div>
          );
        if (/^\d+\.\s+/.test(trimmed))
          return (
            <div className="markdown-list-item" key={index}>
              <span>{trimmed.match(/^\d+/)[0]}.</span>
              <span>{formatInline(trimmed.replace(/^\d+\.\s+/, ""))}</span>
            </div>
          );
        return <p key={index}>{formatInline(trimmed)}</p>;
      })}
    </div>
  );
}

export function CoachPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [input, setInput] = useState("");
  const [draft, setDraft] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef(null);
  const { data: conversations = [] } = useQuery({
    queryKey: ["coach-conversations"],
    queryFn: async () =>
      (await api.get("/coach/conversations")).data.data.conversations,
  });
  const activeId = selectedId || conversations[0]?._id;
  const { data: active } = useQuery({
    queryKey: ["coach-conversation", activeId],
    queryFn: async () =>
      (await api.get(`/coach/conversations/${activeId}`)).data.data,
    enabled: Boolean(activeId),
  });
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active?.messages, draft]);
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/coach/conversations/${id}`),
    onSuccess: () => {
      setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ["coach-conversations"] });
    },
  });
  const send = async () => {
    const message = input.trim();
    if (!message || streaming) return;
    setInput("");
    setStreaming(true);
    setDraft((current) => [
      ...current,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/coach/chat`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: activeId,
            message,
            stream: true,
          }),
        },
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Unable to reach Career Coach");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";
        events.forEach((event) => {
          const line = event
            .split("\n")
            .find((item) => item.startsWith("data: "));
          if (!line) return;
          const data = JSON.parse(line.slice(6));
          if (data.token)
            setDraft((current) => {
              const next = [...current];
              next[next.length - 1] = {
                ...next[next.length - 1],
                content: `${next[next.length - 1].content}${data.token}`,
              };
              return next;
            });
          if (data.conversationId && !activeId)
            setSelectedId(data.conversationId);
        });
      }
      setDraft([]);
      queryClient.invalidateQueries({ queryKey: ["coach-conversations"] });
      if (activeId)
        queryClient.invalidateQueries({
          queryKey: ["coach-conversation", activeId],
        });
    } catch (error) {
      setDraft((current) => {
        const next = [...current];
        next[next.length - 1] = {
          role: "assistant",
          content:
            error.message ||
            "AI service is temporarily unavailable. Please try again.",
        };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  };
  const messages = [...(active?.messages || []), ...draft];
  return (
    <div className="coach-page">
      <aside className="coach-sidebar">
        <header>
          <div>
            <p className="eyebrow">Career Coach</p>
            <h2>Conversations</h2>
          </div>
          <button
            className="icon-btn"
            aria-label="New conversation"
            onClick={() => {
              setSelectedId(null);
              setDraft([]);
            }}
          >
            <Plus size={17} />
          </button>
        </header>{" "}
        <div className="coach-conversations">
          {conversations.map((conversation) => (
            <div
              key={conversation._id}
              className={`conversation-item ${conversation._id === activeId ? "active" : ""}`}
            >
              <button
                type="button"
                className="conversation-link"
                onClick={() => {
                  setSelectedId(conversation._id);
                  setDraft([]);
                }}
              >
                <MessageCircle size={15} />
<span
  className="conversation-title"
  title={conversation.title || "New conversation"}
>
  {conversation.title || "New conversation"}
</span>
              </button>
              <button
                type="button"
                className="conversation-delete"
                aria-label="Delete conversation"
                onClick={(event) => {
                  event.stopPropagation();
                  remove.mutate(conversation._id);
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {!conversations.length && (
            <p className="form-note">Your conversations will appear here.</p>
          )}
        </div>
      </aside>
      <section className="coach-main">
        <header className="coach-header">
          <div className="coach-avatar">
            <Bot size={20} />
          </div>
          <div>
            <h1>Career Coach</h1>
            <p>Personalized guidance grounded in your profile</p>
          </div>
          <span className="coach-status">Ready</span>
        </header>
        <div className="coach-messages">
          {!messages.length && (
            <div className="coach-welcome">
              <div className="coach-welcome-icon">
                <Bot size={26} />
              </div>
              <h2>What&apos;s on your mind?</h2>
              <p className="body-copy">
                Ask about your resume, target role, interview preparation, or
                next career move.
              </p>
              <div className="suggestion-row">
                {[
                  "Am I ready for my target role?",
                  "How can I improve my resume?",
                  "Help me prepare for an interview",
                ].map((suggestion) => (
                  <button key={suggestion} onClick={() => setInput(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message, index) => (
            <article
              className={`message ${message.role}`}
              key={`${message.createdAt || "draft"}-${index}`}
            >
              <div className="message-avatar">
                {message.role === "assistant" ? <Bot size={15} /> : "You"}
              </div>
              <div className="message-content">
                {message.content ? (
                  message.role === "assistant" ? (
                    <CoachMarkdown content={message.content} />
                  ) : (
                    <p>{message.content}</p>
                  )
                ) : (
                  <p>Thinking…</p>
                )}
                {message.role === "assistant" && message.content && (
                  <button
                    className="copy-btn"
                    aria-label="Copy response"
                    onClick={() =>
                      navigator.clipboard?.writeText(message.content)
                    }
                  >
                    <Copy size={13} /> Copy
                  </button>
                )}
              </div>
            </article>
          ))}
          <div ref={bottomRef} />
        </div>
        <footer className="coach-composer">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            placeholder="Ask Career Coach..."
            rows="1"
            aria-label="Message Career Coach"
          />
          <button
            className="send-btn"
            aria-label="Send message"
            onClick={send}
            disabled={!input.trim() || streaming}
          >
            <Send size={17} />
          </button>
          <span>Enter to send · Shift + Enter for a new line</span>
        </footer>
      </section>
    </div>
  );
}
