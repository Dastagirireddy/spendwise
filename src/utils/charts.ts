import { formatCompact } from './format';

interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

interface BarData {
  label: string;
  value: number;
  color?: string;
}

const DONUT_PALETTE = [
  '#cc785c', '#5db8a6', '#e8a55a', '#a9583e',
  '#5db872', '#d4a017', '#6c6a64', '#c64545'
];

export function renderDonutChart(
  segments: DonutSegment[],
  _size: number = 220,
  _thickness: number = 28,
  centerLabel?: string,
  centerValue?: string
): string {
  if (segments.length === 0 || segments.every(s => s.value === 0)) {
    return `
      <div class="donut-empty">
        <svg viewBox="0 0 100 100" class="donut-svg-responsive">
          <circle cx="50" cy="50" r="36" fill="none" stroke="var(--border)" stroke-width="14" />
        </svg>
        ${centerLabel ? `<div class="donut-center"><span class="donut-center-value">${centerValue || ''}</span><span class="donut-center-label">${centerLabel}</span></div>` : ''}
      </div>`;
  }

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const cx = 50;
  const cy = 50;
  const gapDeg = 2;
  const gapRatio = gapDeg / 360;

  let cumulativePercent = 0;
  const circles = segments
    .filter(s => s.value > 0)
    .map((segment, i) => {
      const percent = segment.value / total;
      const visiblePercent = Math.max(percent - gapRatio, 0.001);
      const dashArray = `${visiblePercent * circumference} ${circumference}`;
      const rotation = cumulativePercent * 360 - 90;
      cumulativePercent += percent;
      const color = segment.color || DONUT_PALETTE[i % DONUT_PALETTE.length];
      return `<circle cx="${cx}" cy="${cy}" r="${radius}"
        fill="none" stroke="${color}" stroke-width="14"
        stroke-dasharray="${dashArray}"
        stroke-linecap="round"
        transform="rotate(${rotation} ${cx} ${cy})"
        class="donut-segment"
        data-label="${segment.label}"
        data-value="${segment.value}"
        data-pct="${Math.round((segment.value / total) * 100)}" />`;
    }).join('');

  const legend = segments
    .filter(s => s.value > 0)
    .map((s, i) => {
      const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
      const color = s.color || DONUT_PALETTE[i % DONUT_PALETTE.length];
      return `<div class="donut-legend-item">
        <span class="donut-legend-dot" style="background:${color}"></span>
        <span class="donut-legend-label">${s.label}</span>
        <span class="donut-legend-val">₹${s.value.toFixed(0)}</span>
        <span class="donut-legend-pct">${pct}%</span>
      </div>`;
    }).join('');

  return `
    <div class="donut-container">
      <div class="donut-svg-wrap">
        <svg viewBox="0 0 100 100" class="donut-svg-responsive">
          <defs>
            <filter id="donut-shadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="rgba(0,0,0,0.08)" />
            </filter>
          </defs>
          <circle cx="${cx}" cy="${cy}" r="${radius}"
            fill="none" stroke="var(--border)" stroke-width="14" />
          <g filter="url(#donut-shadow)">
            ${circles}
          </g>
        </svg>
        ${centerLabel ? `<div class="donut-center">
          <span class="donut-center-value">${centerValue || ''}</span>
          <span class="donut-center-label">${centerLabel}</span>
        </div>` : ''}
      </div>
      <div class="donut-legend">${legend}</div>
    </div>`;
}

export function renderComboChart(
  bars: BarData[],
  showLabels: boolean = true
): string {
  if (bars.length === 0) {
    return '<div class="empty-chart">No data available</div>';
  }

  const values = bars.map(b => b.value);
  const maxValue = Math.max(...values, 1);
  const total = values.reduce((a, b) => a + b, 0);
  const avg = total / values.length;

  let cumulative = 0;
  const cumulativePoints: { x: number; y: number }[] = [];

  const barEls = bars.map((bar, i) => {
    const pctHeight = maxValue > 0 ? (bar.value / maxValue) * 100 : 0;
    cumulative += bar.value;
    const cumPct = 100 - (cumulative / total) * 100;
    cumulativePoints.push({ x: i, y: cumPct });

    const isAboveAvg = bar.value >= avg;
    const barColor = isAboveAvg ? 'var(--coral)' : 'var(--border)';

    return `
      <div class="combo-col">
        <div class="combo-tooltip">${bar.label}: ${formatCompact(bar.value)}${isAboveAvg ? ' (above avg)' : ''}</div>
        <div class="combo-bar ${isAboveAvg ? 'above-avg' : ''}" style="height:${Math.max(pctHeight, 2)}%;background:${barColor};"></div>
        ${showLabels ? `<span class="combo-label">${bar.label}</span>` : ''}
      </div>`;
  }).join('');

  const avgPct = maxValue > 0 ? (avg / maxValue) * 100 : 0;

  const linePoints = cumulativePoints.map((p, i) => {
    const px = (i / (bars.length - 1 || 1)) * 100;
    return `${px},${p.y}`;
  }).join(' ');

  return `
    <div class="combo-chart-wrap">
      <div class="combo-chart">
        <div class="combo-avg-line" style="bottom:${avgPct}%;">
          <span class="combo-avg-label">avg ${formatCompact(avg)}</span>
        </div>
        ${barEls}
      </div>
      <svg class="combo-cum-line" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points="${linePoints}" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.6" vector-effect="non-scaling-stroke" />
      </svg>
    </div>`;
}

export function renderBarChart(
  bars: BarData[],
  maxHeight: number = 160,
  showLabels: boolean = true
): string {
  if (bars.length === 0) {
    return '<div class="empty-chart">No data available</div>';
  }

  const maxValue = Math.max(...bars.map(b => b.value), 1);

  const barEls = bars.map(bar => {
    const height = maxValue > 0 ? (bar.value / maxValue) * maxHeight : 0;
    const color = bar.color || 'var(--primary)';
    return `
      <div class="bar-col">
        <div class="bar-tooltip">${bar.label}: ${formatCompact(bar.value)}</div>
        <div class="bar" style="height:${Math.max(height, 3)}px;background:${color};"></div>
        ${showLabels ? `<span class="bar-label">${bar.label}</span>` : ''}
      </div>`;
  }).join('');

  return `<div class="bar-chart" style="height:${maxHeight + 40}px;">${barEls}</div>`;
}

export function renderSparkline(
  values: number[],
  width: number = 120,
  height: number = 32,
  color: string = 'var(--primary)'
): string {
  if (values.length < 2) return '';

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const padding = 2;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2);
    const y = padding + ((max - v) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return `
    <svg width="${width}" height="${height}" class="sparkline">
      <polygon points="${areaPoints}" fill="${color}" opacity="0.15" />
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>`;
}
