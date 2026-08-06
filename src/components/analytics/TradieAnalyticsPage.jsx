import React, { useMemo } from "react";
import {
  Activity,
  Award,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle,
  CircleEuro,
  Clock3,
  MapPin,
  MessageCircle,
  Repeat2,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  XCircle
} from "lucide-react";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat"
];

const LOSS_STATUSES = new Set([
  "declined",
  "rescinded",
  "cancelled"
]);

const COMPLETED_STATUSES = new Set([
  "completed",
  "reviewed"
]);

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function average(values) {
  if (!values.length) return 0;

  return (
    values.reduce(
      (total, value) => total + safeNumber(value),
      0
    ) / values.length
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(safeNumber(value));
}

function formatPercent(value) {
  return `${Math.round(safeNumber(value))}%`;
}

function formatDuration(minutes) {
  const value = Math.max(
    0,
    Math.round(safeNumber(minutes))
  );

  if (value === 0) return "No data";

  if (value < 60) {
    return `${value} min`;
  }

  const hours = Math.floor(value / 60);
  const remainingMinutes = value % 60;

  if (hours < 24) {
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  return remainingHours > 0
    ? `${days}d ${remainingHours}h`
    : `${days}d`;
}

function getDate(value) {
  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function getLifecycleStatus(job) {
  return String(
    job?.lifecycle_status ||
      job?.status ||
      ""
  ).toLowerCase();
}

function buildActivitySeries(quotes, type) {
  const labels =
    type === "month"
      ? MONTH_LABELS
      : WEEKDAY_LABELS;

  const counts = labels.map(() => 0);

  quotes.forEach((quote) => {
    const date = getDate(quote?.created_at);
    if (!date) return;

    const index =
      type === "month"
        ? date.getMonth()
        : date.getDay();

    counts[index] += 1;
  });

  return labels.map((label, index) => ({
    label,
    value: counts[index]
  }));
}

function getTopEntry(items, fallbackLabel) {
  if (!items.length) {
    return {
      label: fallbackLabel,
      value: 0
    };
  }

  return [...items].sort(
    (first, second) =>
      second.value - first.value
  )[0];
}

function getQuietestActiveEntry(
  items,
  fallbackLabel
) {
  const activeItems = items.filter(
    (item) => item.value > 0
  );

  if (!activeItems.length) {
    return {
      label: fallbackLabel,
      value: 0
    };
  }

  return [...activeItems].sort(
    (first, second) =>
      first.value - second.value
  )[0];
}

function ActivityBars({
  title,
  subtitle,
  icon,
  items
}) {
  const maximum = Math.max(
    1,
    ...items.map((item) => item.value)
  );

  return (
    <section className="analytics-panel">
      <div className="analytics-panel-heading">
        <div className="analytics-panel-icon">
          {icon}
        </div>

        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      <div className="analytics-bars">
        {items.map((item) => (
          <div
            className="analytics-bar-row"
            key={item.label}
          >
            <div className="analytics-bar-label">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>

            <div className="analytics-bar-track">
              <span
                style={{
                  width: `${
                    (item.value / maximum) * 100
                  }%`
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function AnalyticsMetric({
  label,
  value,
  helper,
  icon,
  tone = "orange"
}) {
  return (
    <article
      className={`analytics-metric analytics-metric-${tone}`}
    >
      <div className="analytics-metric-icon">
        {icon}
      </div>

      <div>
        <strong>{value}</strong>
        <span>{label}</span>

        {helper && <small>{helper}</small>}
      </div>
    </article>
  );
}

function FunnelStep({
  label,
  value,
  maximum,
  helper
}) {
  const width =
    maximum > 0
      ? Math.max(6, (value / maximum) * 100)
      : 0;

  return (
    <div className="analytics-funnel-step">
      <div className="analytics-funnel-heading">
        <span>{label}</span>
        <strong>{value}</strong>
      </div>

      <div className="analytics-funnel-track">
        <span style={{ width: `${width}%` }} />
      </div>

      <small>{helper}</small>
    </div>
  );
}

function ScoreFactor({
  label,
  value,
  helper,
  tone = "orange"
}) {
  const safeValue = Math.max(
    0,
    Math.min(100, safeNumber(value))
  );

  return (
    <article className="analytics-score-factor">
      <div>
        <span>{label}</span>
        <strong>{formatPercent(safeValue)}</strong>
      </div>

      <div className="analytics-score-track">
        <span
          className={`analytics-score-${tone}`}
          style={{ width: `${safeValue}%` }}
        />
      </div>

      <small>{helper}</small>
    </article>
  );
}

export default function TradieAnalyticsPage({
  myTradie,
  quotes = [],
  jobPosts = [],
  jobs = [],
  reviews = [],
  messages = [],
  onBack,
  onViewQuotes
}) {
  const analytics = useMemo(() => {
    const safeQuotes = safeArray(quotes);
    const safeJobPosts = safeArray(jobPosts);
    const safeJobs = safeArray(jobs);
    const safeReviews = safeArray(reviews);
    const safeMessages = safeArray(messages);

    const tradieId = myTradie?.id
      ? String(myTradie.id)
      : "";

    const tradieUserId = myTradie?.user_id
      ? String(myTradie.user_id)
      : "";

    const myQuotes = tradieId
      ? safeQuotes.filter(
          (quote) =>
            String(
              quote?.tradesperson_id
            ) === tradieId
        )
      : [];

    const acceptedQuotes = myQuotes.filter(
      (quote) =>
        quote?.status === "accepted"
    );

    const pendingQuotes = myQuotes.filter(
      (quote) =>
        !quote?.status ||
        quote.status === "pending"
    );

    const declinedQuotes = myQuotes.filter(
      (quote) =>
        quote?.status === "declined"
    );

    const rescindedQuotes = myQuotes.filter(
      (quote) =>
        quote?.status === "rescinded"
    );

    const cancelledQuotes = myQuotes.filter(
      (quote) =>
        quote?.status === "cancelled"
    );

    const lostQuotes = myQuotes.filter(
      (quote) =>
        LOSS_STATUSES.has(quote?.status)
    );

    const decidedQuotes =
      acceptedQuotes.length +
      declinedQuotes.length;

    const winRate =
      decidedQuotes > 0
        ? (acceptedQuotes.length /
            decidedQuotes) *
          100
        : 0;

    const quoteValues = myQuotes.map(
      (quote) => quote?.price_eur
    );

    const acceptedValues =
      acceptedQuotes.map(
        (quote) => quote?.price_eur
      );

    const pendingValues =
      pendingQuotes.map(
        (quote) => quote?.price_eur
      );

    const lostValues = lostQuotes.map(
      (quote) => quote?.price_eur
    );

    const revenueWon =
      acceptedValues.reduce(
        (total, value) =>
          total + safeNumber(value),
        0
      );

    const pipelineValue =
      pendingValues.reduce(
        (total, value) =>
          total + safeNumber(value),
        0
      );

const revenueLost =
  lostValues.reduce(
    (total, value) =>
      total + safeNumber(value),
    0
  );

const likelyRevenue =
  Math.round(
    pipelineValue * (winRate / 100)
  );

    const averageQuote =
      average(quoteValues);

    const averageAcceptedQuote =
      average(acceptedValues);

    const averageLostQuote =
      average(lostValues);

    const highestAcceptedQuote =
      acceptedValues.length > 0
        ? Math.max(
            ...acceptedValues.map(safeNumber)
          )
        : 0;

    const jobPostMap = new Map(
      safeJobPosts
        .filter((post) => post?.id)
        .map((post) => [
          String(post.id),
          post
        ])
    );

    const acceptedCustomerIds =
      acceptedQuotes
        .map((quote) => {
          const post = jobPostMap.get(
            String(quote?.job_post_id)
          );

          return post?.customer_id
            ? String(post.customer_id)
            : "";
        })
        .filter(Boolean);

    const customerCounts = new Map();

    acceptedCustomerIds.forEach(
      (customerId) => {
        customerCounts.set(
          customerId,
          (customerCounts.get(
            customerId
          ) || 0) + 1
        );
      }
    );

    const totalCustomers =
      customerCounts.size;

    const repeatCustomers =
      Array.from(
        customerCounts.values()
      ).filter((count) => count > 1).length;

    const repeatCustomerRate =
      totalCustomers > 0
        ? (repeatCustomers /
            totalCustomers) *
          100
        : 0;

    const countyCounts = new Map();
    const tradeCounts = new Map();

    myQuotes.forEach((quote) => {
      const post = jobPostMap.get(
        String(quote?.job_post_id)
      );

      if (post?.county) {
        countyCounts.set(
          post.county,
          (countyCounts.get(
            post.county
          ) || 0) + 1
        );
      }

      if (post?.trade) {
        tradeCounts.set(
          post.trade,
          (tradeCounts.get(
            post.trade
          ) || 0) + 1
        );
      }
    });

    const countyEntries =
      Array.from(
        countyCounts.entries()
      ).map(([label, value]) => ({
        label,
        value
      }));

    const tradeEntries =
      Array.from(
        tradeCounts.entries()
      ).map(([label, value]) => ({
        label,
        value
      }));

    const topCounty = getTopEntry(
      countyEntries,
      "No county data"
    );

    const topTrade = getTopEntry(
      tradeEntries,
      myTradie?.trade ||
        "No trade data"
    );

    const monthlyActivity =
      buildActivitySeries(
        myQuotes,
        "month"
      );

    const weekdayActivity =
      buildActivitySeries(
        myQuotes,
        "weekday"
      );

    const busiestMonth =
      getTopEntry(
        monthlyActivity,
        "No activity yet"
      );

    const quietestMonth =
      getQuietestActiveEntry(
        monthlyActivity,
        "No activity yet"
      );

    const busiestDay =
      getTopEntry(
        weekdayActivity,
        "No activity yet"
      );

    const quietestDay =
      getQuietestActiveEntry(
        weekdayActivity,
        "No activity yet"
      );

    const tradieJobs = tradieId
      ? safeJobs.filter((job) => {
          const assignedTradie =
            job?.tradesperson_id ||
            job?.accepted_tradesperson_id;

          return String(
            assignedTradie || ""
          ) === tradieId;
        })
      : [];

    const acceptedJobs =
      tradieJobs.filter((job) =>
        [
          "accepted",
          "in_progress",
          "completed",
          "reviewed"
        ].includes(
          getLifecycleStatus(job)
        )
      );

    const completedJobs =
      tradieJobs.filter((job) =>
        COMPLETED_STATUSES.has(
          getLifecycleStatus(job)
        )
      );

    const tradieReviews = tradieId
      ? safeReviews.filter(
          (review) =>
            String(
              review?.tradesperson_id
            ) === tradieId
        )
      : [];

    const averageRating =
      tradieReviews.length > 0
        ? average(
            tradieReviews.map(
              (review) =>
                review?.rating
            )
          )
        : 0;

    const reviewedCustomerIds =
      new Set(
        tradieReviews
          .map((review) =>
            review?.customer_id
              ? String(
                  review.customer_id
                )
              : ""
          )
          .filter(Boolean)
      );

    const myJobPostIds = new Set(
      myQuotes
        .map((quote) =>
          quote?.job_post_id
            ? String(
                quote.job_post_id
              )
            : ""
        )
        .filter(Boolean)
    );

    const myMessages =
      safeMessages.filter(
        (message) =>
          myJobPostIds.has(
            String(
              message?.job_post_id ||
                ""
            )
          )
      );

    const messagesByJob = new Map();

    myMessages.forEach((message) => {
      const jobId = String(
        message?.job_post_id || ""
      );

      if (!jobId) return;

      const current =
        messagesByJob.get(jobId) || [];

      current.push(message);
      messagesByJob.set(
        jobId,
        current
      );
    });

    const responseTimes = [];

    messagesByJob.forEach(
      (jobMessages) => {
        const orderedMessages = [
          ...jobMessages
        ].sort(
          (first, second) =>
            (getDate(
              first?.created_at
            )?.getTime() || 0) -
            (getDate(
              second?.created_at
            )?.getTime() || 0)
        );

        orderedMessages.forEach(
          (message, index) => {
            const senderId = String(
              message?.sender_id || ""
            );

            if (
              !senderId ||
              senderId === tradieUserId
            ) {
              return;
            }

            const customerMessageDate =
              getDate(
                message?.created_at
              );

            if (!customerMessageDate) {
              return;
            }

            const response =
              orderedMessages
                .slice(index + 1)
                .find(
                  (candidate) =>
                    String(
                      candidate?.sender_id ||
                        ""
                    ) === tradieUserId
                );

            const responseDate =
              getDate(
                response?.created_at
              );

            if (!responseDate) return;

            const minutes =
              (responseDate.getTime() -
                customerMessageDate.getTime()) /
              60000;

            if (
              Number.isFinite(minutes) &&
              minutes >= 0
            ) {
              responseTimes.push(
                minutes
              );
            }
          }
        );
      }
    );

    const averageResponseMinutes =
      average(responseTimes);

    const fastestResponseMinutes =
      responseTimes.length > 0
        ? Math.min(...responseTimes)
        : 0;

    const slowestResponseMinutes =
      responseTimes.length > 0
        ? Math.max(...responseTimes)
        : 0;

    const responseScore =
      responseTimes.length === 0
        ? 0
        : averageResponseMinutes <= 30
          ? 100
          : averageResponseMinutes <= 60
            ? 90
            : averageResponseMinutes <= 180
              ? 75
              : averageResponseMinutes <= 720
                ? 55
                : 35;

    const quoteScore =
      decidedQuotes > 0
        ? Math.min(100, winRate)
        : 0;

    const reviewScore =
      tradieReviews.length > 0
        ? Math.min(
            100,
            (averageRating / 5) *
              100
          )
        : 0;

    const completionScore =
      acceptedJobs.length > 0
        ? Math.min(
            100,
            (completedJobs.length /
              acceptedJobs.length) *
              100
          )
        : 0;

    const profileScore =
      [
        myTradie?.business_name,
        myTradie?.trade,
        myTradie?.county,
        myTradie?.bio,
        myTradie?.phone,
        myTradie?.insurance_confirmed
      ].filter(Boolean).length /
      6 *
      100;

    const scoreValues = [
      quoteScore,
      reviewScore,
      completionScore,
      profileScore
    ];

    if (responseTimes.length > 0) {
      scoreValues.push(responseScore);
    }

    const businessHealth =
      average(scoreValues);

    const funnel = {
      quoted: myQuotes.length,
      accepted:
        acceptedQuotes.length,
      completed:
        completedJobs.length,
      reviewed:
        reviewedCustomerIds.size
    };

    const recommendations = [];

    if (!myTradie) {
      recommendations.push({
        tone: "info",
        title:
          "Complete your business profile",
        text:
          "Analytics will become more useful after your tradesperson profile is complete."
      });
    }

    if (
      decidedQuotes >= 3 &&
      winRate < 30
    ) {
      recommendations.push({
        tone: "danger",
        title:
          "Review your quote approach",
        text:
          `Your current win rate is ${formatPercent(
            winRate
          )}. Compare pricing and quote notes on accepted versus declined work.`
      });
    }

    if (
      decidedQuotes >= 3 &&
      winRate >= 70
    ) {
      recommendations.push({
        tone: "success",
        title:
          "Strong quote performance",
        text:
          `You are winning ${formatPercent(
            winRate
          )} of decided quotes. Your pricing and presentation appear competitive.`
      });
    }

    if (
      averageLostQuote > 0 &&
      averageAcceptedQuote > 0 &&
      averageLostQuote >
        averageAcceptedQuote * 1.2
    ) {
      recommendations.push({
        tone: "warning",
        title:
          "Higher quotes are losing more often",
        text:
          `Your average lost quote is ${formatCurrency(
            averageLostQuote
          )}, compared with ${formatCurrency(
            averageAcceptedQuote
          )} for accepted work.`
      });
    }

    if (
      responseTimes.length > 0 &&
      averageResponseMinutes > 180
    ) {
      recommendations.push({
        tone: "warning",
        title:
          "Customers are waiting for replies",
        text:
          `Your average measured response time is ${formatDuration(
            averageResponseMinutes
          )}. Faster replies may improve customer confidence.`
      });
    }

    if (
      responseTimes.length > 0 &&
      averageResponseMinutes <= 60
    ) {
      recommendations.push({
        tone: "success",
        title:
          "You respond quickly",
        text:
          `Your average measured response time is ${formatDuration(
            averageResponseMinutes
          )}. Keep maintaining this standard.`
      });
    }

    if (
      repeatCustomerRate >= 25
    ) {
      recommendations.push({
        tone: "success",
        title:
          "Customers are returning",
        text:
          `${formatPercent(
            repeatCustomerRate
          )} of customers with accepted quotes have returned for additional work.`
      });
    }

    if (
      pipelineValue > 0
    ) {
      recommendations.push({
        tone: "info",
        title:
          "Follow up on open opportunities",
        text:
          `You currently have ${formatCurrency(
            pipelineValue
          )} in pending quote value.`
      });
    }

    if (
      tradieReviews.length === 0
    ) {
      recommendations.push({
        tone: "info",
        title:
          "Build your reputation",
        text:
          "Ask customers to leave a review after completed work."
      });
    }

    if (
      recommendations.length === 0
    ) {
      recommendations.push({
        tone: "info",
        title:
          "Keep building activity",
        text:
          "More quotes, completed jobs and reviews will unlock deeper performance insights."
      });
    }

    const achievements = [
      {
        title: "First quote",
        text:
          "Submitted your first marketplace quote.",
        unlocked:
          myQuotes.length >= 1,
        progress: Math.min(
          100,
          myQuotes.length * 100
        )
      },
      {
        title: "Quote builder",
        text:
          "Submit 10 customer quotes.",
        unlocked:
          myQuotes.length >= 10,
        progress: Math.min(
          100,
          (myQuotes.length / 10) *
            100
        )
      },
      {
        title: "First win",
        text:
          "Have a quote accepted.",
        unlocked:
          acceptedQuotes.length >= 1,
        progress: Math.min(
          100,
          acceptedQuotes.length *
            100
        )
      },
      {
        title: "Trusted tradie",
        text:
          "Receive five customer reviews.",
        unlocked:
          tradieReviews.length >= 5,
        progress: Math.min(
          100,
          (tradieReviews.length / 5) *
            100
        )
      },
      {
        title: "Five-star service",
        text:
          "Maintain a 4.5+ review score.",
        unlocked:
          tradieReviews.length > 0 &&
          averageRating >= 4.5,
        progress:
          tradieReviews.length > 0
            ? Math.min(
                100,
                (averageRating / 4.5) *
                  100
              )
            : 0
      },
      {
        title: "Fast responder",
        text:
          "Average a response within one hour.",
        unlocked:
          responseTimes.length > 0 &&
          averageResponseMinutes <= 60,
        progress:
          responseTimes.length === 0
            ? 0
            : Math.min(
                100,
                (60 /
                  Math.max(
                    1,
                    averageResponseMinutes
                  )) *
                  100
              )
      },
      {
        title: "€10k won",
        text:
          "Reach €10,000 in accepted quote value.",
        unlocked:
          revenueWon >= 10000,
        progress: Math.min(
          100,
          (revenueWon / 10000) * 100
        )
      }
    ];

    return {
      myQuotes,
      acceptedQuotes,
      pendingQuotes,
      declinedQuotes,
      rescindedQuotes,
      cancelledQuotes,
      lostQuotes,
      winRate,
      revenueWon,
      pipelineValue,
      revenueLost,
      likelyRevenue,
      averageQuote,
      averageAcceptedQuote,
      averageLostQuote,
      highestAcceptedQuote,
      monthlyActivity,
      weekdayActivity,
      busiestMonth,
      quietestMonth,
      busiestDay,
      quietestDay,
      topCounty,
      topTrade,
      totalCustomers,
      repeatCustomers,
      repeatCustomerRate,
      acceptedJobs:
        acceptedJobs.length,
      completedJobs:
        completedJobs.length,
      averageRating,
      reviewCount:
        tradieReviews.length,
      averageResponseMinutes,
      fastestResponseMinutes,
      slowestResponseMinutes,
      responseSampleCount:
        responseTimes.length,
      quoteScore,
      reviewScore,
      completionScore,
      responseScore,
      profileScore,
      businessHealth,
      funnel,
      recommendations:
        recommendations.slice(0, 6),
      achievements
    };
  }, [
    myTradie,
    quotes,
    jobPosts,
    jobs,
    reviews,
    messages
  ]);

  const outcomeItems = [
    {
      label: "Accepted",
      value:
        analytics.acceptedQuotes.length,
      tone: "success"
    },
    {
      label: "Pending",
      value:
        analytics.pendingQuotes.length,
      tone: "warning"
    },
    {
      label: "Declined",
      value:
        analytics.declinedQuotes.length,
      tone: "danger"
    },
    {
      label: "Rescinded",
      value:
        analytics.rescindedQuotes.length,
      tone: "muted"
    },
    {
      label: "Cancelled",
      value:
        analytics.cancelledQuotes.length,
      tone: "danger"
    }
  ];

  const largestOutcome = Math.max(
    1,
    ...outcomeItems.map(
      (item) => item.value
    )
  );

  const funnelMaximum = Math.max(
    1,
    analytics.funnel.quoted
  );

  return (
    <section className="tradie-analytics-page">
      <header className="action-header analytics-page-header">
        <div>
          <span className="label">
            Business intelligence
          </span>

          <h1>Performance analytics</h1>

          <p>
            Understand revenue, quote success,
            customer behaviour and your busiest
            periods.
          </p>
        </div>

        <div className="analytics-header-actions">
          <button
            type="button"
            className="secondary"
            onClick={onBack}
          >
            Back to dashboard
          </button>

          <button
            type="button"
            className="primary"
            onClick={onViewQuotes}
          >
            View quotes
          </button>
        </div>
      </header>

      {!myTradie && (
        <section className="analytics-no-profile">
          <Activity size={28} />

          <div>
            <h2>
              Business profile required
            </h2>

            <p>
              Complete your tradesperson profile
              before analytics can be calculated.
            </p>
          </div>
        </section>
      )}
 
       <section className="analytics-health-card">
        <div>
          <span className="label">
            Business score
          </span>

          <strong>
            {Math.round(
              analytics.businessHealth
            )}{" "}
            / 100
          </strong>

          <p>
            Calculated from quote performance,
            customer reviews, completed work,
            response speed and profile quality.
          </p>
        </div>

        <div
          className="analytics-health-ring"
          style={{
            "--analytics-progress":
              `${analytics.businessHealth * 3.6}deg`
          }}
        >
          <span>
            {formatPercent(
              analytics.businessHealth
            )}
          </span>
        </div>
      </section>

      <section className="analytics-panel analytics-revenue-forecast">
        <div className="analytics-panel-heading">
          <div className="analytics-panel-icon">
            <TrendingUp />
          </div>

          <div>
            <h2>Revenue forecast</h2>
            <p>
              Compare confirmed, likely, pending and lost quote value.
            </p>
          </div>
        </div>

        <div className="analytics-forecast-grid">
          <article>
            <span>Revenue won</span>
            <strong>
              {formatCurrency(analytics.revenueWon)}
            </strong>
            <small>Accepted quote value</small>
          </article>

          <article>
            <span>Likely revenue</span>
            <strong>
              {formatCurrency(analytics.likelyRevenue)}
            </strong>
            <small>
              Estimated from pipeline and current win rate
            </small>
          </article>

          <article>
            <span>Potential pipeline</span>
            <strong>
              {formatCurrency(analytics.pipelineValue)}
            </strong>
            <small>All pending quote value</small>
          </article>

          <article>
            <span>Lost opportunities</span>
            <strong>
              {formatCurrency(analytics.revenueLost)}
            </strong>
            <small>Declined, rescinded or cancelled</small>
          </article>
        </div>

        {analytics.pipelineValue > 0 && analytics.winRate === 0 && (
          <div className="analytics-forecast-note">
            <Activity size={20} />

            <p>
              Likely revenue will become more accurate once you have
              accepted and declined quote history.
            </p>
          </div>
        )}
      </section>

      <div className="analytics-metric-grid">
        <AnalyticsMetric
          label="Revenue won"
          value={formatCurrency(
            analytics.revenueWon
          )}
          helper="Accepted quote value"
          icon={<CircleEuro />}
          tone="success"
        />

        <AnalyticsMetric
          label="Pipeline"
          value={formatCurrency(
            analytics.pipelineValue
          )}
          helper="Pending quote value"
          icon={<TrendingUp />}
          tone="warning"
        />

        <AnalyticsMetric
          label="Lost value"
          value={formatCurrency(
            analytics.revenueLost
          )}
          helper="Declined, rescinded or cancelled"
          icon={<TrendingDown />}
          tone="danger"
        />

        <AnalyticsMetric
          label="Win rate"
          value={formatPercent(
            analytics.winRate
          )}
          helper="Accepted versus decided quotes"
          icon={<Target />}
          tone="info"
        />

        <AnalyticsMetric
          label="Average response"
          value={formatDuration(
            analytics.averageResponseMinutes
          )}
          helper={
            analytics.responseSampleCount > 0
              ? `${analytics.responseSampleCount} measured replies`
              : "Not enough message history"
          }
          icon={<MessageCircle />}
          tone="info"
        />

        <AnalyticsMetric
          label="Repeat customers"
          value={
            analytics.repeatCustomers
          }
          helper={`${formatPercent(
            analytics.repeatCustomerRate
          )} repeat rate`}
          icon={<Repeat2 />}
          tone="success"
        />
      </div>

      <div className="analytics-two-column">
        <section className="analytics-panel">
          <div className="analytics-panel-heading">
            <div className="analytics-panel-icon">
              <BarChart3 />
            </div>

            <div>
              <h2>Quote outcomes</h2>
              <p>
                Compare wins, pending work and
                lost opportunities.
              </p>
            </div>
          </div>

          <div className="analytics-outcomes">
            {outcomeItems.map((item) => (
              <div
                className="analytics-outcome-row"
                key={item.label}
              >
                <div>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>

                <div className="analytics-outcome-track">
                  <span
                    className={`analytics-outcome-${item.tone}`}
                    style={{
                      width: `${
                        (item.value /
                          largestOutcome) *
                        100
                      }%`
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="analytics-panel">
          <div className="analytics-panel-heading">
            <div className="analytics-panel-icon">
              <CircleEuro />
            </div>

            <div>
              <h2>Quote values</h2>
              <p>
                Compare typical winning and
                losing quote values.
              </p>
            </div>
          </div>

          <div className="analytics-value-list">
            <div>
              <span>Average quote</span>
              <strong>
                {formatCurrency(
                  analytics.averageQuote
                )}
              </strong>
            </div>

            <div>
              <span>
                Average accepted quote
              </span>
              <strong>
                {formatCurrency(
                  analytics.averageAcceptedQuote
                )}
              </strong>
            </div>

            <div>
              <span>
                Average lost quote
              </span>
              <strong>
                {formatCurrency(
                  analytics.averageLostQuote
                )}
              </strong>
            </div>

            <div>
              <span>
                Highest accepted quote
              </span>
              <strong>
                {formatCurrency(
                  analytics.highestAcceptedQuote
                )}
              </strong>
            </div>
          </div>
        </section>
      </div>

      <section className="analytics-panel analytics-funnel-panel">
        <div className="analytics-panel-heading">
          <div className="analytics-panel-icon">
            <Target />
          </div>

          <div>
            <h2>Conversion funnel</h2>
            <p>
              See how marketplace opportunities
              progress into completed and reviewed
              work.
            </p>
          </div>
        </div>

        <div className="analytics-funnel">
          <FunnelStep
            label="Quotes submitted"
            value={analytics.funnel.quoted}
            maximum={funnelMaximum}
            helper="All recorded quote opportunities"
          />

          <FunnelStep
            label="Quotes accepted"
            value={analytics.funnel.accepted}
            maximum={funnelMaximum}
            helper="Customers who selected your quote"
          />

          <FunnelStep
            label="Jobs completed"
            value={analytics.funnel.completed}
            maximum={funnelMaximum}
            helper="Work marked completed or reviewed"
          />

          <FunnelStep
            label="Customers reviewed"
            value={analytics.funnel.reviewed}
            maximum={funnelMaximum}
            helper="Unique customers who left feedback"
          />
        </div>
      </section>

      <div className="analytics-two-column">
        <ActivityBars
          title="Monthly activity"
          subtitle="Quotes submitted during each month."
          icon={<CalendarDays />}
          items={analytics.monthlyActivity}
        />

        <ActivityBars
          title="Weekly activity"
          subtitle="Identify your busiest and quietest weekdays."
          icon={<Clock3 />}
          items={analytics.weekdayActivity}
        />
      </div>

      <div className="analytics-two-column">
        <section className="analytics-panel">
          <div className="analytics-panel-heading">
            <div className="analytics-panel-icon">
              <Activity />
            </div>

            <div>
              <h2>Business score factors</h2>
              <p>
                See what currently contributes
                to your score.
              </p>
            </div>
          </div>

          <div className="analytics-score-grid">
            <ScoreFactor
              label="Quote success"
              value={analytics.quoteScore}
              helper="Based on accepted versus declined quotes."
              tone="orange"
            />

            <ScoreFactor
              label="Customer reviews"
              value={analytics.reviewScore}
              helper="Based on your average rating."
              tone="success"
            />

            <ScoreFactor
              label="Job completion"
              value={analytics.completionScore}
              helper="Based on accepted work marked completed."
              tone="info"
            />

            <ScoreFactor
              label="Response speed"
              value={analytics.responseScore}
              helper="Based on measured customer reply times."
              tone="warning"
            />

            <ScoreFactor
              label="Profile strength"
              value={analytics.profileScore}
              helper="Based on key business profile information."
              tone="purple"
            />
          </div>
        </section>

        <section className="analytics-panel">
          <div className="analytics-panel-heading">
            <div className="analytics-panel-icon">
              <MessageCircle />
            </div>

            <div>
              <h2>Response performance</h2>
              <p>
                Measured from customer messages
                followed by your replies.
              </p>
            </div>
          </div>

          <div className="analytics-value-list">
            <div>
              <span>Average response</span>
              <strong>
                {formatDuration(
                  analytics.averageResponseMinutes
                )}
              </strong>
            </div>

            <div>
              <span>Fastest response</span>
              <strong>
                {formatDuration(
                  analytics.fastestResponseMinutes
                )}
              </strong>
            </div>

            <div>
              <span>Slowest response</span>
              <strong>
                {formatDuration(
                  analytics.slowestResponseMinutes
                )}
              </strong>
            </div>

            <div>
              <span>Measured replies</span>
              <strong>
                {analytics.responseSampleCount}
              </strong>
            </div>
          </div>
        </section>
      </div>

      <section className="analytics-insights-panel">
        <div className="analytics-panel-heading">
          <div className="analytics-panel-icon">
            <Activity />
          </div>

          <div>
            <h2>Business insights</h2>
            <p>
              Recommendations calculated from
              your current marketplace activity.
            </p>
          </div>
        </div>

        <div className="analytics-recommendation-grid">
          {analytics.recommendations.map(
            (recommendation, index) => (
              <article
                className={`analytics-recommendation analytics-recommendation-${recommendation.tone}`}
                key={`${recommendation.title}-${index}`}
              >
                <div className="analytics-recommendation-icon">
                  {recommendation.tone ===
                  "success" ? (
                    <TrendingUp />
                  ) : recommendation.tone ===
                    "danger" ? (
                    <TrendingDown />
                  ) : (
                    <Activity />
                  )}
                </div>

                <div>
                  <strong>
                    {recommendation.title}
                  </strong>

                  <p>{recommendation.text}</p>
                </div>
              </article>
            )
          )}
        </div>
      </section>

      <section className="analytics-insights-panel">
        <div className="analytics-panel-heading">
          <div className="analytics-panel-icon">
            <Award />
          </div>

          <div>
            <h2>Achievements</h2>
            <p>
              Milestones earned through activity,
              service and business growth.
            </p>
          </div>
        </div>

        <div className="analytics-achievement-grid">
          {analytics.achievements.map(
            (achievement) => (
              <article
                className={`analytics-achievement ${
                  achievement.unlocked
                    ? "unlocked"
                    : ""
                }`}
                key={achievement.title}
              >
                <div className="analytics-achievement-icon">
                  {achievement.unlocked ? (
                    <Award />
                  ) : (
                    <Target />
                  )}
                </div>

                <strong>
                  {achievement.title}
                </strong>

                <p>{achievement.text}</p>

                <div className="analytics-achievement-track">
                  <span
                    style={{
                      width: `${achievement.progress}%`
                    }}
                  />
                </div>

                <small>
                  {achievement.unlocked
                    ? "Unlocked"
                    : `${Math.round(
                        achievement.progress
                      )}% complete`}
                </small>
              </article>
            )
          )}
        </div>
      </section>

      <section className="analytics-insights-panel">
        <div className="analytics-panel-heading">
          <div className="analytics-panel-icon">
            <BriefcaseBusiness />
          </div>

          <div>
            <h2>Activity summary</h2>
            <p>
              Your busiest periods, locations
              and customer activity.
            </p>
          </div>
        </div>

        <div className="analytics-insight-grid">
          <article>
            <CalendarDays />
            <span>Busiest month</span>
            <strong>
              {analytics.busiestMonth.label}
            </strong>
            <small>
              {analytics.busiestMonth.value} quotes
            </small>
          </article>

          <article>
            <CalendarDays />
            <span>Quietest active month</span>
            <strong>
              {analytics.quietestMonth.label}
            </strong>
            <small>
              {analytics.quietestMonth.value} quotes
            </small>
          </article>

          <article>
            <Clock3 />
            <span>Busiest weekday</span>
            <strong>
              {analytics.busiestDay.label}
            </strong>
            <small>
              {analytics.busiestDay.value} quotes
            </small>
          </article>

          <article>
            <Clock3 />
            <span>Quietest active day</span>
            <strong>
              {analytics.quietestDay.label}
            </strong>
            <small>
              {analytics.quietestDay.value} quotes
            </small>
          </article>

          <article>
            <MapPin />
            <span>Most active county</span>
            <strong>
              {analytics.topCounty.label}
            </strong>
            <small>
              {analytics.topCounty.value} quotes
            </small>
          </article>

          <article>
            <BriefcaseBusiness />
            <span>Top trade</span>
            <strong>
              {analytics.topTrade.label}
            </strong>
            <small>
              {analytics.topTrade.value} quotes
            </small>
          </article>

          <article>
            <Users />
            <span>Unique customers</span>
            <strong>
              {analytics.totalCustomers}
            </strong>
            <small>
              Accepted quote customers
            </small>
          </article>

          <article>
            <Repeat2 />
            <span>Repeat rate</span>
            <strong>
              {formatPercent(
                analytics.repeatCustomerRate
              )}
            </strong>
            <small>
              Customers returning for more work
            </small>
          </article>
        </div>
      </section>

      <section className="analytics-review-summary">
        <div>
          <span className="label">
            Customer reputation
          </span>

          <h2>
            {analytics.reviewCount > 0
              ? `${analytics.averageRating.toFixed(
                  1
                )} / 5`
              : "No reviews yet"}
          </h2>

          <p>
            Based on {analytics.reviewCount}{" "}
            {analytics.reviewCount === 1
              ? "customer review"
              : "customer reviews"}.
          </p>
        </div>

        <div className="analytics-review-icon">
          {analytics.reviewCount > 0 ? (
            <Star />
          ) : (
            <CheckCircle />
          )}
        </div>
      </section>
    </section>
  );
}