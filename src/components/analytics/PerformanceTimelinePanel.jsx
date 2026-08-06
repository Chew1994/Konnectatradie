import React from "react";
import {
  TrendingUp,
  TrendingDown,
  CalendarDays
} from "lucide-react";

const MONTHS = [
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

const safeNumber = (value) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(safeNumber(value));

export default function PerformanceTimelinePanel({
  analytics
}) {
  if (!analytics) return null;

  const data =
    analytics.monthlyRevenue ??
    MONTHS.map((month) => ({
      month,
      revenue: 0
    }));

  const maxRevenue = Math.max(
    1,
    ...data.map((m) => safeNumber(m.revenue))
  );

  const total = data.reduce(
    (sum, item) => sum + safeNumber(item.revenue),
    0
  );

  const average =
    data.length > 0
      ? total / data.length
      : 0;

  const best =
    data.reduce(
      (highest, item) =>
        safeNumber(item.revenue) >
        safeNumber(highest.revenue)
          ? item
          : highest,
      data[0]
    );

  return (
    <section className="analytics-panel analytics-performance-timeline">

      <div className="analytics-panel-heading">

        <div className="analytics-panel-icon">
          <CalendarDays />
        </div>

        <div>
          <h2>Performance timeline</h2>

          <p>
            Track business growth throughout the year.
          </p>
        </div>

      </div>

      <div className="analytics-performance-summary">

        <article>
          <span>Total revenue</span>
          <strong>{formatCurrency(total)}</strong>
        </article>

        <article>
          <span>Average month</span>
          <strong>{formatCurrency(average)}</strong>
        </article>

        <article>
          <span>Best month</span>
          <strong>{best?.month ?? "-"}</strong>
        </article>

      </div>

      <div className="analytics-performance-chart">

        {data.map((item) => (

          <div
            key={item.month}
            className="analytics-performance-bar"
          >

            <div className="analytics-performance-track">

              <div
                className="analytics-performance-fill"
                style={{
                  height: `${(safeNumber(item.revenue) / maxRevenue) * 100}%`
                }}
              />

            </div>

            <span>{item.month}</span>

            <strong>
              {formatCurrency(item.revenue)}
            </strong>

          </div>

        ))}

      </div>

    </section>
  );
}