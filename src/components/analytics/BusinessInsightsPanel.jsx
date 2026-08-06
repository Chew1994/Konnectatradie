import React from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Lightbulb
} from "lucide-react";

export default function BusinessInsightsPanel({
  analytics
}) {
  if (!analytics) return null;

  const insights = [];

  if (
    analytics.pipelineValue >
    analytics.revenueWon
  ) {
    insights.push({
      tone: "positive",
      icon: <TrendingUp />,
      title: "Healthy pipeline",
      text:
        "Your current pipeline exceeds your confirmed revenue. Following up on outstanding quotes could significantly increase this month's earnings."
    });
  }

  if (analytics.winRate < 30) {
    insights.push({
      tone: "warning",
      icon: <AlertTriangle />,
      title: "Win rate needs attention",
      text:
        "Your quote success rate is below 30%. Review pricing, response speed and quote descriptions."
    });
  }

  if (analytics.repeatCustomerRate > 40) {
    insights.push({
      tone: "success",
      icon: <CheckCircle />,
      title: "Strong customer loyalty",
      text:
        "A large percentage of your work comes from repeat customers."
    });
  }

  if (analytics.averageResponseHours > 48) {
    insights.push({
      tone: "warning",
      icon: <TrendingDown />,
      title: "Slow response time",
      text:
        "Customers respond better to quicker replies. Faster responses can improve conversion."
    });
  }

  if (insights.length === 0) {
    insights.push({
      tone: "info",
      icon: <Lightbulb />,
      title: "Everything looks healthy",
      text:
        "No significant issues detected. Keep maintaining your current performance."
    });
  }

  return (
    <section className="analytics-panel analytics-business-insights">

      <div className="analytics-panel-heading">

        <div className="analytics-panel-icon">
          <Lightbulb />
        </div>

        <div>
          <h2>Business insights</h2>
          <p>
            Automatic observations based on your current business performance.
          </p>
        </div>

      </div>

      <div className="analytics-insights-list">

        {insights.map((item, index) => (

          <article
            key={index}
            className={`analytics-insight analytics-${item.tone}`}
          >

            <div className="analytics-insight-icon">
              {item.icon}
            </div>

            <div>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </div>

          </article>

        ))}

      </div>

    </section>
  );
}