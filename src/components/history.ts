import { formatCurrency, formatCompact, formatMonth, getCurrentMonth } from '../utils/format';
import { renderDonutChart, renderBarChart } from '../utils/charts';
import {
  getMonthTotal, getBudget, getMonthCategorySummary,
  getDailySummary
} from '../db';

export async function renderHistory(container: HTMLElement, selectedMonth?: string): Promise<void> {
  const month = selectedMonth || getCurrentMonth();

  container.innerHTML = '<div class="loading">Loading...</div>';

  const [monthTotal, budget, categorySummary, dailySummary] = await Promise.all([
    getMonthTotal(month),
    getBudget(month),
    getMonthCategorySummary(month),
    getDailySummary(month),
  ]);

  const budgetAmount = budget?.amount ?? 0;
  const remaining = budgetAmount - monthTotal;
  const isCurrentMonth = month === getCurrentMonth();

  const donutSegments = categorySummary.map(cat => ({
    value: cat.total,
    color: cat.category_color,
    label: cat.category_name,
  }));

  const dailyBars = dailySummary.map(day => ({
    label: new Date(day.date + 'T00:00:00').getDate().toString(),
    value: day.total,
    color: 'var(--primary)',
  }));

  const prevMonth = getPrevMonth(month);
  const nextMonth = getNextMonth(month);

  container.innerHTML = `
    <div class="monthly-summary">
      <div class="dashboard-hero">
        <div class="hero-text">
          <h1>${formatMonth(month)}</h1>
          <p class="hero-subtitle">Spending overview</p>
        </div>
        <div class="month-nav">
          <button class="month-nav-btn" data-month="${prevMonth}" title="Previous month">
            <iconify-icon icon="lucide:chevron-left"></iconify-icon>
          </button>
          ${!isCurrentMonth ? `<button class="month-nav-btn month-nav-today" data-month="${getCurrentMonth()}">Today</button>` : ''}
          <button class="month-nav-btn" data-month="${nextMonth}" title="Next month" ${isCurrentMonth ? 'disabled' : ''}>
            <iconify-icon icon="lucide:chevron-right"></iconify-icon>
          </button>
        </div>
      </div>

      <div class="monthly-overview">
        <div class="overview-card main-stat">
          <span class="overview-label">Total Spent</span>
          <span class="overview-value big">${formatCompact(monthTotal)}</span>
          ${budgetAmount > 0 ? `<span class="overview-sub">of ${formatCurrency(budgetAmount)} budget</span>` : ''}
        </div>
        <div class="overview-card">
          <span class="overview-label">Remaining</span>
          <span class="overview-value ${remaining >= 0 ? 'positive' : 'negative'}">${formatCompact(remaining)}</span>
        </div>
        <div class="overview-card">
          <span class="overview-label">Categories</span>
          <span class="overview-value">${categorySummary.length}</span>
        </div>
        <div class="overview-card">
          <span class="overview-label">Transactions</span>
          <span class="overview-value">${categorySummary.reduce((sum, c) => sum + c.count, 0)}</span>
        </div>
      </div>

      <div class="dashboard-charts-row">
        <div class="chart-card donut-card">
          <h2 class="section-title">Category Breakdown</h2>
          ${categorySummary.length > 0 ? `
            <div class="donut-wrap">
              ${renderDonutChart(donutSegments, 180, 22, 'Total', formatCompact(monthTotal))}
            </div>
          ` : `
            <div class="empty-state">
              <span>No expenses this month</span>
            </div>
          `}
        </div>
        <div class="chart-card daily-card">
          <h2 class="section-title">Daily Spending</h2>
          ${dailyBars.length > 0 ? `
            ${renderBarChart(dailyBars, 140, true)}
          ` : `
            <div class="empty-state">
              <span>No daily data yet</span>
            </div>
          `}
        </div>
      </div>

      <div class="category-breakdown-full clay-card">
        <h2 class="section-title">All Categories</h2>
        ${categorySummary.length > 0 ? `
          <div class="category-cards">
            ${categorySummary.map(cat => {
              const pct = monthTotal > 0 ? Math.round((cat.total / monthTotal) * 100) : 0;
              return `
                <div class="cat-card">
                  <div class="cat-card-icon" style="background: ${cat.category_color}"><iconify-icon icon="${cat.category_icon}"></iconify-icon></div>
                  <div class="cat-card-info">
                    <span class="cat-card-name">${cat.category_name}</span>
                    <span class="cat-card-count">${cat.count} transactions</span>
                  </div>
                  <div class="cat-card-right">
                    <span class="cat-card-amount">${formatCurrency(cat.total)}</span>
                    <span class="cat-card-pct">${pct}%</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <span>No expenses this month</span>
          </div>
        `}
      </div>
    </div>
  `;

  container.querySelectorAll('.month-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = (btn as HTMLElement).dataset.month;
      if (target) renderHistory(container, target);
    });
  });
}

function getPrevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function getNextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
