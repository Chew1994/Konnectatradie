import {
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  BarChart3
} from "lucide-react";

const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec"
];

const safeNumber = (value) =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(safeNumber(value));

export default function RevenueTrendsPanel({
  analytics
}) {
  if (!analytics) return null;

  const monthlyData =
    analytics.monthlyRevenue ??
    MONTHS.map((month) => ({
      month,
      revenue: 0
    }));

  const highest = Math.max(
    1,
    ...monthlyData.map((m) => safeNumber(m.revenue))
  );

  const totalRevenue =
    monthlyData.reduce(
      (sum, item) => sum + safeNumber(item.revenue),
      0
    );

  const averageRevenue =
    monthlyData.length > 0
      ? totalRevenue / monthlyData.length
      : 0;

  const bestMonth =
    [...monthlyData].sort(
      (a, b) => b.revenue - a.revenue
    )[0] || {
      month: "-",
      revenue: 0
    };

  return (
    <section className="analytics-panel analytics-revenue-trends">

      <div className="analytics-panel-heading">

        <div className="analytics-panel-icon">
          <BarChart3 />
        </div>

        <div>
          <h2>Revenue trends</h2>
          <p>
            Track how accepted quote revenue
            changes throughout the year.
          </p>
        </div>

      </div>

      <div className="analytics-trends-summary">

        <article>
          <TrendingUp size={18}/>
          <span>Total revenue</span>
          <strong>
            {formatCurrency(totalRevenue)}
          </strong>
        </article>

        <article>
          <CircleDollarSign size={18}/>
          <span>Monthly average</span>
          <strong>
            {formatCurrency(averageRevenue)}
          </strong>
        </article>

        <article>
          <TrendingDown size={18}/>
          <span>Best month</span>
          <strong>
            {bestMonth.month}
          </strong>

          <small>
            {formatCurrency(bestMonth.revenue)}
          </small>

        </article>

      </div>

      <div className="analytics-revenue-chart">

        {monthlyData.map((item) => (

          <div
            key={item.month}
            className="analytics-revenue-bar"
          >

            <span>
              {item.month}
            </span>

            <div className="analytics-revenue-track">

              <div
                className="analytics-revenue-fill"
                style={{
                  height: `${
                    (safeNumber(item.revenue) /
                      highest) *
                    100
                  }%`
                }}
              />

            </div>

            <strong>
              {formatCurrency(item.revenue)}
            </strong>

          </div>

        ))}

      </div>

    </section>
  );
}