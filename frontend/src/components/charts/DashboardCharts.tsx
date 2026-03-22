import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import '../../styles/charts.css';

type PieDatum = {
  name: string;
  value: number;
};

type TrendDatum = {
  name: string;
  alerts: number;
};

type DashboardChartsProps = {
  statusData: PieDatum[];
  zoneData: PieDatum[];
  alertTrendData: TrendDatum[];
  labels: {
    statusTitle: string;
    statusSubtitle: string;
    zoneTitle: string;
    zoneSubtitle: string;
    alertsTitle: string;
    alertsSubtitle: string;
    alertsSeries: string;
    empty: string;
  };
};

const chartPalette = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];

const tooltipStyle = {
  backgroundColor: 'var(--bg-card)',
  border: '1px solid var(--border-soft)',
  borderRadius: '10px',
  color: 'var(--text-primary)',
  boxShadow: 'var(--shadow-soft)'
} as const;

const axisTick = { fill: 'var(--text-muted)', fontSize: 12 };

export const DashboardCharts = ({
  statusData,
  zoneData,
  alertTrendData,
  labels
}: DashboardChartsProps) => {
  const statusTotal = statusData.reduce((sum, item) => sum + item.value, 0);
  const zoneTotal = zoneData.reduce((sum, item) => sum + item.value, 0);
  const hasTrend = alertTrendData.some((item) => item.alerts > 0);

  return (
    <div className="charts-grid">
      <article className="chart-card">
        <header className="chart-card__header">
          <h3>{labels.statusTitle}</h3>
          <p className="muted">{labels.statusSubtitle}</p>
        </header>
        <div className="chart-card__body">
          {statusTotal > 0 ? (
            <ResponsiveContainer>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={2}>
                  {statusData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={chartPalette[index % chartPalette.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend verticalAlign="bottom" height={32} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">{labels.empty}</div>
          )}
        </div>
      </article>

      <article className="chart-card">
        <header className="chart-card__header">
          <h3>{labels.zoneTitle}</h3>
          <p className="muted">{labels.zoneSubtitle}</p>
        </header>
        <div className="chart-card__body">
          {zoneTotal > 0 ? (
            <ResponsiveContainer>
              <BarChart data={zoneData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="var(--border-soft)" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="value" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">{labels.empty}</div>
          )}
        </div>
      </article>

      <article className="chart-card">
        <header className="chart-card__header">
          <h3>{labels.alertsTitle}</h3>
          <p className="muted">{labels.alertsSubtitle}</p>
        </header>
        <div className="chart-card__body">
          {hasTrend ? (
            <ResponsiveContainer>
              <LineChart data={alertTrendData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke="var(--border-soft)" strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="alerts"
                  name={labels.alertsSeries}
                  stroke="var(--chart-3)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">{labels.empty}</div>
          )}
        </div>
      </article>
    </div>
  );
};
