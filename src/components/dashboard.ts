import { ICONS } from '../icons';
import { formatCurrency, formatCompact, getCurrentMonth, getDaysInMonth, getDayOfMonth } from '../utils/format';
import { renderDonutChart, renderComboChart } from '../utils/charts';
import { showAddExpenseModal } from './addExpense';
import {
  getTodayExpenses, getTodayTotal, getMonthTotal, getMonthCategorySummary,
  getBudget, getDailySummary, getFixedExpenseStatuses, getFixedExpenseTotal,
  toggleFixedExpensePayment, getUnpaidFixedExpenseCount, getSavingsGoal
} from '../db';

export async function renderDashboard(container: HTMLElement): Promise<void> {
  container.innerHTML = '<div class="loading">Loading...</div>';

  const month = getCurrentMonth();
  const dayOfMonth = getDayOfMonth();
  const showNotification = dayOfMonth <= 5;

  const [todayExpenses, todayTotal, monthTotal, categorySummary, budget, dailySummary, fixedStatuses, fixedTotal, unpaidCount, savingsGoal] = await Promise.all([
    getTodayExpenses(),
    getTodayTotal(),
    getMonthTotal(month),
    getMonthCategorySummary(month),
    getBudget(month),
    getDailySummary(month),
    getFixedExpenseStatuses(month),
    getFixedExpenseTotal(month),
    showNotification ? getUnpaidFixedExpenseCount(month) : Promise.resolve(0),
    getSavingsGoal(month),
  ]);

  const budgetAmount = budget?.amount ?? 0;
  const income = budget?.income ?? 0;
  const remaining = budgetAmount - monthTotal - fixedTotal;
  const daysInMonth = getDaysInMonth(month);
  const fixedPercent = budgetAmount > 0 ? Math.min((fixedTotal / budgetAmount) * 100, 100) : 0;
  const dynamicPercent = budgetAmount > 0 ? Math.min((monthTotal / budgetAmount) * 100, 100 - fixedPercent) : 0;
  const afterFixed = income - fixedTotal;
  const paidCount = fixedStatuses.filter(s => s.paid).length;
  const totalFixed = fixedStatuses.length;

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

  const todaySparks = dailySummary.slice(-7).map(d => d.total);

  container.innerHTML = `
    <div class="dashboard">
      ${showNotification && unpaidCount > 0 ? `
        <div class="notification-banner warning">
          <div class="notif-icon"><iconify-icon icon="${ICONS.alert}"></iconify-icon></div>
          <div class="notif-content">
            <span class="notif-title">${unpaidCount} fixed expense${unpaidCount > 1 ? 's' : ''} unpaid</span>
            <span class="notif-sub">Mark them as paid before the 5th to stay on track</span>
          </div>
          <a href="#" class="notif-action" id="notif-goto-fixed">View All</a>
        </div>
      ` : ''}

      <div class="dashboard-hero">
        <div class="hero-text">
          <h1 style="font-family:'Cabinet Grotesk',sans-serif;">Good ${getGreeting()}</h1>
          <p class="hero-subtitle">Your smart spending companion</p>
        </div>
        <div class="hero-actions">
          <span class="date-badge">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          <button class="clay-btn-primary" id="dash-add-expense">
            <iconify-icon icon="${ICONS.addExpense}"></iconify-icon>
            Add Expense
          </button>
        </div>
      </div>

      <div class="stat-cards">
        <div class="stat-card coral">
          <div class="stat-icon-wrap"><iconify-icon icon="${ICONS.logo}"></iconify-icon></div>
          <div class="stat-info">
            <span class="stat-label">Spent Today</span>
            <span class="stat-value">${formatCompact(todayTotal)}</span>
          </div>
          <div class="stat-spark">${renderSparklineSmall(todaySparks, 'white')}</div>
        </div>
        <div class="stat-card amber">
          <div class="stat-icon-wrap"><iconify-icon icon="${ICONS.monthly}"></iconify-icon></div>
          <div class="stat-info">
            <span class="stat-label">This Month</span>
            <span class="stat-value">${formatCompact(monthTotal)}</span>
          </div>
          <div class="stat-spark">${renderSparklineSmall(todaySparks, 'white')}</div>
        </div>
        <div class="stat-card ${remaining >= 0 ? 'green' : 'coral'}">
          <div class="stat-icon-wrap"><iconify-icon icon="${remaining >= 0 ? ICONS.trendingUp : ICONS.alert}"></iconify-icon></div>
          <div class="stat-info">
            <span class="stat-label">Remaining</span>
            <span class="stat-value">${formatCompact(remaining)}</span>
          </div>
        </div>
        <div class="stat-card purple">
          <div class="stat-icon-wrap"><iconify-icon icon="${ICONS.trendingUp}"></iconify-icon></div>
          <div class="stat-info">
            <span class="stat-label">After Fixed</span>
            <span class="stat-value">${formatCompact(afterFixed)}</span>
          </div>
        </div>
      </div>

      ${budgetAmount > 0 ? `
        <div class="budget-progress-card clay-card">
          <div class="budget-header">
            <span>Monthly Budget</span>
            <span>${formatCurrency(monthTotal + fixedTotal)} / ${formatCurrency(budgetAmount)}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill fixed" style="width: ${fixedPercent}%"></div>
            <div class="progress-fill dynamic ${dynamicPercent > 80 ? 'warning' : ''}" style="width: ${dynamicPercent}%"></div>
          </div>
          <div class="budget-footer">
            <div class="budget-legend">
              <span class="legend-item"><span class="legend-dot fixed"></span>Fixed ${Math.round(fixedPercent)}%</span>
              <span class="legend-item"><span class="legend-dot dynamic"></span>Spent ${Math.round(dynamicPercent)}%</span>
            </div>
            <span>${daysInMonth - dayOfMonth + 1} days left</span>
          </div>
        </div>
      ` : `
        <div class="budget-progress-card no-budget">
          <div class="no-budget-msg">
            <iconify-icon icon="${ICONS.lightbulb}"></iconify-icon>
            <span>Set a monthly budget to track your spending</span>
          </div>
        </div>
      `}

      <div class="savings-goal-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;box-shadow:var(--shadow-sm);margin-bottom:24px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:40px;height:40px;border-radius:12px;background:var(--accent-light);display:flex;align-items:center;justify-content:center;">
              <iconify-icon icon="${ICONS.savings}" style="font-size:20px;color:var(--accent);"></iconify-icon>
            </div>
            <div>
              <h2 class="section-title" style="margin:0;">Savings Goal</h2>
              <span style="font-size:13px;color:var(--text-muted);">${savingsGoal ? savingsGoal.name : 'No goal set'}</span>
            </div>
          </div>
          <a href="#" id="goto-settings" style="font-size:13px;color:var(--accent);text-decoration:none;font-weight:500;">${savingsGoal ? 'Edit' : 'Set Goal'}</a>
        </div>
        ${savingsGoal ? `
          <div style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
              <span style="font-family:'Cabinet Grotesk',sans-serif;font-weight:800;font-size:22px;color:var(--text-primary);">${formatCurrency(savingsGoal.current_amount)}</span>
              <span style="font-size:13px;color:var(--text-muted);">of ${formatCurrency(savingsGoal.target_amount)}</span>
            </div>
            <div style="height:8px;background:var(--border);border-radius:999px;overflow:hidden;">
              <div style="height:100%;width:${Math.min((savingsGoal.current_amount / savingsGoal.target_amount) * 100, 100)}%;background:var(--accent);border-radius:999px;transition:width 0.5s ease;"></div>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:13px;">
            <span style="color:var(--text-muted);">${Math.round((savingsGoal.current_amount / savingsGoal.target_amount) * 100)}% saved</span>
            <span style="color:${savingsGoal.current_amount >= savingsGoal.target_amount ? 'var(--accent)' : 'var(--text-muted)'};">${savingsGoal.current_amount >= savingsGoal.target_amount ? 'Goal reached!' : formatCurrency(savingsGoal.target_amount - savingsGoal.current_amount) + ' remaining'}</span>
          </div>
        ` : `
          <div style="text-align:center;padding:16px 0;">
            <iconify-icon icon="${ICONS.target}" style="font-size:32px;color:var(--text-muted);opacity:0.4;"></iconify-icon>
            <p style="font-size:14px;color:var(--text-muted);margin-top:8px;">Set a monthly savings target to track your progress</p>
          </div>
        `}
      </div>

      ${totalFixed > 0 ? `
        <div class="fixed-expenses-dashboard clay-card">
          <div class="fixed-dash-header">
            <h2 class="section-title">Fixed Expenses</h2>
            <span class="fixed-dash-badge">${paidCount}/${totalFixed} paid</span>
          </div>
          <div class="fixed-dash-grid">
            ${fixedStatuses.map(status => `
              <div class="fixed-dash-item ${status.paid ? 'is-paid' : 'is-unpaid'}">
                <div class="fixed-dash-icon">
                  <iconify-icon icon="${status.category_icon || ICONS.delete}"></iconify-icon>
                </div>
                <div class="fixed-dash-info">
                  <span class="fixed-dash-name">${status.name}</span>
                  <span class="fixed-dash-amount">${formatCurrency(status.amount)}</span>
                </div>
                <button class="fixed-dash-toggle ${status.paid ? 'paid' : ''}"
                  data-id="${status.id}" data-paid="${status.paid ? 1 : 0}">
                  <iconify-icon icon="${status.paid ? ICONS.check : 'lucide:circle'}"></iconify-icon>
                </button>
              </div>
            `).join('')}
          </div>
          <div class="fixed-dash-summary">
            <span>Fixed total: ${formatCurrency(fixedTotal)}</span>
          </div>
        </div>
      ` : ''}

      <div class="chart-card daily-card full-width">
          <h2 class="section-title">Daily Spending</h2>
          ${dailyBars.length > 0 ? `
            ${renderComboChart(dailyBars, true)}
          ` : `
            <div class="empty-state">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="38" fill="var(--surface-card)" stroke="var(--hairline)" stroke-width="1"/>
                <rect x="20" y="44" width="8" height="14" rx="2" fill="var(--muted-soft)" opacity="0.4"/>
                <rect x="32" y="36" width="8" height="22" rx="2" fill="var(--muted-soft)" opacity="0.5"/>
                <rect x="44" y="28" width="8" height="30" rx="2" fill="var(--muted-soft)" opacity="0.6"/>
                <rect x="56" y="32" width="8" height="26" rx="2" fill="var(--muted-soft)" opacity="0.4"/>
                <path d="M20 50 L36 40 L48 44 L64 30" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>
              </svg>
              <span>No spending data yet</span>
              <span class="empty-hint">Expenses will appear here daily</span>
            </div>
          `}
      </div>

      <div class="dashboard-grid">
        <div class="chart-card donut-card">
          <h2 class="section-title">Spending Breakdown</h2>
          ${categorySummary.length > 0 ? `
            <div class="donut-wrap">
              ${renderDonutChart(donutSegments, 200, 24, 'Total', formatCompact(monthTotal))}
            </div>
          ` : `
            <div class="empty-state">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="38" fill="var(--surface-card)" stroke="var(--hairline)" stroke-width="1"/>
                <circle cx="40" cy="40" r="24" fill="none" stroke="var(--muted-soft)" stroke-width="6" stroke-dasharray="4 4" opacity="0.4"/>
                <circle cx="40" cy="16" r="5" fill="var(--primary)" opacity="0.3"/>
                <circle cx="60" cy="50" r="5" fill="var(--success)" opacity="0.3"/>
                <circle cx="20" cy="50" r="5" fill="var(--accent-amber)" opacity="0.3"/>
              </svg>
              <span>No expenses this month</span>
              <span class="empty-hint">Categories will show here</span>
            </div>
          `}
        </div>

        <div class="recent-expenses">
          <h2 class="section-title">Today's Expenses</h2>
          ${todayExpenses.length > 0 ? `
            <div class="expense-list">
              ${todayExpenses.map(exp => `
                <div class="expense-item" data-id="${exp.id}">
                  <div class="expense-icon" style="background:${exp.category_color}"><iconify-icon icon="${exp.category_icon}"></iconify-icon></div>
                  <div class="expense-details">
                    <span class="expense-desc">${exp.description || exp.category_name}</span>
                    <span class="expense-cat">${exp.category_name}</span>
                  </div>
                  <div class="expense-right">
                    <span class="expense-amount">-${formatCurrency(exp.amount)}</span>
                    <button class="delete-btn" data-id="${exp.id}" title="Delete"><iconify-icon icon="${ICONS.delete}"></iconify-icon></button>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="empty-state">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="38" fill="var(--surface-card)" stroke="var(--hairline)" stroke-width="1"/>
                <rect x="24" y="28" width="32" height="24" rx="4" fill="var(--canvas)" stroke="var(--muted-soft)" stroke-width="1.5"/>
                <circle cx="48" cy="40" r="3" fill="var(--primary)"/>
                <path d="M24 36h32" stroke="var(--muted-soft)" stroke-width="1.5"/>
                <path d="M32 48v4M40 48v4M48 48v4" stroke="var(--muted-soft)" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              <span>No expenses today</span>
              <span class="empty-hint">Tap "Add Expense" to get started</span>
            </div>
          `}
        </div>
      </div>
    </div>
  `;

  // Add expense button
  document.getElementById('dash-add-expense')?.addEventListener('click', () => {
    showAddExpenseModal(() => renderDashboard(container));
  });

  // Notification link
  document.getElementById('notif-goto-fixed')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('[data-view="fixed"]')?.dispatchEvent(new Event('click'));
  });

  // Savings goal settings link
  document.getElementById('goto-settings')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.querySelector('[data-view="settings"]')?.dispatchEvent(new Event('click'));
  });

  // Fixed expense toggles on dashboard
  container.querySelectorAll('.fixed-dash-toggle').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt((btn as HTMLElement).dataset.id!);
      const isPaid = (btn as HTMLElement).dataset.paid === '1';
      await toggleFixedExpensePayment(id, month, !isPaid);
      renderDashboard(container);
    });
  });

  // Expense delete buttons
  container.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt((btn as HTMLElement).dataset.id!);
      const { deleteExpense } = await import('../db');
      await deleteExpense(id);
      renderDashboard(container);
    });
  });
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

function renderSparklineSmall(values: number[], color: string): string {
  if (values.length < 2) return '';
  const w = 64;
  const h = 24;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const pad = 2;

  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = pad + ((max - v) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  const area = `${pad},${h - pad} ${points} ${w - pad},${h - pad}`;

  return `<svg width="${w}" height="${h}" class="sparkline-sm">
    <polygon points="${area}" fill="${color}" opacity="0.2" />
    <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`;
}
