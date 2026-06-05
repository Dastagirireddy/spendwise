import { ICONS } from '../icons';
import { formatCurrency } from '../utils/format';
import {
  getAllFixedExpenses, addFixedExpense, deleteFixedExpense, toggleFixedExpenseActive,
  getCategories
} from '../db';

export async function renderFixedExpenses(container: HTMLElement): Promise<void> {
  container.innerHTML = '<div class="loading">Loading...</div>';

  const [allExpenses, categories] = await Promise.all([
    getAllFixedExpenses(),
    getCategories(),
  ]);

  const fixedTotal = allExpenses.filter(e => e.is_active).reduce((sum, e) => sum + e.amount, 0);
  const activeCount = allExpenses.filter(e => e.is_active).length;

  container.innerHTML = `
    <div class="fixed-page">
      <div class="dashboard-hero">
        <div class="hero-text">
          <h1>Fixed Expenses</h1>
          <p class="hero-subtitle">Recurring monthly commitments</p>
        </div>
        <span class="date-badge">${activeCount} active · ${formatCurrency(fixedTotal)}/mo</span>
      </div>

      <div class="fixed-manage-section clay-card">
        <h2 class="section-title">Add Fixed Expense</h2>
        <div class="add-fixed-form">
          <div class="fixed-form-row">
            <div class="form-group compact">
              <label>Name</label>
              <input type="text" id="fixed-name" placeholder="e.g. Rent, EMI" />
            </div>
            <div class="form-group compact">
              <label>Amount</label>
              <input type="number" id="fixed-amount" step="any" min="0" placeholder="0" />
            </div>
            <div class="form-group compact">
              <label>Category</label>
              <select id="fixed-category" class="fixed-select">
                <option value="">None</option>
                ${categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
              </select>
            </div>
            <button id="add-fixed-btn" class="clay-btn-primary">
              <iconify-icon icon="lucide:plus"></iconify-icon>
              Add
            </button>
          </div>
        </div>

        ${allExpenses.length > 0 ? `
          <div class="fixed-manage-list">
            ${allExpenses.map(exp => `
              <div class="fixed-manage-item ${exp.is_active ? '' : 'inactive'}">
                <div class="fixed-manage-icon" style="background: 'var(--surface-strong)'">
                  <iconify-icon icon="${ICONS.delete}"></iconify-icon>
                </div>
                <div class="fixed-manage-info">
                  <span class="fixed-manage-name">${exp.name}</span>
                  <span class="fixed-manage-cat">${exp.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <span class="fixed-manage-amount">${formatCurrency(exp.amount)}</span>
                <button class="fixed-toggle-btn" data-id="${exp.id}" data-active="${exp.is_active}">
                  <iconify-icon icon="${exp.is_active ? 'lucide:pause' : 'lucide:play'}"></iconify-icon>
                </button>
                <button class="fixed-delete-btn" data-id="${exp.id}">
                  <iconify-icon icon="${ICONS.delete}"></iconify-icon>
                </button>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="empty-state">
            <span>Add your first fixed expense above</span>
          </div>
        `}
      </div>
    </div>
  `;

  document.getElementById('add-fixed-btn')?.addEventListener('click', async () => {
    const nameInput = document.getElementById('fixed-name') as HTMLInputElement;
    const amountInput = document.getElementById('fixed-amount') as HTMLInputElement;
    const catSelect = document.getElementById('fixed-category') as HTMLSelectElement;
    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);
    if (!name || isNaN(amount) || amount <= 0) return;
    const catId = catSelect.value ? parseInt(catSelect.value) : null;
    await addFixedExpense(name, amount, catId);
    renderFixedExpenses(container);
  });

  container.querySelectorAll('.fixed-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt((btn as HTMLElement).dataset.id!);
      const isActive = (btn as HTMLElement).dataset.active === '1';
      await toggleFixedExpenseActive(id, !isActive);
      renderFixedExpenses(container);
    });
  });

  container.querySelectorAll('.fixed-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt((btn as HTMLElement).dataset.id!);
      await deleteFixedExpense(id);
      renderFixedExpenses(container);
    });
  });
}
