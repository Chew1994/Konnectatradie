import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ClipboardCheck,
  Euro,
  Zap
} from "lucide-react";

import { supabase } from "../../lib/supabase";

import {
  ActionSection,
  BookingNotificationPanel,
  DirectJobCard,
  Empty,
  QuoteCard,
  Stats,
  Status,
  StatusFilter,
  filterByStatus,
  lifecycleStatus
} from "../workspace/JobWorkspaceComponents";

import {
  DashboardErrorBoundary,
  IdentityActionHeader
} from "./DashboardShellComponents";

import {
  TradieForm,
  VerificationUpload
} from "./TradieDashboardForms";

import {
  ProfileForm
} from "./CustomerDashboardForms";

import SmartOnboardingPanel from "./SmartOnboardingPanel";

function scrollToDashboardTitle(titleText) {
  setTimeout(() => {
    const headings = Array.from(
      document.querySelectorAll(".action-section h2")
    );

    const targetHeading = headings.find((heading) =>
      (heading.textContent || "")
        .toLowerCase()
        .includes(titleText.toLowerCase())
    );

    const targetSection = targetHeading?.closest(".action-section");

    if (targetSection) {
      targetSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }, 80);
}

function SmartActionNotice({
  type = "success",
  title,
  text
}) {
  return (
    <div className={`smart-notice smart-${type}`}>
      <strong>{title}</strong>
      {text && <span>{text}</span>}
    </div>
  );
}

export default function TradieDashboard({
  profile,
  userId,
  setTab,
  jobs,
  myQuotes,
  jobPosts,
  messages = [],
  myTradie,
  setSelectedJobPost,
  stats,
  setMessage,
  loadProfile,
  loadPublicData,
  loadPrivateData,
  documents = []
}) {
  const [requestFilter, setRequestFilter] = useState("all");
  const [dashboardFocus, setDashboardFocus] = useState("");
  const [completionId, setCompletionId] = useState(null);
  const [workPlanSort, setWorkPlanSort] = useState("recommended");

  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const safeQuotes = Array.isArray(myQuotes) ? myQuotes : [];
  const safeJobPosts = Array.isArray(jobPosts) ? jobPosts : [];
  const safeDocuments = Array.isArray(documents) ? documents : [];

  const pendingJobs = safeJobs.filter(
    (job) => lifecycleStatus(job) === "requested"
  );

  const openQuotes = safeQuotes.filter(
    (quote) => quote?.status === "pending"
  );

  const acceptedQuotes = safeQuotes.filter(
    (quote) => quote?.status === "accepted"
  );

  const completedQuotes = safeQuotes.filter(
    (quote) => quote?.status === "completed"
  );

  const acceptedQuoteJobs = acceptedQuotes
    .map((quote) => ({
      quote,
      post: safeJobPosts.find(
        (job) => job.id === quote.job_post_id
      )
    }))
    .filter((item) => item.post);

  const completedQuoteJobs = completedQuotes
    .map((quote) => ({
      quote,
      post: safeJobPosts.find(
        (job) => job.id === quote.job_post_id
      )
    }))
    .filter((item) => item.post);

  const acceptedDirectJobsAll = safeJobs.filter((job) =>
    ["accepted", "in_progress", "reviewed"].includes(
      lifecycleStatus(job)
    )
  );

  const completedDirectJobsAll = safeJobs.filter(
    (job) => lifecycleStatus(job) === "completed"
  );

  const acceptedCount =
    acceptedQuoteJobs.length + acceptedDirectJobsAll.length;

  const completedCount =
    completedQuoteJobs.length + completedDirectJobsAll.length;

    const acceptedQuoteValue = acceptedQuoteJobs.reduce(
  (total, item) => total + (Number(item.quote?.price_eur) || 0),
  0
);

const urgencyRank = {
  ASAP: 4,
  "This week": 3,
  "This month": 2,
  Flexible: 1
};

function preferredDateValue(item) {
  const value = item.post?.preferred_date;

  if (!value) {
    return Number.MAX_SAFE_INTEGER;
  }

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp)
    ? timestamp
    : Number.MAX_SAFE_INTEGER;
}

function createdAtValue(item) {
  const timestamp = new Date(item.quote?.created_at || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

const plannedQuoteJobs = [...acceptedQuoteJobs].sort((a, b) => {
  const aPrice = Number(a.quote?.price_eur) || 0;
  const bPrice = Number(b.quote?.price_eur) || 0;

  if (workPlanSort === "highest_value") {
    return bPrice - aPrice;
  }

  if (workPlanSort === "smaller_first") {
    return aPrice - bPrice;
  }

  if (workPlanSort === "urgent_first") {
    const urgencyDifference =
      (urgencyRank[b.post?.urgency] || 0) -
      (urgencyRank[a.post?.urgency] || 0);

    if (urgencyDifference !== 0) {
      return urgencyDifference;
    }

    return preferredDateValue(a) - preferredDateValue(b);
  }

  if (workPlanSort === "newest") {
    return createdAtValue(b) - createdAtValue(a);
  }

  // Recommended:
  // urgency first, then preferred date, then higher-value work.
  const urgencyDifference =
    (urgencyRank[b.post?.urgency] || 0) -
    (urgencyRank[a.post?.urgency] || 0);

  if (urgencyDifference !== 0) {
    return urgencyDifference;
  }

  const dateDifference =
    preferredDateValue(a) - preferredDateValue(b);

  if (dateDifference !== 0) {
    return dateDifference;
  }

  return bPrice - aPrice;
});

  const filteredRequests =
    dashboardFocus === "needs_attention"
      ? pendingJobs
      : dashboardFocus === "accepted"
        ? acceptedDirectJobsAll
        : dashboardFocus === "completed"
          ? completedDirectJobsAll
          : filterByStatus(safeJobs, requestFilter);

  function applyDashboardFocus(focus) {
    setDashboardFocus(focus);

    if (focus === "needs_attention") {
      setMessage("Showing requests needing your response.");
      scrollToDashboardTitle("Action required");
    }

    if (focus === "accepted") {
      setMessage("Showing accepted jobs.");
      scrollToDashboardTitle("Accepted jobs");
    }

    if (focus === "open_quotes") {
      setMessage("Showing open quotes.");
      scrollToDashboardTitle("Active quote snapshot");
    }

    if (focus === "completed") {
      setMessage("Showing completed jobs.");
      scrollToDashboardTitle("Completed jobs");
    }
  }

  function clearDashboardFocus() {
    setDashboardFocus("");
    setMessage("Showing full dashboard.");
  }

  async function rescindDashboardQuote(quote) {
    if (!quote?.id) {
      setMessage("Could not find that quote.");
      return;
    }

    const isAccepted = quote.status === "accepted";

    const confirmed = window.confirm(
      isAccepted
        ? "Cancel this accepted job? Use this if the customer is not proceeding after discussion."
        : "Rescind this quote? The customer will no longer be able to accept it."
    );

    if (!confirmed) return;

    setCompletionId(quote.id);

if (isAccepted) {
  const { error } = await supabase.rpc(
    "cancel_accepted_job_quote",
    {
      p_quote_id: quote.id
    }
  );

  setCompletionId(null);

  if (error) {
    setMessage(error.message);
    return;
  }

  setMessage(
    "Job cancelled. The customer can now choose another quote."
  );

  loadPrivateData?.();
  loadPublicData?.();
  return;
}

const { error } = await supabase
  .from("job_quotes")
  .update({ status: "rescinded" })
  .eq("id", quote.id);

setCompletionId(null);

if (error) {
  setMessage(error.message);
  return;
}

setMessage("Quote rescinded.");
loadPrivateData?.();
loadPublicData?.();

    setCompletionId(null);

    if (quoteError || postError) {
      setMessage((quoteError || postError).message);
      return;
    }

    setMessage(
      isAccepted
        ? "Job cancelled. The customer can now choose another quote."
        : "Quote rescinded."
    );

    loadPrivateData?.();
    loadPublicData?.();
  }

async function markQuoteJobCompleted(item) {
  if (!item?.quote?.id) return;

  setCompletionId(item.quote.id);

  const { error } = await supabase.rpc(
    "complete_accepted_job_quote",
    {
      p_quote_id: item.quote.id
    }
  );

  setCompletionId(null);

  if (error) {
    setMessage(error.message);
    return;
  }

  setMessage("Job completed.");
  loadPrivateData?.();
  loadPublicData?.();
}

  function QuoteJobCard({
    item,
    completed = false
  }) {
    const { quote, post } = item;

    return (
      <article
        className={`quote-job-card ${
          completed ? "completed" : ""
        }`}
      >
        <div className="card-head">
          <div>
            <h3>{post?.job_title || "Accepted job"}</h3>
            <p>
              {post?.trade} · {post?.county}
            </p>
          </div>

          <Status
            status={completed ? "completed" : "accepted"}
          />
        </div>

        <p>{post?.job_description}</p>

        <p>
          <strong>Accepted quote:</strong> €{quote.price_eur}
        </p>

        {quote.note && (
          <div className="quote-job-note">
            {quote.note}
          </div>
        )}

        <div className="quote-job-actions">
          <button
            className="secondary small-btn"
            onClick={() => {
              setSelectedJobPost(post);
              setTab("job-chat");
            }}
          >
            Open chat
          </button>

          {!completed && (
            <button
              className="primary small-btn"
              disabled={completionId === quote.id}
              onClick={() => markQuoteJobCompleted(item)}
            >
              {completionId === quote.id
                ? "Completing..."
                : "Mark completed"}
            </button>
          )}
        </div>
      </article>
    );
  }

  return (
    <section>
      <IdentityActionHeader
        label="Dashboard"
        title={`${
          myTradie?.business_name ||
          profile?.full_name ||
          profile?.email ||
          "Tradesperson"
        } – Dashboard`}
        subtitle="Respond fast, quote clearly, win more jobs."
        primary="Job Map"
        secondary="Quotes Sent"
        onPrimary={() => setTab("map")}
        onSecondary={() => setTab("quotes-sent")}
        avatarText={
          myTradie?.business_name ||
          profile?.full_name ||
          profile?.email
        }
        badge={{
          text:
            myTradie?.verification_status === "verified"
              ? "Verified tradesperson"
              : myTradie?.approval_status === "approved" ||
                  myTradie?.approved
                ? "Approved listing"
                : "Profile pending",
          variant:
            myTradie?.verification_status === "verified"
              ? "verified"
              : myTradie?.approval_status === "approved" ||
                  myTradie?.approved
                ? "approved"
                : "pending"
        }}
      />

<p className="hint dashboard-hint">
  Welcome back — click a stat card to jump straight to
  the work that needs action.
</p>

<section className="dashboard-summary-card">
  <div>
    <span className="label">Today's overview</span>

    <h2>
      {pendingJobs.length > 0
        ? `${pendingJobs.length} job${
            pendingJobs.length === 1 ? "" : "s"
          } waiting for you`
        : "You're all caught up"}
    </h2>

    <p>
      {acceptedCount} active job
      {acceptedCount === 1 ? "" : "s"} ·{" "}
      {openQuotes.length} open quote
      {openQuotes.length === 1 ? "" : "s"} ·{" "}
      {completedCount} completed
    </p>
  </div>

  <button
    className="primary"
    onClick={() => applyDashboardFocus("needs_attention")}
  >
    Review priority work
  </button>
</section>



      <SmartOnboardingPanel
        profile={profile}
        myTradie={myTradie}
        setTab={setTab}
      />

      <Stats
        activeKey={dashboardFocus}
        items={[
[
  "Needs attention",
  pendingJobs.length || 0,
  <AlertTriangle />,
  () =>
    applyDashboardFocus(
      "needs_attention"
    ),
  "needs_attention",
  "warning"
],
[
  "Accepted",
  acceptedCount || 0,
  <CheckCircle />,
  () =>
    applyDashboardFocus("accepted"),
  "accepted",
  "success"
],
[
  "Open quotes",
  openQuotes.length || 0,
  <Euro />,
  () =>
    applyDashboardFocus("open_quotes"),
  "open_quotes",
  "info"
],
[
  "Completed",
  completedCount || 0,
  <ClipboardCheck />,
  () =>
    applyDashboardFocus("completed"),
  "completed",
  "complete"
]
        ]}
      />

      {dashboardFocus && (
        <div className="active-filter-strip">
          <span>
            Filtered:{" "}
            {dashboardFocus === "needs_attention"
              ? "Needs attention"
              : dashboardFocus === "accepted"
                ? "Accepted"
                : dashboardFocus === "open_quotes"
                  ? "Open quotes"
                  : "Completed"}
          </span>

          <button
            className="secondary small-btn"
            onClick={clearDashboardFocus}
          >
            Clear filter
          </button>
        </div>
      )}

      <div className="action-layout">
        <div className="main-feed">
          <BookingNotificationPanel
            jobs={jobs}
            role="tradesperson"
          />

          <ActionSection
            icon={<Zap />}
            title="Action required"
            subtitle="Respond to new requests first."
          >
            {pendingJobs.length === 0 && (
              <Empty text="No urgent job requests right now." />
            )}

            {pendingJobs.slice(0, 5).map((job) => (
              <DirectJobCard
                key={job.id}
                job={job}
                role="tradesperson"
                messages={messages}
                profileId={profile.id}
                setMessage={setMessage}
                loadPrivateData={loadPrivateData}
              />
            ))}

            {pendingJobs.length > 5 && (
              <SmartActionNotice
                type="info"
                title={`${pendingJobs.length - 5} more requests hidden`}
                text="Use the Direct requests filter below to view the full list."
              />
            )}
          </ActionSection>

          <ActionSection
            icon={<Euro />}
            title="Active quote snapshot"
            subtitle="Only quotes waiting on a customer response show here. Accepted quotes move into Accepted jobs."
            filter={
              <button
                className="secondary small-btn"
                onClick={() => setTab("quotes-sent")}
              >
                View all quotes
              </button>
            }
          >
            {openQuotes.slice(0, 3).length === 0 && (
              <Empty text="No open quotes waiting for customers." />
            )}

            {openQuotes.slice(0, 3).map((quote) => {
              const post = safeJobPosts.find(
                (job) => job.id === quote.job_post_id
              );

              return (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  post={post}
                  onOpen={() => {
                    setSelectedJobPost(post);
                    setTab("job-chat");
                  }}
                  onRescind={rescindDashboardQuote}
                  isUpdating={completionId === quote.id}
                />
              );
            })}
          </ActionSection>

<ActionSection
  icon={<CheckCircle />}
  title="Accepted jobs"
  subtitle="Customer-approved quote jobs and accepted direct bookings."
  filter={
    acceptedQuoteJobs.length > 1 ? (
      <label className="filter-select">
        <span>Work order</span>

        <select
          value={workPlanSort}
          onChange={(event) =>
            setWorkPlanSort(event.target.value)
          }
        >
          <option value="recommended">
            Recommended
          </option>

          <option value="urgent_first">
            Urgent first
          </option>

          <option value="highest_value">
            Highest value
          </option>

          <option value="smaller_first">
            Smaller jobs first
          </option>

          <option value="newest">
            Newest quote first
          </option>
        </select>
      </label>
    ) : null
  }
  
>
  {acceptedCount > 0 && (
  <div className="work-planner-summary">
    <div>
      <span>Active workload</span>

      <strong>
        {acceptedCount} job
        {acceptedCount === 1 ? "" : "s"}
      </strong>
    </div>

    <div>
      <span>Confirmed quote value</span>

      <strong>
        {new Intl.NumberFormat("en-IE", {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0
        }).format(acceptedQuoteValue)}
      </strong>
    </div>
  </div>
)}
            {acceptedQuoteJobs.length === 0 &&
              acceptedDirectJobsAll.length === 0 && (
                <Empty text="No accepted jobs yet." />
              )}

{plannedQuoteJobs.map((item) => (
              <QuoteJobCard
                key={`quote-${item.quote.id}`}
                item={item}
              />
            ))}

            {acceptedDirectJobsAll
              .slice(0, 5)
              .map((job) => (
                <DirectJobCard
                  key={`direct-${job.id}`}
                  job={job}
                  role="tradesperson"
                  messages={messages}
                  profileId={profile.id}
                  setMessage={setMessage}
                  loadPrivateData={loadPrivateData}
                />
              ))}
          </ActionSection>

          <ActionSection
            icon={<ClipboardCheck />}
            title="Completed jobs"
            subtitle="Finished jobs that have been marked complete."
          >
            {completedQuoteJobs.length === 0 &&
              completedDirectJobsAll.length === 0 && (
                <Empty text="No completed jobs yet." />
              )}

            {completedQuoteJobs.map((item) => (
              <QuoteJobCard
                key={`completed-quote-${item.quote.id}`}
                item={item}
                completed
              />
            ))}

            {completedDirectJobsAll
              .slice(0, 5)
              .map((job) => (
                <DirectJobCard
                  key={`completed-direct-${job.id}`}
                  job={job}
                  role="tradesperson"
                  messages={messages}
                  profileId={profile.id}
                  setMessage={setMessage}
                  loadPrivateData={loadPrivateData}
                />
              ))}
          </ActionSection>

          <ActionSection
            icon={<ClipboardCheck />}
            title="Direct requests"
            subtitle="Full request history with filters."
            filter={
              <StatusFilter
                value={requestFilter}
                onChange={setRequestFilter}
                options={[
                  ["all", "All direct requests"],
                  ["requested", "Requested"],
                  ["accepted", "Accepted"],
                  ["in_progress", "In progress"],
                  ["completed", "Completed"],
                  ["declined", "Declined"]
                ]}
              />
            }
          >
            {filteredRequests.length === 0 && (
              <Empty text="No direct requests match this filter." />
            )}

            {filteredRequests
              .slice(0, 8)
              .map((job) => (
                <DirectJobCard
                  key={job.id}
                  job={job}
                  role="tradesperson"
                  messages={messages}
                  profileId={profile.id}
                  setMessage={setMessage}
                  loadPrivateData={loadPrivateData}
                />
              ))}

            {filteredRequests.length > 8 && (
              <SmartActionNotice
                type="info"
                title={`${filteredRequests.length - 8} older requests hidden`}
                text="Use filters to narrow the list and keep the dashboard clean."
              />
            )}
          </ActionSection>
        </div>

        <aside className="side-rail">
          <ProfileForm
            profile={profile}
            setMessage={setMessage}
            loadProfile={loadProfile}
          />

          <TradieForm
            userId={userId}
            setMessage={setMessage}
            loadPublicData={loadPublicData}
          />

          <VerificationUpload
            userId={userId}
            tradie={myTradie}
            documents={safeDocuments}
            setMessage={setMessage}
            loadPrivateData={loadPrivateData}
            loadPublicData={loadPublicData}
          />
        </aside>
      </div>
    </section>
  );
}

export function TradieDashboardWithBoundary(props) {
  return (
    <DashboardErrorBoundary setTab={props.setTab}>
      <TradieDashboard {...props} />
    </DashboardErrorBoundary>
  );
}
