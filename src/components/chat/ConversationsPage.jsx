import React, { useMemo } from "react";
import {
  ArrowRight,
  Clock,
  MessageCircle
} from "lucide-react";

function formatMessageTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (sameDay) {
    return date.toLocaleTimeString("en-IE", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  return date.toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
    year:
      date.getFullYear() === now.getFullYear()
        ? undefined
        : "numeric"
  });
}

function messagePreview(value) {
  const text = String(value || "").trim();

  if (!text) {
    return "No message preview available.";
  }

  return text.length > 120
    ? `${text.slice(0, 117)}...`
    : text;
}

export default function ConversationsPage({
  profile,
  messages = [],
  jobPosts = [],
  onOpenConversation,
  onBack
}) {
  const conversations = useMemo(() => {
    const safeMessages = Array.isArray(messages)
      ? messages
      : [];

    const safeJobPosts = Array.isArray(jobPosts)
      ? jobPosts
      : [];

    const messagesByJob = new Map();

    safeMessages.forEach((message) => {
      if (!message?.job_post_id) return;

      const jobId = String(message.job_post_id);
      const current = messagesByJob.get(jobId) || [];

      current.push(message);
      messagesByJob.set(jobId, current);
    });

    return Array.from(messagesByJob.entries())
      .map(([jobId, conversationMessages]) => {
        const jobPost = safeJobPosts.find(
          (post) => String(post?.id) === jobId
        );

        if (!jobPost) {
          return null;
        }

        const orderedMessages = [...conversationMessages].sort(
          (first, second) =>
            new Date(first?.created_at || 0).getTime() -
            new Date(second?.created_at || 0).getTime()
        );

        const latestMessage =
          orderedMessages[orderedMessages.length - 1];

        return {
          jobPost,
          latestMessage,
          messageCount: orderedMessages.length,
          latestTime: new Date(
            latestMessage?.created_at || 0
          ).getTime()
        };
      })
      .filter(Boolean)
      .sort(
        (first, second) =>
          second.latestTime - first.latestTime
      );
  }, [messages, jobPosts]);

  return (
    <section className="conversations-page">
      <header className="action-header conversations-header">
        <div>
          <span className="label">Messages</span>

          <h1>Your conversations</h1>

          <p>
            Return to job discussions, quotes and booking
            arrangements at any time.
          </p>
        </div>

        <div className="conversations-header-icon">
          <MessageCircle size={28} />
        </div>
      </header>

      <div className="conversations-toolbar">
        <div>
          <strong>
            {conversations.length}{" "}
            {conversations.length === 1
              ? "conversation"
              : "conversations"}
          </strong>

          <span>
            Most recently active conversations appear first.
          </span>
        </div>

        <button
          type="button"
          className="secondary"
          onClick={onBack}
        >
          Back to dashboard
        </button>
      </div>

      {conversations.length === 0 ? (
        <div className="conversations-empty">
          <div className="conversations-empty-icon">
            <MessageCircle size={30} />
          </div>

          <h2>No conversations yet</h2>

          <p>
            Conversations will appear here after a message is
            sent about one of your jobs.
          </p>

          <button
            type="button"
            className="primary"
            onClick={onBack}
          >
            Return to dashboard
          </button>
        </div>
      ) : (
        <div className="conversations-list">
          {conversations.map(
            ({
              jobPost,
              latestMessage,
              messageCount
            }) => {
              const sentByCurrentUser =
                String(latestMessage?.sender_id) ===
                String(profile?.id);

              return (
                <article
                  className="conversation-card"
                  key={jobPost.id}
                >
                  <button
                    type="button"
                    className="conversation-card-main"
                    onClick={() =>
                      onOpenConversation(jobPost)
                    }
                    aria-label={`Open conversation for ${
                      jobPost.job_title || "job"
                    }`}
                  >
                    <div className="conversation-card-icon">
                      <MessageCircle size={22} />
                    </div>

                    <div className="conversation-card-copy">
                      <div className="conversation-card-heading">
                        <div>
                          <h2>
                            {jobPost.job_title ||
                              "Job conversation"}
                          </h2>

                          <p>
                            {[
                              jobPost.trade,
                              jobPost.county
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>

                        <span className="conversation-status">
                          {jobPost.status || "open"}
                        </span>
                      </div>

                      <p className="conversation-preview">
                        <strong>
                          {sentByCurrentUser
                            ? "You: "
                            : "New reply: "}
                        </strong>

                        {messagePreview(
                          latestMessage?.message
                        )}
                      </p>

                      <div className="conversation-card-meta">
                        <span>
                          <Clock size={14} />

                          {formatMessageTime(
                            latestMessage?.created_at
                          )}
                        </span>

                        <span>
                          {messageCount}{" "}
                          {messageCount === 1
                            ? "message"
                            : "messages"}
                        </span>
                      </div>
                    </div>

                    <span className="conversation-open-icon">
                      <ArrowRight size={20} />
                    </span>
                  </button>
                </article>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}