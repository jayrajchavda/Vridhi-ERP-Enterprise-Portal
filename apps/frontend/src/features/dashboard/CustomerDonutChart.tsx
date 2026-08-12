import React from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface CustomerDonutChartProps {
  data: Record<string, number>;
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  LEAD:     { color: '#3b82f6', label: 'Lead' },
  ACTIVE:   { color: '#22c55e', label: 'Active' },
  INACTIVE: { color: '#94a3b8', label: 'Inactive' },
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const { name, value } = payload[0];
    return (
      <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-lg">
        <span className="font-semibold text-foreground">{name}</span>
        <span className="text-muted-foreground ml-2">{value} customer{value !== 1 ? 's' : ''}</span>
      </div>
    );
  }
  return null;
};

export const CustomerDonutChart: React.FC<CustomerDonutChartProps> = ({ data }) => {
  const chartData = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([status, count]) => ({
      name: STATUS_CONFIG[status]?.label ?? status,
      value: count,
      color: STATUS_CONFIG[status]?.color ?? '#6366f1',
    }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No customer data
      </div>
    );
  }

  const total = chartData.reduce((a, b) => a + b.value, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {chartData.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value) => (
              <span className="text-xs text-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      {/* Center total */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: 28 }}>
        <div className="text-center">
          <div className="text-xl font-bold text-foreground">{total}</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</div>
        </div>
      </div>
    </div>
  );
};
