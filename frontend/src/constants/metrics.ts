export type MetricKey = 'wellbeing' | 'alertsResolved' | 'responseTime';

export type Metrics = Record<MetricKey, { value: number; delta: number }>;

export const initialMetrics: Metrics = {
  wellbeing: { value: 82, delta: 0 },
  alertsResolved: { value: 14, delta: 0 },
  responseTime: { value: 12, delta: 0 }
};

export const metricOrder: readonly MetricKey[] = ['wellbeing', 'alertsResolved', 'responseTime'];
