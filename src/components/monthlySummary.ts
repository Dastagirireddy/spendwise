import { formatCurrency, formatCompact, formatMonth, getCurrentMonth } from '../utils/format';
import { renderDonutChart, renderBarChart } from '../utils/charts';
import {
  getMonthTotal, getBudget, setBudget, setIncome, getMonthCategorySummary,
  getDailySummary, getFixedExpenseTotal
} from '../db';

export async function renderMonthlySummary(container: HTMLElement, selectedMonth?: string): Promise<void> {
  const month = selectedMonth || getCurrentMonth();

  container.innerHTML = '<div class="loading">Loading...</div>';

  const [monthTotal, budget, categorySummary, dailySummary, fixedTotal] = await Promise.all([
    getMonthTotal(month),
    getBudget(month),
    getMonthCategorySummary(month),
    getDailySummary(month),
    getFixedExpenseTotal(month),
  ]);

  const budgetAmount = budget?.amount ?? 0;
  const income = budget?.income ?? 0;
  const remaining = budgetAmount - monthTotal;
  const afterFixed = income - fixedTotal;
  const isCurrentMonth = month === getCurrentMonth();

  const donutSegments = categorySummary.map(cat => ({
    value: cat.total,
    color: cat.category_color,
    label: cat.category_name,
  }));

  const dailyBars = dailySummary.map(day => ({
    label: new Date(day.date + 'T00:00:00').getDate().toString(),
    value: day.total,
    color: 'var(--brand-teal)',
  }));

  const prevMonth = getPrevMonth(month);
  const nextMonth = getNextMonth(month);

  container.innerHTML = `
    <div class="monthly-summary">
      <div class="dashboard-hero">
        <div class="hero-text">
          <h1>${formatMonth(month)}</h1>
          <p class="hero-subtitle">Monthly spending overview</p>
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
          <span class="overview-label">Categories Used</span>
          <span class="overview-value">${categorySummary.length}</span>
        </div>
        <div class="overview-card">
          <span class="overview-label">Transactions</span>
          <span class="overview-value">${categorySummary.reduce((sum, c) => sum + c.count, 0)}</span>
        </div>
      </div>

      <div class="income-budget-row">
        <div class="budget-setting flex-1">
          <h2 class="section-title">Monthly Income</h2>
          <div class="budget-form">
            <div class="budget-input-group">
              <span class="currency-symbol">₹</span>
              <input type="number" id="income-input" value="${income}" step="1000" min="0" placeholder="Set income" />
            </div>
            <button id="save-income-btn" class="save-budget-btn">Save</button>
          </div>
        </div>
        <div class="budget-setting flex-1">
          <h2 class="section-title">Monthly Budget</h2>
          <div class="budget-form">
            <div class="budget-input-group">
              <span class="currency-symbol">₹</span>
              <input type="number" id="budget-input" value="${budgetAmount}" step="1000" min="0" placeholder="Set budget" />
            </div>
            <button id="save-budget-btn" class="save-budget-btn">Save</button>
          </div>
        </div>
      </div>

      ${income > 0 ? `
        <div class="income-breakdown-card clay-card">
          <div class="income-breakdown-row">
            <span>Income</span>
            <span class="income-breakdown-val">${formatCompact(income)}</span>
          </div>
          <div class="income-breakdown-row">
            <span>Fixed Expenses</span>
            <span class="income-breakdown-val negative">-${formatCompact(fixedTotal)}</span>
          </div>
          <div class="income-breakdown-divider"></div>
          <div class="income-breakdown-row total">
            <span>Available After Fixed</span>
            <span class="income-breakdown-val ${afterFixed >= 0 ? 'positive' : 'negative'}">${formatCompact(afterFixed)}</span>
          </div>
        </div>
      ` : ''}

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

      <div class="category-breakdown-full">
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

  document.getElementById('save-budget-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('budget-input') as HTMLInputElement;
    const val = parseFloat(input.value);
    if (!isNaN(val) && val >= 0) {
      await setBudget(month, val);
      renderMonthlySummary(container, month);
    }
  });

  document.getElementById('save-income-btn')?.addEventListener('click', async () => {
    const input = document.getElementById('income-input') as HTMLInputElement;
    const val = parseFloat(input.value);
    if (!isNaN(val) && val >= 0) {
      await setIncome(month, val);
      renderMonthlySummary(container, month);
    }
  });

  container.querySelectorAll('.month-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = (btn as HTMLElement).dataset.month;
      if (target) renderMonthlySummary(container, target);
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
