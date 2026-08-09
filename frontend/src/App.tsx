import { useCallback, useEffect, useRef, useState } from "react";
import { streamChat, checkHealth } from "./api";
import type { Message } from "./types";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
import SuggestedQuestions from "./components/SuggestedQuestions";

const SUGGESTIONS = [
  "What are your core technical skills?",
  "Tell me about your projects",
  "What is your work experience?",
  "What is your educational background?",
  "What certifications do you have?",
];

function createId() {
  return crypto.randomUUID();
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkHealth().then(setIsOnline);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: Message = {
      id: createId(),
      role: "user",
      content: trimmed,
    };

    const assistantId = createId();
    const assistantMsg: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);

    try {
      await streamChat(
        trimmed,
        (chunk) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content + chunk }
                : m
            )
          );
        },
        controller.signal
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Sorry, I couldn't reach the server. Please make sure the backend is live and accessible.",
                isStreaming: false,
              }
            : m
        )
      );
    } finally {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m
        )
      );
      setIsLoading(false);
    }
  }, [isLoading]);

  const clearChat = () => {
    abortRef.current?.abort();
    setMessages([]);
    setIsLoading(false);
  };

  const showSuggestions = messages.length === 0 && !isLoading;

  return (
    <div className="app">
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-glow bg-glow--1" aria-hidden="true" />
      <div className="bg-glow bg-glow--2" aria-hidden="true" />

      <header className="header">
        <div className="header__brand">
          <div className="header__avatar">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div>
            <h1 className="header__title">Portfolio AI</h1>
            <p className="header__subtitle">
              Ask me about my skills, projects & experience
            </p>
          </div>
        </div>

        <div className="header__actions">
          <span
            className={`status-badge ${isOnline === true ? "status-badge--online" : isOnline === false ? "status-badge--offline" : ""}`}
          >
            <span className="status-badge__dot" />
            {isOnline === null
              ? "Checking..."
              : isOnline
                ? "Online"
                : "Offline"}
          </span>
          {messages.length > 0 && (
            <button className="btn-ghost" onClick={clearChat} type="button">
              Clear chat
            </button>
          )}
        </div>
      </header>

      <main className="chat-container">
        {showSuggestions ? (
          <div className="welcome">
            <div className="welcome__icon">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"
                  fill="currentColor"
                />
                <path
                  d="M7 9h10v2H7zm0-3h10v2H7zm0 6h7v2H7z"
                  fill="currentColor"
                />
              </svg>
            </div>
            <h2 className="welcome__heading">Hi there! I'm Aaditya's AI assistant.</h2>
            <p className="welcome__text">
              I can answer questions about skills, projects, work experience,
              education, and more — all based on the resume. Try one of these
              to get started:
            </p>
            <SuggestedQuestions
              questions={SUGGESTIONS}
              onSelect={sendMessage}
              disabled={isLoading}
            />
          </div>
        ) : (
          <div className="messages">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </main>

      <footer className="input-area">
        <ChatInput onSend={sendMessage} disabled={isLoading} />
        <p className="input-area__hint">
          Powered by Groq · Answers are based on resume data only
        </p>
      </footer>
    </div>
  );
}
