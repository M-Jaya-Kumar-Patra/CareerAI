import {
  BarChart3,
  BriefcaseBusiness,
  FileText,
  Target,
  Video,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../lib/api.js";

export function ProgressPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["progress-analytics"],
    queryFn: async () => (await api.get("/analytics/progress")).data.data,
  });
  if (isLoading)
    return (
      <div className="card analytics-loading">Loading your progress...</div>
    );
  if (isError)
    return (
      <div className="card analytics-loading">
        We couldn&apos;t load progress analytics. Please try again.
      </div>
    );
  const { overview, funnel, activity } = data;
  const cards = [
    ["Applications", overview.applications, BriefcaseBusiness],
    ["Completed interviews", overview.completedInterviews, Video],
    ["Avg. interview score", overview.averageInterviewScore ?? "—", Target],
    ["Resume ATS score", overview.resumeScore ?? "—", FileText],
  ];
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Progress analytics</p>
          <h1>See your momentum clearly.</h1>
          <p className="subheading">
            Track the habits and outcomes that move your career forward.
          </p>
        </div>
      </section>
      <section className="stat-grid">
        {cards.map(([label, value, Icon]) => (
          <article className="stat-card" key={label}>
            <div className="stat-icon">
              <Icon size={18} />
            </div>
            <p className="label">{label}</p>
            <p className="stat-value">{value}</p>
            <p className="stat-note">
              {value === "—"
                ? "Build activity to unlock this metric"
                : "Based on your CareerAI activity"}
            </p>
          </article>
        ))}
      </section>
      <section className="analytics-grid">
        <article className="card analytics-chart">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Activity trend</p>
              <h2>Applications and interviews</h2>
            </div>
            <BarChart3 size={19} color="var(--color-accent)" />
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={activity}
              margin={{ top: 20, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
              <XAxis
                dataKey="month"
                stroke="var(--color-muted)"
                fontSize={12}
              />
              <YAxis
                allowDecimals={false}
                stroke="var(--color-muted)"
                fontSize={12}
              />
              <Tooltip />
              <Bar
                dataKey="applications"
                fill="var(--color-accent)"
                radius={[4, 4, 0, 0]}
              />
              <Bar dataKey="interviews" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>
        <article className="card analytics-funnel">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Application funnel</p>
              <h2>Pipeline health</h2>
            </div>
          </div>
          <div className="funnel-list">
            {funnel.map((item) => (
              <div className="funnel-row" key={item.status}>
                <div>
                  <span>{item.status}</span>
                  <strong>{item.count}</strong>
                </div>
                <span className="funnel-track">
                  <i
                    style={{
                      width: `${overview.applications ? Math.max(4, (item.count / overview.applications) * 100) : 4}%`,
                    }}
                  />
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
