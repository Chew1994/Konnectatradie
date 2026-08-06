import React from "react";

export default function BusinessHealthPanel({
  businessHealth,
  formatPercent
}) {
  return (
    <section className="analytics-health-card">
      <div>
        <span className="label">
          Business score
        </span>

        <strong>
          {Math.round(businessHealth)} / 100
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
            `${businessHealth * 3.6}deg`
        }}
      >
        <span>
          {formatPercent(businessHealth)}
        </span>
      </div>
    </section>
  );
}