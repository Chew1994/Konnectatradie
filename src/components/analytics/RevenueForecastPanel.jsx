import React from "react";
import { Activity, TrendingUp } from "lucide-react";

export default function RevenueForecastPanel({
  analytics,
  formatCurrency
}) {
  return (
    <section className="analytics-panel analytics-revenue-forecast">
      <div className="analytics-panel-heading">
        <div className="analytics-panel-icon">
          <TrendingUp />
        </div>

        <div>
          <h2>Revenue forecast</h2>

          <p>
            Compare confirmed, likely,
            pending and lost quote value.
          </p>
        </div>
      </div>

      <div className="analytics-forecast-grid">
        <article>
          <span>Revenue won</span>

          <strong>
            {formatCurrency(
              analytics.revenueWon
            )}
          </strong>

          <small>
            Accepted quote value
          </small>
        </article>

        <article>
          <span>Likely revenue</span>

          <strong>
            {formatCurrency(
              analytics.likelyRevenue
            )}
          </strong>

          <small>
            Estimated from pipeline and
            current win rate
          </small>
        </article>

        <article>
          <span>Potential pipeline</span>

          <strong>
            {formatCurrency(
              analytics.pipelineValue
            )}
          </strong>

          <small>
            All pending quote value
          </small>
        </article>

        <article>
          <span>Lost opportunities</span>

          <strong>
            {formatCurrency(
              analytics.revenueLost
            )}
          </strong>

          <small>
            Declined, rescinded or
            cancelled
          </small>
        </article>
      </div>

      {analytics.pipelineValue > 0 &&
        analytics.winRate === 0 && (
          <div className="analytics-forecast-note">
            <Activity size={20} />

            <p>
              Likely revenue will become
              more accurate once you have
              accepted and declined quote
              history.
            </p>
          </div>
        )}
    </section>
  );
}