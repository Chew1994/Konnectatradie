import React, { useMemo } from "react";
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle,
  CircleEuro,
  Clock3,
  MessageCircle,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  UserRoundCheck
} from "lucide-react";

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

function formatPercent(value) {
  return `${Math.round(safeNumber(value))}%`;
}

function formatDuration(minutes) {
  const value = Math.max(
    0,
    Math.round(safeNumber(minutes))
  );

  if (value === 0) {
    return "No response data";
  }

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

function getPriorityRank(priority) {
  const ranks = {
    high: 3,
    medium: 2,
    low: 1
  };

  return ranks[priority] || 0;
}

function getCoachIcon(type) {
  switch (type) {
    case "pipeline":
      return <CircleEuro size={21} />;

    case "response":
      return <Clock3 size={21} />;

    case "conversion":
      return <Target size={21} />;

    case "reviews":
      return <Star size={21} />;

    case "profile":
      return <UserRoundCheck size={21} />;

    case "pricing":
      return <TrendingDown size={21} />;

    case "growth":
      return <TrendingUp size={21} />;

    case "activity":
      return <BriefcaseBusiness size={21} />;

    default:
      return <Activity size={21} />;
  }
}

function CoachCard({
  recommendation,
  onViewQuotes,
  onOpenDashboard
}) {
  function runAction() {
    if (recommendation.action === "quotes") {
      onViewQuotes?.();
      return;
    }

    if (recommendation.action === "dashboard") {
      onOpenDashboard?.();
    }
  }

  return (
    <article
      className={`business-coach-card business-coach-${recommendation.priority}`}
    >
      <div className="business-coach-card-icon">
        {getCoachIcon(recommendation.type)}
      </div>

      <div className="business-coach-card-copy">
        <div className="business-coach-card-top">
          <span
            className={`business-coach-priority business-coach-priority-${recommendation.priority}`}
          >
            {recommendation.priority} priority
          </span>

          {recommendation.metric && (
            <strong>{recommendation.metric}</strong>
          )}
        </div>

        <h3>{recommendation.title}</h3>

        <p>{recommendation.text}</p>

        {recommendation.actionLabel && (
          <button
            type="button"
            className="secondary small-btn business-coach-action"
            onClick={runAction}
          >
            {recommendation.actionLabel}
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    </article>
  );
}

export default function BusinessCoachPanel({
  analytics,
  onViewQuotes,
  onOpenDashboard
}) {
  const recommendations = useMemo(() => {
    if (!analytics) {
      return [];
    }

    const items = [];

    const pendingQuoteCount =
      analytics.pendingQuotes?.length || 0;

    const acceptedQuoteCount =
      analytics.acceptedQuotes?.length || 0;

    const totalQuoteCount =
      analytics.myQuotes?.length || 0;

    const pipelineValue = safeNumber(
      analytics.pipelineValue
    );

    const revenueLost = safeNumber(
      analytics.revenueLost
    );

    const winRate = safeNumber(
      analytics.winRate
    );

    const averageResponseMinutes =
      safeNumber(
        analytics.averageResponseMinutes
      );

    const responseSampleCount =
      safeNumber(
        analytics.responseSampleCount
      );

    const profileScore = safeNumber(
      analytics.profileScore
    );

    const reviewCount = safeNumber(
      analytics.reviewCount
    );

    const averageRating = safeNumber(
      analytics.averageRating
    );

    const repeatCustomerRate =
      safeNumber(
        analytics.repeatCustomerRate
      );

    const averageQuote = safeNumber(
      analytics.averageQuote
    );

    const averageAcceptedQuote =
      safeNumber(
        analytics.averageAcceptedQuote
      );

    const averageLostQuote =
      safeNumber(
        analytics.averageLostQuote
      );

    const businessHealth =
      safeNumber(
        analytics.businessHealth
      );

    if (pendingQuoteCount > 0) {
      items.push({
        id: "pending-pipeline",
        type: "pipeline",
        priority:
          pendingQuoteCount >= 4 ||
          pipelineValue >= 3000
            ? "high"
            : "medium",
        title: "Follow up open opportunities",
        text:
          `You have ${pendingQuoteCount} pending ${
            pendingQuoteCount === 1
              ? "quote"
              : "quotes"
          } worth ${formatCurrency(
            pipelineValue
          )}. Review the oldest opportunities and follow up while the work is still active.`,
        metric: formatCurrency(
          pipelineValue
        ),
        action: "quotes",
        actionLabel: "Review pending quotes"
      });
    }

    if (
      totalQuoteCount >= 3 &&
      acceptedQuoteCount === 0
    ) {
      items.push({
        id: "first-win",
        type: "conversion",
        priority: "high",
        title: "Focus on winning your first quote",
        text:
          `You have submitted ${totalQuoteCount} quotes without an acceptance yet. Review your pricing, explain what is included clearly and follow up after a few days.`,
        metric: formatPercent(winRate),
        action: "quotes",
        actionLabel: "Review quote history"
      });
    } else if (
      totalQuoteCount >= 3 &&
      winRate < 30
    ) {
      items.push({
        id: "low-win-rate",
        type: "conversion",
        priority: "high",
        title: "Your quote conversion needs attention",
        text:
          `Your current win rate is ${formatPercent(
            winRate
          )}. Compare accepted and lost quote values and improve the clarity of your quote messages.`,
        metric: formatPercent(winRate),
        action: "quotes",
        actionLabel: "Inspect your quotes"
      });
    } else if (
      totalQuoteCount >= 3 &&
      winRate >= 70
    ) {
      items.push({
        id: "strong-win-rate",
        type: "growth",
        priority: "low",
        title: "Your quote performance is strong",
        text:
          `You are winning ${formatPercent(
            winRate
          )} of decided quotes. Keep using the same pricing and communication approach.`,
        metric: formatPercent(winRate)
      });
    }

    if (
      responseSampleCount > 0 &&
      averageResponseMinutes > 1440
    ) {
      items.push({
        id: "slow-response-high",
        type: "response",
        priority: "high",
        title: "Customers are waiting too long",
        text:
          `Your average measured response time is ${formatDuration(
            averageResponseMinutes
          )}. Aim to reply within the same day to improve customer confidence and quote conversion.`,
        metric: formatDuration(
          averageResponseMinutes
        ),
        action: "dashboard",
        actionLabel: "Open dashboard"
      });
    } else if (
      responseSampleCount > 0 &&
      averageResponseMinutes > 180
    ) {
      items.push({
        id: "slow-response-medium",
        type: "response",
        priority: "medium",
        title: "Improve your response speed",
        text:
          `Your average measured response time is ${formatDuration(
            averageResponseMinutes
          )}. Quicker replies may help you secure work before competing tradespeople respond.`,
        metric: formatDuration(
          averageResponseMinutes
        ),
        action: "dashboard",
        actionLabel: "Check new activity"
      });
    } else if (
      responseSampleCount > 0 &&
      averageResponseMinutes <= 60
    ) {
      items.push({
        id: "fast-response",
        type: "response",
        priority: "low",
        title: "You are responding quickly",
        text:
          `Your average response time is ${formatDuration(
            averageResponseMinutes
          )}. Maintaining this standard can strengthen customer trust.`,
        metric: formatDuration(
          averageResponseMinutes
        )
      });
    }

    if (responseSampleCount === 0) {
      items.push({
        id: "response-data",
        type: "response",
        priority: "low",
        title: "Build your response history",
        text:
          "Reply to customer messages through KonnectaTradie so your response performance can be measured accurately.",
        metric: "No data",
        action: "dashboard",
        actionLabel: "Open dashboard"
      });
    }

    if (reviewCount === 0) {
      items.push({
        id: "no-reviews",
        type: "reviews",
        priority: "medium",
        title: "Build your customer reputation",
        text:
          "You have no customer reviews yet. Ask customers to leave feedback once work has been completed.",
        metric: "0 reviews",
        action: "dashboard",
        actionLabel: "View completed work"
      });
    } else if (
      reviewCount >= 3 &&
      averageRating < 4
    ) {
      items.push({
        id: "review-score",
        type: "reviews",
        priority: "high",
        title: "Review customer feedback",
        text:
          `Your average rating is ${averageRating.toFixed(
            1
          )} out of 5. Look for repeated issues in customer comments and address them.`,
        metric: `${averageRating.toFixed(
          1
        )} / 5`
      });
    } else if (
      reviewCount >= 3 &&
      averageRating >= 4.5
    ) {
      items.push({
        id: "strong-reviews",
        type: "reviews",
        priority: "low",
        title: "Your customer reputation is strong",
        text:
          `You have an average rating of ${averageRating.toFixed(
            1
          )} from ${reviewCount} reviews. Keep asking satisfied customers for feedback.`,
        metric: `${averageRating.toFixed(
          1
        )} / 5`
      });
    }

    if (profileScore < 70) {
      items.push({
        id: "profile-incomplete",
        type: "profile",
        priority: "high",
        title: "Complete your business profile",
        text:
          `Your profile strength is ${formatPercent(
            profileScore
          )}. Add missing business details, insurance information, a bio and portfolio photos.`,
        metric: formatPercent(
          profileScore
        ),
        action: "dashboard",
        actionLabel: "Complete profile"
      });
    } else if (profileScore < 100) {
      items.push({
        id: "profile-improvement",
        type: "profile",
        priority: "medium",
        title: "Finish strengthening your profile",
        text:
          `Your profile is ${formatPercent(
            profileScore
          )} complete. Finishing the remaining details can make your business look more trustworthy.`,
        metric: formatPercent(
          profileScore
        ),
        action: "dashboard",
        actionLabel: "Update profile"
      });
    } else {
      items.push({
        id: "profile-complete",
        type: "profile",
        priority: "low",
        title: "Your business profile is complete",
        text:
          "Your key business information is complete. Keep portfolio photos and availability up to date.",
        metric: "100%"
      });
    }

    if (
      averageAcceptedQuote > 0 &&
      averageLostQuote >
        averageAcceptedQuote * 1.2
    ) {
      items.push({
        id: "pricing-high",
        type: "pricing",
        priority: "medium",
        title: "Higher-value quotes are being lost",
        text:
          `Your average lost quote is ${formatCurrency(
            averageLostQuote
          )}, compared with ${formatCurrency(
            averageAcceptedQuote
          )} for accepted work. Explain premium costs clearly or review pricing on larger jobs.`,
        metric: formatCurrency(
          averageLostQuote
        ),
        action: "quotes",
        actionLabel: "Compare quote values"
      });
    }

    if (
      revenueLost >= 1000 &&
      revenueLost > pipelineValue
    ) {
      items.push({
        id: "lost-value",
        type: "pricing",
        priority: "medium",
        title: "Lost opportunities exceed your pipeline",
        text:
          `You have ${formatCurrency(
            revenueLost
          )} in lost quote value. Review why customers declined, cancelled or did not proceed.`,
        metric: formatCurrency(
          revenueLost
        ),
        action: "quotes",
        actionLabel: "Review lost quotes"
      });
    }

    if (
      repeatCustomerRate >= 25
    ) {
      items.push({
        id: "repeat-customers",
        type: "growth",
        priority: "low",
        title: "Customers are returning",
        text:
          `${formatPercent(
            repeatCustomerRate
          )} of customers with accepted quotes have returned. Consider asking them for referrals or additional reviews.`,
        metric: formatPercent(
          repeatCustomerRate
        )
      });
    }

    if (
      analytics.busiestMonth?.value > 0
    ) {
      items.push({
        id: "busiest-month",
        type: "activity",
        priority: "low",
        title:
          `${analytics.busiestMonth.label} is your busiest month`,
        text:
          `You submitted ${analytics.busiestMonth.value} quotes during ${analytics.busiestMonth.label}. Plan availability and profile updates before this period.`,
        metric:
          `${analytics.busiestMonth.value} quotes`
      });
    }

    if (
      analytics.quietestDay?.value > 0
    ) {
      items.push({
        id: "quiet-day",
        type: "activity",
        priority: "low",
        title:
          `${analytics.quietestDay.label} is your quietest active day`,
        text:
          "Consider using quieter days for follow-ups, profile updates, invoicing or promoting availability.",
        metric:
          `${analytics.quietestDay.value} quotes`
      });
    }

    if (
      businessHealth < 40
    ) {
      items.push({
        id: "business-health-low",
        type: "growth",
        priority: "high",
        title: "Your Business Score needs attention",
        text:
          `Your current Business Score is ${Math.round(
            businessHealth
          )} out of 100. Focus first on profile quality, response speed, reviews and quote follow-ups.`,
        metric: `${Math.round(
          businessHealth
        )} / 100`
      });
    } else if (
      businessHealth >= 75
    ) {
      items.push({
        id: "business-health-strong",
        type: "growth",
        priority: "low",
        title: "Your business fundamentals are strong",
        text:
          `Your Business Score is ${Math.round(
            businessHealth
          )} out of 100. Continue improving reviews, completed work and customer retention.`,
        metric: `${Math.round(
          businessHealth
        )} / 100`
      });
    }

    if (
      items.length === 0
    ) {
      items.push({
        id: "keep-building",
        type: "growth",
        priority: "low",
        title: "Keep building marketplace activity",
        text:
          "Submit more quotes, reply to customers and complete jobs to unlock more detailed business coaching.",
        metric: formatCurrency(
          averageQuote
        )
      });
    }

    return items
      .sort(
        (first, second) =>
          getPriorityRank(
            second.priority
          ) -
          getPriorityRank(
            first.priority
          )
      )
      .slice(0, 8);
  }, [analytics]);

  const highPriorityCount =
    recommendations.filter(
      (item) => item.priority === "high"
    ).length;

  const mediumPriorityCount =
    recommendations.filter(
      (item) => item.priority === "medium"
    ).length;

  const lowPriorityCount =
    recommendations.filter(
      (item) => item.priority === "low"
    ).length;

  return (
    <section className="analytics-panel business-coach-panel">
      <div className="analytics-panel-heading business-coach-heading">
        <div className="analytics-panel-icon">
          <Activity />
        </div>

        <div>
          <span className="label">
            Business coach
          </span>

          <h2>Recommended next actions</h2>

          <p>
            Practical guidance calculated from your current
            marketplace activity.
          </p>
        </div>
      </div>

      <div className="business-coach-summary">
        <article>
          <TrendingDown size={19} />
          <span>High priority</span>
          <strong>{highPriorityCount}</strong>
        </article>

        <article>
          <Target size={19} />
          <span>Medium priority</span>
          <strong>{mediumPriorityCount}</strong>
        </article>

        <article>
          <CheckCircle size={19} />
          <span>Positive signals</span>
          <strong>{lowPriorityCount}</strong>
        </article>
      </div>

      <div className="business-coach-grid">
        {recommendations.map(
          (recommendation) => (
            <CoachCard
              key={recommendation.id}
              recommendation={
                recommendation
              }
              onViewQuotes={
                onViewQuotes
              }
              onOpenDashboard={
                onOpenDashboard
              }
            />
          )
        )}
      </div>
    </section>
  );
}