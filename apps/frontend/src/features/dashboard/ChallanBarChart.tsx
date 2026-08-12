import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

interface ChallanBarChartProps {
  data: { DRAFT: number; CONFIRMED: number; CANCELLED: number };
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
        <p className="font-semibold text-foreground mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.fill }} className="font-medium">
            {p.value} challan{p.value !== 1 ? 's' : ''}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     'hsl(38,92%,50%)',
  CONFIRMED: 'hsl(142,71%,45%)',
  CANCELLED: 'hsl(0,84%,60%)',
};

export const ChallanBarChart: React.FC<ChallanBarChartProps> = ({ data }) => {
  const chartData = [
    { name: 'Draft',     value: data.DRAFT,     key: 'DRAFT' },
    { name: 'Confirmed', value: data.CONFIRMED,  key: 'CONFIRMED' },
    { name: 'Cancelled', value: data.CANCELLED,  key: 'CANCELLED' },
  ];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barSize={36}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', radius: 4 }} />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {chartData.map((entry) => (
            <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
