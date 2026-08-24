import React, { useEffect, useState } from "react";
import { Bell, MessageCircle } from "lucide-react";
import { lifecycleStatus } from "../workspace/JobWorkspaceComponents";

function SafeTradespersonDashboardFallback({ setTab, message }) {
  return <section className="safe-dashboard-fallback">
    <div className="action-header">
      <div>
        <span className="label">Dashboard recovery</span>
        <h1>Tradesperson dashboard</h1>
        <p>Your account is logged in, but part of the dashboard failed to load. Use the quick actions below while we protect the page from going blank.</p>
      </div>
    </div>

    <div className="safe-recovery-card">
      <h2>Dashboard safe mode</h2>
      <p>{message || "A dashboard section failed to render."}</p>
      <div className="safe-recovery-actions">
        <button className="primary" onClick={() => setTab("jobs-board")}>Available Jobs</button>
        <button className="secondary" onClick={() => setTab("quotes-sent")}>Quotes Sent</button>
        <button className="secondary" onClick={() => setTab("map")}>Job Map</button>
      </div>
    </div>
  </section>;
}

export class DashboardErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || "Dashboard could not load." };
  }

  componentDidCatch(error, info) {
    console.error("Dashboard render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return <SafeTradespersonDashboardFallback setTab={this.props.setTab} message={this.state.message} />;
    }

    return this.props.children;
  }
}

function initialsFromName(name = "") {
  const clean = String(name || "").trim();
  if (!clean) return "KT";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

export function IdentityActionHeader({ label, title, subtitle, primary, secondary, onPrimary, onSecondary, badge, avatarText }) {
  return (
    <div className="action-header identity-action-header">
      <div className="identity-title-row">
        <div className="identity-avatar">{initialsFromName(avatarText || title)}</div>
        <div>
          <span className="label">{label}</span>
          <div className="identity-heading-line">
            <h1>{title}</h1>
            {badge && <span className={`identity-badge ${badge.variant || ""}`}>{badge.text}</span>}
          </div>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="hero-actions compact-actions">
        {primary && <button className="primary" onClick={onPrimary}>{primary}</button>}
        {secondary && <button className="secondary" onClick={onSecondary}>{secondary}</button>}
      </div>
    </div>
  );
}

export function NotificationStrip({ profile, myPosts = [], myQuotes = [], jobs = [], messages = [], setTab, setSelectedJobPost, jobPosts = [] }) {
  const messageSeenKey = `kta-seen-message-at-${profile?.id || "guest"}`;
  const [seenMessageAt, setSeenMessageAt] = useState(() => Number(localStorage.getItem(messageSeenKey) || 0));

  useEffect(() => {
    const syncSeenMessages = (event) => {
      const seenAt = Number(event?.detail?.seenAt || localStorage.getItem(messageSeenKey) || 0);
      setSeenMessageAt(seenAt);
    };
    setSeenMessageAt(Number(localStorage.getItem(messageSeenKey) || 0));
    window.addEventListener("kta-message-seen", syncSeenMessages);
    return () => window.removeEventListener("kta-message-seen", syncSeenMessages);
  }, [messageSeenKey]);

  if (!profile) return null;

  const customerQuotePosts = profile.role === "customer"
    ? myPosts.filter(p => myQuotes.some(q => q.job_post_id === p.id && q.status === "pending"))
    : [];

  const tradieAcceptedQuotes = profile.role === "tradesperson"
    ? myQuotes.filter(q => q.status === "accepted")
    : [];

  const tradieRequests = profile.role === "tradesperson"
    ? jobs.filter(j => lifecycleStatus(j) === "requested")
    : [];

  const recentCutoff = Date.now() - (24 * 60 * 60 * 1000);
  const recentMessages = messages
    .filter((message) => {
      if (message.sender_id === profile.id) return false;
      const createdAt = message.created_at ? new Date(message.created_at).getTime() : Date.now();
      return createdAt >= recentCutoff && createdAt > seenMessageAt;
    })
    .slice(-3)
    .reverse();

  const total = customerQuotePosts.length + tradieAcceptedQuotes.length + tradieRequests.length + recentMessages.length;
  if (total === 0) return null;

  function scrollToConversation() {
    let attempts = 0;
    const findConversation = () => {
      const conversation = document.getElementById("workspace-conversation");
      if (conversation) {
        conversation.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      attempts += 1;
      if (attempts < 12) window.setTimeout(findConversation, 100);
    };
    window.setTimeout(findConversation, 0);
  }

  function markMessagesSeen(message) {
    const seenAt = message?.created_at ? new Date(message.created_at).getTime() : Date.now();
    localStorage.setItem(messageSeenKey, String(seenAt));
    setSeenMessageAt(seenAt);
    window.dispatchEvent(new CustomEvent("kta-message-seen", { detail: { seenAt } }));
  }

  function openFirstMessage() {
    const msg = recentMessages[0];
    if (!msg) return;
    const post = jobPosts.find(j => j.id === msg.job_post_id);
    if (!post) return;
    markMessagesSeen(msg);
    setSelectedJobPost(post);
    scrollToConversation();
  }

  return <div className="notification-strip">
    <div className="notification-strip-title">
      <Bell size={18}/>
      <strong>{total} notification{total === 1 ? "" : "s"}</strong>
    </div>

    <div className="notification-pills">
      {profile.role === "customer" && customerQuotePosts.length > 0 && <button onClick={() => setTab("dashboard")}>💬 {customerQuotePosts.length} quote{customerQuotePosts.length === 1 ? "" : "s"} received</button>}
      {profile.role === "tradesperson" && tradieAcceptedQuotes.length > 0 && <button onClick={() => setTab("quotes-sent")}>✅ {tradieAcceptedQuotes.length} accepted quote{tradieAcceptedQuotes.length === 1 ? "" : "s"}</button>}
      {profile.role === "tradesperson" && tradieRequests.length > 0 && <button onClick={() => setTab("dashboard")}>📩 {tradieRequests.length} booking request{tradieRequests.length === 1 ? "" : "s"}</button>}
      {recentMessages.length > 0 && <button onClick={openFirstMessage}>🔔 {recentMessages.length} new message alert{recentMessages.length === 1 ? "" : "s"}</button>}
    </div>
  </div>;
}

export function MessengerPopup({ profile, messages = [], jobPosts = [], setSelectedJobPost, setTab }) {
  const storageKey = `kta-seen-message-${profile?.id || "guest"}`;
  const [dismissedId, setDismissedId] = useState(() => localStorage.getItem(storageKey));
  if (!profile) return null;

  const latest = [...messages].filter(m => m.sender_id !== profile.id).sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
  if (!latest || String(latest.id) === String(dismissedId)) return null;

  const post = jobPosts.find(j => j.id === latest.job_post_id);

  return <div className="messenger-popup" role="status" aria-live="polite">
    <button type="button" className="messenger-close" aria-label="Dismiss new message notification" onClick={() => { localStorage.setItem(storageKey, latest.id); setDismissedId(latest.id); }}>×</button>
    <div className="messenger-dot"><MessageCircle size={18}/></div>
    <div>
      <strong>New message</strong>
      <p>{latest.message || "You have a new chat message."}</p>
      <button onClick={() => {
        if (!post) return;
        const seenAt = latest.created_at ? new Date(latest.created_at).getTime() : Date.now();
        localStorage.setItem(storageKey, latest.id);
        localStorage.setItem(`kta-seen-message-at-${profile.id}`, String(seenAt));
        setDismissedId(latest.id);
        window.dispatchEvent(new CustomEvent("kta-message-seen", { detail: { seenAt } }));
        setSelectedJobPost(post);
        let attempts = 0;
        const findConversation = () => {
          const conversation = document.getElementById("workspace-conversation");
          if (conversation) {
            conversation.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
          }
          attempts += 1;
          if (attempts < 12) window.setTimeout(findConversation, 100);
        };
        window.setTimeout(findConversation, 0);
      }}>Open chat</button>
    </div>
  </div>;
}
