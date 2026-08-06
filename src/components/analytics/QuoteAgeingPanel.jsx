import React, { useMemo } from "react";
import {
  ArrowRight,
  Clock3,
  CircleEuro,
  MessageCircle
} from "lucide-react";

const AGE_BUCKETS = [
  {
    key: "fresh",
    label: "Under 24 hours",
    description: "Recently submitted",
    minimumDays: 0,
    maximumDays: 1
  },
  {
    key: "watch",
    label: "1–3 days",
    description: "Monitor for a response",
    minimumDays: 1,
    maximumDays: 4
  },
  {
    key: "follow-up",
    label: "4–7 days",
    description: "Consider following up",
    minimumDays: 4,
    maximumDays: 8
  },
  {
    key: "overdue",
    label: "Over 7 days",
    description: "Priority follow-up",
    minimumDays: 8,
    maximumDays: Number.POSITIVE_INFINITY
  }
];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(safeNumber(value));
}

function getQuoteAgeDays(createdAt) {
  if (!createdAt) return 0;

  const createdDate = new Date(createdAt);

  if (Number.isNaN(createdDate.getTime())) {
    return 0;
  }

  const difference =
    Date.now() - createdDate.getTime();

  return Math.max(
    0,
    difference / (1000 * 60 * 60 * 24)
  );
}

function formatAge(days) {
  if (days < 1) {
    const hours = Math.max(1, Math.floor(days * 24));

    return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  }

  const roundedDays = Math.floor(days);

  return `${roundedDays} ${
    roundedDays === 1 ? "day" : "days"
  }`;
}

export default function QuoteAgeingPanel({
  pendingQuotes = [],
  jobPosts = [],
  onOpenJob,
  onViewQuotes
}) {
  const ageing = useMemo(() => {
    const safeQuotes = safeArray(pendingQuotes);
    const safePosts = safeArray(jobPosts);

    const postMap = new Map(
      safePosts
        .filter((post) => post?.id)
        .map((post) => [String(post.id), post])
    );

    const enrichedQuotes = safeQuotes
      .map((quote) => {
        const ageDays = getQuoteAgeDays(
          quote?.created_at
        );

        return {
          quote,
          ageDays,
          jobPost: postMap.get(
            String(quote?.job_post_id || "")
          )
        };
      })
      .sort(
        (first, second) =>
          second.ageDays - first.ageDays
      );

    const buckets = AGE_BUCKETS.map((bucket) => {
      const quotes = enrichedQuotes.filter(
        ({ ageDays }) =>
          ageDays >= bucket.minimumDays &&
          ageDays < bucket.maximumDays
      );

      return {
        ...bucket,
        quotes,
        count: quotes.length,
        totalValue: quotes.reduce(
          (total, item) =>
            total +
            safeNumber(item.quote?.price_eur),
          0
        ),
        averageAge:
          quotes.length > 0
            ? quotes.reduce(
                (total, item) =>
                  total + item.ageDays,
                0
              ) / quotes.length
            : 0
      };
    });

    return {
      buckets,
      priorityQuotes: enrichedQuotes
        .filter(({ ageDays }) => ageDays >= 4)
        .slice(0, 5),
      oldestQuote: enrichedQuotes[0] || null,
      pendingValue: enrichedQuotes.reduce(
        (total, item) =>
          total +
          safeNumber(item.quote?.price_eur),
        0
      )
    };
  }, [pendingQuotes, jobPosts]);

  return (
    <section className="analytics-panel quote-ageing-panel">
      <div className="analytics-panel-heading">
        <div className="analytics-panel-icon">
          <Clock3 />
        </div>

        <div>
          <h2>Quote ageing</h2>

          <p>
            Identify pending quotes that may need a customer
            follow-up.
          </p>
        </div>
      </div>

      <div className="quote-ageing-summary">
        <div>
          <span>Pending quotes</span>
          <strong>{pendingQuotes.length}</strong>
        </div>

        <div>
          <span>Pending value</span>
          <strong>
            {formatCurrency(ageing.pendingValue)}
          </strong>
        </div>

        <div>
          <span>Oldest pending</span>
          <strong>
            {ageing.oldestQuote
              ? formatAge(ageing.oldestQuote.ageDays)
              : "No pending quotes"}
          </strong>
        </div>
      </div>

      <div className="quote-ageing-buckets">
        {ageing.buckets.map((bucket) => (
          <article
            className={`quote-ageing-bucket quote-ageing-${bucket.key}`}
            key={bucket.key}
          >
            <div className="quote-ageing-bucket-heading">
              <div>
                <strong>{bucket.label}</strong>
                <span>{bucket.description}</span>
              </div>

              <b>{bucket.count}</b>
            </div>

            <div className="quote-ageing-bucket-value">
              <CircleEuro size={17} />

              <span>
                {formatCurrency(bucket.totalValue)}
              </span>
            </div>

            <small>
              {bucket.count > 0
                ? `Average age ${formatAge(
                    bucket.averageAge
                  )}`
                : "No quotes in this group"}
            </small>
          </article>
        ))}
      </div>

      <div className="quote-follow-up-heading">
        <div>
          <h3>Follow-up priorities</h3>

          <p>
            Pending quotes older than four days appear here.
          </p>
        </div>

        <button
          type="button"
          className="secondary small-btn"
          onClick={onViewQuotes}
        >
          View all quotes
        </button>
      </div>

      {ageing.priorityQuotes.length === 0 ? (
        <div className="quote-follow-up-empty">
          <Clock3 size={24} />

          <div>
            <strong>No overdue follow-ups</strong>

            <p>
              Your pending quotes are currently less than four
              days old.
            </p>
          </div>
        </div>
      ) : (
        <div className="quote-follow-up-list">
          {ageing.priorityQuotes.map(
            ({ quote, jobPost, ageDays }) => (
              <article
                className="quote-follow-up-card"
                key={quote.id}
              >
                <div className="quote-follow-up-icon">
                  <MessageCircle size={20} />
                </div>

                <div className="quote-follow-up-copy">
                  <div>
                    <strong>
                      {jobPost?.job_title ||
                        "Job quote"}
                    </strong>

                    <span>
                      {[
                        jobPost?.trade,
                        jobPost?.county
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>

                  <div className="quote-follow-up-meta">
                    <span>
                      {formatCurrency(
                        quote?.price_eur
                      )}
                    </span>

                    <span>
                      Waiting {formatAge(ageDays)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="secondary small-btn"
                  disabled={!jobPost}
                  onClick={() =>
                    jobPost && onOpenJob?.(jobPost)
                  }
                >
                  Open
                  <ArrowRight size={16} />
                </button>
              </article>
            )
          )}
        </div>
      )}
    </section>
  );
}