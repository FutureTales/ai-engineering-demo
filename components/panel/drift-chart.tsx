"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function DriftChart({ data }: { data: { line: string; baseline: number; current: number }[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="line" tick={{ fontSize: 11 }} interval={0} />
          <YAxis tick={{ fontSize: 11 }} unit=" %" domain={[0, 100]} />
          <Tooltip formatter={(v) => `${v} %`} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="baseline" name="Semana base" fill="#C9D0DC" radius={[3, 3, 0, 0]} />
          <Bar dataKey="current" name="Semana actual" fill="#0283BA" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
