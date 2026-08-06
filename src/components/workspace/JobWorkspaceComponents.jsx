import { AlertTriangle, ClipboardCheck, LoaderCircle, Star } from "lucide-react";
import EmptyState from "../common/EmptyState";
import { supabase } from "../../lib/supabase";

function ActionHeader({ title, subtitle, primary, secondary, onPrimary, onSecondary }) {
  return <div className="action-header"><div><span className="label">Dashboard</span><h1>{title}</h1><p>{subtitle}</p></div><div className="hero-actions compact-actions"><button className="primary" onClick={onPrimary}>{primary}</button><button className="secondary" onClick={onSecondary}>{secondary}</button></div></div>;
}

function Stats({ items, activeKey }) {
  return (
    <div className="stats">
      {items.map((item) => {
        const [
          label,
          value,
          icon,
          onClick,
          key,
          tone = "neutral"
        ] = item;

        const clickable =
          typeof onClick === "function";

        const active =
          activeKey && key === activeKey;

        return (
          <button
            type="button"
            className={[
              "stat",
              clickable ? "stat-clickable" : "",
              active ? "stat-active" : "",
              `stat-${tone}`,
              Number(value) > 0
                ? "stat-has-value"
                : "stat-empty"
            ]
              .filter(Boolean)
              .join(" ")}
            key={label}
            onClick={
              clickable ? onClick : undefined
            }
            disabled={!clickable}
          >
            <div className="stat-ico">
              {icon}
            </div>

            <div>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function ActionSection({ icon, title, subtitle, filter, children }) {
  return <section className="action-section"><div className="section-title"><div className="section-title-left"><div className="section-ico">{icon}</div><div><h2>{title}</h2><p>{subtitle}</p></div></div>{filter && <div className="section-filter">{filter}</div>}</div><div className="tight-list">{children}</div></section>;
}

function StatusFilter({ value, onChange, options }) {
  return <label className="filter-select"><span>Show</span><select value={value} onChange={(e) => onChange(e.target.value)}>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>;
}

function filterByStatus(items, filter) {
  if (filter === "all") return items;
  if (filter === "requested") return items.filter(i => ["requested", "pending_response", "pending_payment"].includes(i.lifecycle_status || i.status));
  if (filter === "accepted") return items.filter(i => ["accepted", "paid"].includes(i.lifecycle_status || i.status));
  if (filter === "in_progress") return items.filter(i => (i.lifecycle_status || i.status) === "in_progress");
  if (filter === "completed") return items.filter(i => (i.lifecycle_status || i.status) === "completed");
  if (filter === "reviewed") return items.filter(i => (i.lifecycle_status || i.status) === "reviewed");
  if (filter === "declined") return items.filter(i => (i.lifecycle_status || i.status) === "declined");
  if (filter === "pending") return items.filter(i => ["pending", "pending_response", "pending_payment"].includes(i.status));
  return items.filter(i => (i.lifecycle_status || i.status) === filter);
}

function lifecycleStatus(job) {
  return job.lifecycle_status || (job.status === "pending_response" || job.status === "pending_payment" ? "requested" : job.status) || "requested";
}

function LifecycleTimeline({ status }) {
  const steps = ["requested", "accepted", "in_progress", "completed", "reviewed"];
  const current = status === "declined" ? 1 : Math.max(0, steps.indexOf(status));
  if (status === "declined") {
    return <div className="timeline declined-line"><div className="timeline-step done">Requested</div><div className="timeline-step declined">Declined</div></div>;
  }
  return <div className="timeline">
    {steps.map((step, index) => <div key={step} className={`timeline-step ${index <= current ? "done" : ""} ${index === current ? "current" : ""}`}>{step.replace("_", " ")}</div>)}
  </div>;
}

function BookingNotificationPanel({ jobs, role }) {
  const relevant = jobs
    .filter(j => ["requested", "accepted", "in_progress", "completed", "declined"].includes(lifecycleStatus(j)))
    .slice(0, 4);

  return <ActionSection icon={<AlertTriangle/>} title="Notifications" subtitle="Latest booking updates.">
    {relevant.length === 0 && <Empty text="No booking updates yet."/>}
    {relevant.map(job => {
      const status = lifecycleStatus(job);
      const text = role === "tradesperson"
        ? status === "requested" ? "New customer request needs your response." : `Booking moved to ${status.replace("_", " ")}.`
        : status === "requested" ? "Your request is waiting for tradie response." : `Your booking is now ${status.replace("_", " ")}.`;
      return <article className="notification-card" key={job.id}>
        <Status status={status}/>
        <p>{text}</p>
        <small>{job.trade || "Job"} · {job.county}</small>
      </article>;
    })}
  </ActionSection>;
}

function ReviewPrompt({ job }) {
  if (lifecycleStatus(job) !== "completed") return null;
  return <div className="review-prompt"><Star size={16}/> Job complete — customer can now leave a review.</div>;
}

function JobPostCard({ job, quotesCount, onOpen, priority }) {
  return <article className={`tight-card ${priority ? "priority" : ""}`}><div className="card-head"><div><h3>{job.job_title}</h3><p>{job.trade} · {job.county}</p></div><Status status={job.status}/></div><p className="truncate">{job.job_description}</p><div className="card-actions"><span className="chip">{quotesCount} quotes</span><button className="primary small-btn" onClick={onOpen}>View quotes & chat</button></div></article>;
}

function DirectJobCard({ job, setMessage, loadPrivateData, role = "tradesperson" }) {
  const status = lifecycleStatus(job);

  async function updateJob(nextStatus) {
    const updates = {
      status: nextStatus,
      lifecycle_status: nextStatus
    };

    if (nextStatus === "accepted") updates.accepted_at = new Date().toISOString();
    if (nextStatus === "declined") updates.declined_at = new Date().toISOString();
    if (nextStatus === "in_progress") updates.started_at = new Date().toISOString();
    if (nextStatus === "completed") updates.completed_at = new Date().toISOString();
    if (nextStatus === "reviewed") updates.reviewed_at = new Date().toISOString();

    const { error } = await supabase.from("job_requests").update(updates).eq("id", job.id);
    if (error) return setMessage(error.message);

const { data: { session } } = await supabase.auth.getSession();

fetch("/.netlify/functions/notify-booking-status", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token}`
  },
  body: JSON.stringify({
    jobRequestId: job.id,
    status: nextStatus
  })
}).catch(() => {});

    setMessage(`Booking updated to ${nextStatus.replace("_", " ")}.`);
    loadPrivateData();
  }

  const tradieActions = role === "tradesperson";
  const customerActions = role === "customer";

  return <article className={`tight-card lifecycle-card ${status === "requested" ? "priority" : ""}`}>
    <div className="card-head">
      <div>
        <h3>{job.trade || "Job request"}</h3>
        <p>{job.county}</p>
      </div>
      <Status status={status}/>
    </div>

    <p className="truncate">{job.job_description}</p>
    <LifecycleTimeline status={status}/>
    <ReviewPrompt job={{...job, lifecycle_status: status}}/>

    <div className="card-actions">
      <span className="chip orange">No booking fee during launch</span>

      {tradieActions && status === "requested" && <div className="button-row">
        <button className="primary small-btn" onClick={() => updateJob("accepted")}>Accept</button>
        <button className="danger small-btn" onClick={() => updateJob("declined")}>Decline</button>
      </div>}

      {tradieActions && status === "accepted" && <button className="primary small-btn" onClick={() => updateJob("in_progress")}>Start job</button>}
      {tradieActions && status === "in_progress" && <button className="primary small-btn" onClick={() => updateJob("completed")}>Mark complete</button>}
      {customerActions && status === "completed" && <button className="secondary small-btn">Leave review below</button>}
    </div>
  </article>;
}

function QuoteCard({ quote, post, onOpen, onRescind, isUpdating = false }) {
  const status = quote.status || "pending";

  return <article className={`tight-card quote-summary-${status}`}>
    <div className="card-head">
      <div><h3>{post?.job_title || "Job"}</h3><p>Quote sent</p></div>
      <Status status={status}/>
    </div>
    <strong className="price">€{quote.price_eur}</strong>
    <p className="truncate">{quote.note}</p>

    {status === "pending" && <SmartActionNotice type="info" title="Waiting for customer" text="This remains active until the customer accepts, declines, or you rescind it."/>}
    {status === "accepted" && <SmartActionNotice title="Accepted ✓" text="Customer accepted this quote. Open chat to arrange next steps."/>}
    {status === "declined" && <SmartActionNotice type="danger" title="Declined" text="Customer declined this quote."/>}
    {status === "rescinded" && <SmartActionNotice type="danger" title="Rescinded" text="You withdrew this quote."/>}
    {status === "cancelled" && <SmartActionNotice type="danger" title="Cancelled" text="This accepted job was cancelled after discussion."/>}

    <div className="button-row quote-card-actions">
      <button className="secondary small-btn" onClick={onOpen}>Open chat</button>
      {["pending", "accepted"].includes(status) && onRescind && (
        <button className="danger small-btn" disabled={isUpdating} onClick={() => onRescind(quote)}>
          {isUpdating ? (status === "accepted" ? "Cancelling..." : "Rescinding...") : (status === "accepted" ? "Cancel job" : "Rescind quote")}
        </button>
      )}
    </div>
  </article>;
}

function DirectBookings({ jobs, filter, setFilter }) {
  return <ActionSection icon={<ClipboardCheck/>} title="Direct bookings" subtitle="Requests sent directly to tradies." filter={<StatusFilter value={filter} onChange={setFilter} options={[["all","All direct bookings"],["requested","Requested"],["accepted","Accepted"],["in_progress","In progress"],["completed","Completed"],["declined","Declined"]]}/>}>
    {jobs.length === 0 && <Empty text="No direct bookings match this filter."/>}
    {jobs.map(job => <DirectJobCard key={job.id} job={job} role="customer" setMessage={() => {}} loadPrivateData={() => {}} />)}
  </ActionSection>;
}

function SmartActionNotice({ type = "success", title, text }) {
  return (
    <div className={`smart-notice smart-${type}`}>
      <strong>{title}</strong>
      {text && <span>{text}</span>}
    </div>
  );
}


function LoadingState({ title = "Loading…", text = "Please wait while we get everything ready." }) {
  return (
    <div className="loading-state" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-state-icon"><LoaderCircle size={26} aria-hidden="true"/></div>
      <div className="loading-state-copy">
        <strong>{title}</strong>
        <p>{text}</p>
        <div className="loading-skeleton" aria-hidden="true">
          <span/>
          <span/>
          <span/>
        </div>
      </div>
    </div>
  );
}

function Empty({ text }) {
  return <div className="empty premium-empty">
    <div className="empty-state-icon"><AlertTriangle size={20}/></div>
    <strong>{text}</strong>
  </div>;
}

function Status({ status }) {
  const label = status === "pending_response" ? "Awaiting response" : status === "quote_accepted" ? "Quote accepted" : status === "cancelled" ? "Cancelled" : status || "pending";
  return <span className={`status status-${String(status).replaceAll(" ", "_")}`}>{label}</span>;
}

export {
  ActionHeader, Stats, ActionSection, StatusFilter, filterByStatus, lifecycleStatus,
  LifecycleTimeline, BookingNotificationPanel, ReviewPrompt, JobPostCard, DirectJobCard,
  QuoteCard, DirectBookings, SmartActionNotice, LoadingState, EmptyState, Empty, Status
};
