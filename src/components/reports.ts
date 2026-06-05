import { getMonthReport } from '../db';
import { formatCurrency, formatCompact, formatMonth, getCurrentMonth } from '../utils/format';
import { ICONS } from '../icons';

function getPrevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(y, m - 2);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getNextMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(y, m);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export async function renderReports(container: HTMLElement): Promise<void> {
  container.innerHTML = '<div class="loading">Loading...</div>';

  let currentMonth = getCurrentMonth();
  const now = new Date();
  const currentRealMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  async function render(month: string): Promise<void> {
    const report = await getMonthReport(month);
    const fixedPercent = report.budget > 0 ? Math.round((report.fixedTotal / report.budget) * 100) : 0;
    const dynamicPercent = report.budget > 0 ? Math.round((report.dynamicTotal / report.budget) * 100) : 0;

    container.innerHTML = `
      <div class="reports-page">
        <div class="dashboard-hero">
          <div class="hero-text">
            <h1>Reports</h1>
            <p class="hero-subtitle">Month-end spending summary</p>
          </div>
        </div>

        <div class="month-nav" style="display:flex;align-items:center;justify-content:center;gap:16px;margin-bottom:32px;">
          <button class="month-nav-btn" id="prev-month" style="width:36px;height:36px;border-radius:10px;border:1px solid var(--border-strong);background:var(--bg-card);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-secondary);font-size:16px;">
            <iconify-icon icon="${ICONS.chevronLeft}"></iconify-icon>
          </button>
          <span style="font-family:'Cabinet Grotesk',sans-serif;font-weight:800;font-size:20px;color:var(--text-primary);min-width:160px;text-align:center;">${formatMonth(month)}</span>
          <button class="month-nav-btn" id="next-month" style="width:36px;height:36px;border-radius:10px;border:1px solid var(--border-strong);background:var(--bg-card);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-secondary);font-size:16px;${month >= currentRealMonth ? 'opacity:0.4;pointer-events:none;' : ''}">
            <iconify-icon icon="${ICONS.chevronRight}"></iconify-icon>
          </button>
        </div>

        <!-- Summary Cards -->
        <div class="report-summary" style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px;">
          <div class="report-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:20px;box-shadow:var(--shadow-sm);">
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">Income</div>
            <div style="font-family:'Cabinet Grotesk',sans-serif;font-weight:800;font-size:22px;color:var(--text-primary);">${formatCurrency(report.income)}</div>
          </div>
          <div class="report-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:20px;box-shadow:var(--shadow-sm);">
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">Budget</div>
            <div style="font-family:'Cabinet Grotesk',sans-serif;font-weight:800;font-size:22px;color:var(--text-primary);">${formatCurrency(report.budget)}</div>
          </div>
          <div class="report-card" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:20px;box-shadow:var(--shadow-sm);">
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">Total Spent</div>
            <div style="font-family:'Cabinet Grotesk',sans-serif;font-weight:800;font-size:22px;color:var(--coral);">${formatCurrency(report.totalSpent)}</div>
          </div>
          <div class="report-card" style="background:var(--purple-light);border:1px solid rgba(92,58,183,0.2);border-radius:var(--radius-md);padding:20px;">
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">Fixed Expenses</div>
            <div style="font-family:'Cabinet Grotesk',sans-serif;font-weight:800;font-size:22px;color:var(--purple);">${formatCurrency(report.fixedTotal)}</div>
          </div>
          <div class="report-card" style="background:var(--coral-light);border:1px solid rgba(216,76,42,0.2);border-radius:var(--radius-md);padding:20px;">
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">Dynamic Spending</div>
            <div style="font-family:'Cabinet Grotesk',sans-serif;font-weight:800;font-size:22px;color:var(--coral);">${formatCurrency(report.dynamicTotal)}</div>
          </div>
          <div class="report-card" style="background:var(--accent-light);border:1px solid rgba(26,107,74,0.2);border-radius:var(--radius-md);padding:20px;">
            <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px;">Saved</div>
            <div style="font-family:'Cabinet Grotesk',sans-serif;font-weight:800;font-size:22px;color:var(--accent);">${report.saved >= 0 ? formatCurrency(report.saved) : '-' + formatCurrency(Math.abs(report.saved))}</div>
          </div>
        </div>

        <!-- Fixed vs Dynamic Split -->
        ${report.budget > 0 ? `
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;margin-bottom:32px;box-shadow:var(--shadow-sm);">
            <h2 style="font-family:'Cabinet Grotesk',sans-serif;font-weight:700;font-size:17px;margin-bottom:16px;color:var(--text-primary);">Budget Split</h2>
            <div style="display:flex;height:12px;border-radius:999px;overflow:hidden;background:var(--border);">
              <div style="width:${fixedPercent}%;background:var(--purple);transition:width 0.5s;"></div>
              <div style="width:${dynamicPercent}%;background:var(--coral);transition:width 0.5s;"></div>
            </div>
            <div style="display:flex;gap:24px;margin-top:12px;font-size:13px;">
              <span style="display:flex;align-items:center;gap:6px;"><span style="width:10px;height:10px;border-radius:50%;background:var(--purple);"></span> Fixed ${fixedPercent}%</span>
              <span style="display:flex;align-items:center;gap:6px;"><span style="width:10px;height:10px;border-radius:50%;background:var(--coral);"></span> Dynamic ${dynamicPercent}%</span>
            </div>
          </div>
        ` : ''}

        <!-- Category Breakdown -->
        ${report.categories.length > 0 ? `
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;margin-bottom:32px;box-shadow:var(--shadow-sm);">
            <h2 style="font-family:'Cabinet Grotesk',sans-serif;font-weight:700;font-size:17px;margin-bottom:16px;color:var(--text-primary);">Category Breakdown</h2>
            <div style="display:flex;flex-direction:column;gap:12px;">
              ${report.categories.map(cat => {
                const pct = report.totalSpent > 0 ? Math.round((cat.total / report.totalSpent) * 100) : 0;
                return `
                  <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:32px;height:32px;border-radius:9px;background:${cat.category_color}20;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                      <iconify-icon icon="${cat.category_icon}" style="font-size:16px;color:${cat.category_color};"></iconify-icon>
                    </div>
                    <div style="flex:1;min-width:0;">
                      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                        <span style="font-size:14px;font-weight:500;color:var(--text-primary);">${cat.category_name}</span>
                        <span style="font-family:'Cabinet Grotesk',sans-serif;font-weight:700;font-size:14px;color:var(--text-primary);">${formatCurrency(cat.total)}</span>
                      </div>
                      <div style="height:5px;background:var(--border);border-radius:999px;overflow:hidden;">
                        <div style="height:100%;width:${pct}%;background:${cat.category_color};border-radius:999px;"></div>
                      </div>
                    </div>
                    <span style="font-size:12px;color:var(--text-muted);min-width:36px;text-align:right;">${pct}%</span>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Daily Spending -->
        ${report.daily.length > 0 ? `
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;margin-bottom:32px;box-shadow:var(--shadow-sm);">
            <h2 style="font-family:'Cabinet Grotesk',sans-serif;font-weight:700;font-size:17px;margin-bottom:16px;color:var(--text-primary);">Daily Spending</h2>
            <div style="display:flex;flex-direction:column;gap:1px;background:var(--border);border-radius:var(--radius-sm);overflow:hidden;">
              ${(() => {
                let running = 0;
                return report.daily.map(day => {
                  running += day.total;
                  const date = new Date(day.date + 'T00:00:00');
                  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNum = date.getDate();
                  return `
                    <div style="display:flex;align-items:center;padding:10px 14px;background:var(--bg-card);">
                      <span style="font-size:13px;color:var(--text-muted);min-width:80px;">${dayName} ${dayNum}</span>
                      <span style="flex:1;font-family:'Cabinet Grotesk',sans-serif;font-weight:700;font-size:14px;color:var(--text-primary);">${formatCurrency(day.total)}</span>
                      <span style="font-size:12px;color:var(--text-muted);">Σ ${formatCompact(running)}</span>
                    </div>
                  `;
                }).join('');
              })()}
            </div>
          </div>
        ` : ''}

        <!-- Export -->
        <div style="text-align:center;padding:16px 0;">
          <button id="export-report" style="display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:12px;border:1px solid var(--border-strong);background:var(--bg-card);color:var(--text-secondary);font-family:'Cabinet Grotesk',sans-serif;font-weight:600;font-size:14px;cursor:pointer;transition:background 0.2s,color 0.2s;">
            <iconify-icon icon="${ICONS.download}"></iconify-icon>
            Print Report
          </button>
        </div>
      </div>
    `;

    // Event listeners
    document.getElementById('prev-month')?.addEventListener('click', () => {
      currentMonth = getPrevMonth(currentMonth);
      render(currentMonth);
    });

    document.getElementById('next-month')?.addEventListener('click', () => {
      if (currentMonth < currentRealMonth) {
        currentMonth = getNextMonth(currentMonth);
        render(currentMonth);
      }
    });

    document.getElementById('export-report')?.addEventListener('click', () => {
      window.print();
    });
  }

  await render(currentMonth);
}
