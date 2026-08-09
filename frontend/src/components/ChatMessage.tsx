import type { Message } from "../types";

interface Props {
  message: Message;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`message ${isUser ? "message--user" : "message--assistant"}`}>
      {!isUser && (
        <div className="message__avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7v1h-2v-1a5 5 0 00-5-5h-1v1.27c.6.34 1 .99 1 1.73a2 2 0 11-4 0c0-.74.4-1.39 1-1.73V10H9a5 5 0 00-5 5v1H2v-1a7 7 0 017-7h1V5.73A2 2 0 0112 2z"
              fill="currentColor"
            />
          </svg>
        </div>
      )}

      <div className="message__bubble">
        <p className="message__content">
          {message.content}
          {message.isStreaming && (
            <span className="cursor-blink" aria-hidden="true" />
          )}
        </p>
      </div>
    </div>
  );
}
