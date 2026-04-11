"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DailyRow {
  date: string;
  impressions: number;
  clicks: number;
  views: number;
  costUsd: number;
  ctrPct: number;
}

export function MetricsChart({ rows }: { rows: DailyRow[] }) {
  // Format date as MMM DD for readability in the X axis
  const data = rows.map((r) => ({
    ...r,
    dateShort: new Date(r.date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
  }));

  return (
    <div className="space-y-6">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
            <XAxis
              dataKey="dateShort"
              stroke="rgba(0,0,0,0.55)"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              stroke="rgba(0,0,0,0.55)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="rgba(0,0,0,0.55)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255,255,255,0.98)",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                fontSize: "12px",
              }}
              labelStyle={{ color: "rgba(0,0,0,0.9)", fontWeight: 600 }}
            />
            <Legend wrapperStyle={{ fontSize: "12px" }} />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="impressions"
              stroke="#0891b2"
              strokeWidth={2}
              dot={false}
              name="Impressions"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="clicks"
              stroke="#059669"
              strokeWidth={2}
              dot={false}
              name="Clicks"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="costUsd"
              stroke="#d97706"
              strokeWidth={2}
              dot={false}
              name="Cost ($)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
            <XAxis
              dataKey="dateShort"
              stroke="rgba(0,0,0,0.55)"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              stroke="rgba(0,0,0,0.55)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              unit="%"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(255,255,255,0.98)",
                border: "1px solid rgba(0,0,0,0.1)",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value.toFixed(2)}%`, "CTR"]}
            />
            <Line
              type="monotone"
              dataKey="ctrPct"
              stroke="#db2777"
              strokeWidth={2}
              dot={false}
              name="CTR"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
