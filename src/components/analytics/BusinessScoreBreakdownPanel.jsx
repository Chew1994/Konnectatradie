import React from "react";
import {
  Award,
  Clock3,
  FileText,
  MessageCircle,
  Star
} from "lucide-react";
function buildRecommendations(analytics) {
  const factorCount =
    analytics.responseSampleCount > 0
      ? 5
      : 4;

  const items = [];

  function addRecommendation({
    title,
    score,
    helper
  }) {
    const safeScore = Math.max(
      0,
      Math.min(100, Number(score) || 0)
    );

    if (safeScore >= 100) return;

    const estimatedImpact =
      (100 - safeScore) / factorCount;

    items.push({
      title,
      helper,
      score: safeScore,
      points: Math.max(
        1,
        Math.round(estimatedImpact)
      )
    });
  }

  addRecommendation({
    title: "Get more customer reviews",
    score: analytics.reviewScore,
    helper:
      "Ask customers to leave feedback after completed work."
  });

  addRecommendation({
    title: "Complete your business profile",
    score: analytics.profileScore,
    helper:
      "Add any missing profile, contact, insurance or business information."
  });

  if (analytics.responseSampleCount > 0) {
    addRecommendation({
      title: "Respond to enquiries faster",
      score: analytics.responseScore,
      helper:
        "Quicker replies can improve customer confidence and conversion."
    });
  } else {
    items.push({
      title: "Build your response history",
      helper:
        "Reply to customer messages through KonnectaTradie so response performance can be measured.",
      score: 0,
      points: 0
    });
  }

  addRecommendation({
    title: "Increase your quote win rate",
    score: analytics.quoteScore,
    helper:
      "Review pricing, quote clarity and follow up pending opportunities."
  });

  addRecommendation({
    title: "Complete more accepted jobs",
    score: analytics.completionScore,
    helper:
      "Mark accepted work completed so your completion performance is recorded."
  });

return items
  .sort((a, b) => b.points - a.points)
  .slice(0, 3);
}

function ScoreRow({
  icon,
  label,
  score
}) {
  const safeScore = Math.max(
    0,
    Math.min(100, Number(score) || 0)
  );

  return (
    <div className="analytics-score-row">
      <div className="analytics-score-info">
        <div>
          <div className="analytics-score-icon">
            {icon}
          </div>

          <strong>{label}</strong>
        </div>

        <small>
          {Math.round(safeScore)}%
        </small>
      </div>

      <div className="analytics-score-bar">
        <span
          style={{
            width: `${safeScore}%`
          }}
        />
      </div>
    </div>
  );
}

export default function BusinessScoreBreakdownPanel({
  analytics
}) {
  if (!analytics) return null;

  const recommendations =
  buildRecommendations(analytics);

  return (
    <section className="analytics-panel">
      <div className="analytics-panel-heading">
        <div className="analytics-panel-icon">
          <Award />
        </div>

        <div>
          <h2>Business score breakdown</h2>

          <p>
            See exactly how your overall
            business score is calculated.
          </p>
        </div>
      </div>

      <div className="analytics-score-list">
        <ScoreRow
          icon={<FileText size={18} />}
          label="Profile quality"
          score={analytics.profileScore}
        />

        <ScoreRow
          icon={<Star size={18} />}
          label="Customer reviews"
          score={analytics.reviewScore}
        />

        <ScoreRow
          icon={<Clock3 size={18} />}
          label="Response speed"
          score={analytics.responseScore}
        />

        <ScoreRow
          icon={<MessageCircle size={18} />}
          label="Quote performance"
          score={analytics.quoteScore}
        />

        <ScoreRow
          icon={<Award size={18} />}
          label="Completed work"
          score={analytics.completionScore}
        />
      </div>

<div className="analytics-score-total">
  <strong>
    Overall Business Score
  </strong>

  <span>
    {Math.round(
      analytics.businessHealth
    )}
    /100
  </span>
</div>

<div className="analytics-score-recommendations">
  <h3>
    Highest impact improvements
  </h3>

  {recommendations.length === 0 ? (
    <p>
      Excellent work! Your business score
      is already performing strongly.
    </p>
  ) : (
    <ul>
      {recommendations.map((item) => (
        <li key={item.title}>
          <strong>{item.title}</strong>

          <span>
            Estimated improvement:
            {" "}
            +{item.points}
          </span>
        </li>
      ))}
    </ul>
  )}
</div>
    </section>
  );
}