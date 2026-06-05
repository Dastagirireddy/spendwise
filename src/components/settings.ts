import { ICONS, CATEGORY_ICONS, PAYMENT_TYPES } from '../icons';
import { formatCurrency, getCurrentMonth } from '../utils/format';
import {
  getBudget, setBudget, setIncome,
  getCategories, addCategory, deleteCategory,
  getAllFixedExpenses, addFixedExpense, deleteFixedExpense, toggleFixedExpenseActive,
  getSavingsGoal, setSavingsGoal,
  getProfiles, addProfile, deleteProfile, getActiveProfileId
} from '../db';

const PRESET_COLORS = [
  '#D84C2A', '#1A6B4A', '#C97B1A', '#5C3AB7',
  '#1A6B4A', '#C97B1A', '#9C9890', '#7EB8D4',
  '#C97DA0', '#A8B8A0', '#D47A7A', '#8A7AC4',
];

export async function showAddCategoryModal(onSave?: () => void): Promise<void> {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>Add Category</h2>
        <button class="modal-close" id="modal-close">
          <iconify-icon icon="${ICONS.close}"></iconify-icon>
        </button>
      </div>
      <form id="category-form" class="category-form">
        <div class="form-group">
          <label for="cat-name">Name</label>
          <input type="text" id="cat-name" placeholder="Category name" required autofocus />
        </div>

        <div class="form-group">
          <label>Icon</label>
          <div class="icon-picker modal-picker" id="icon-picker">
            ${CATEGORY_ICONS.map((item, i) => `
              <button type="button" class="icon-option ${i === 0 ? 'selected' : ''}" data-icon="${item.name}" title="${item.label}">
                <iconify-icon icon="${item.name}"></iconify-icon>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label>Color</label>
          <div class="color-picker modal-picker" id="color-picker">
            ${PRESET_COLORS.map((color, i) => `
              <button type="button" class="color-option ${i === 0 ? 'selected' : ''}" data-color="${color}" style="background: ${color}"></button>
            `).join('')}
          </div>
        </div>

        <button type="submit" class="clay-btn-primary" style="width:100%;height:44px;margin-top:8px;">
          <iconify-icon icon="${ICONS.check}"></iconify-icon>
          <span>Add Category</span>
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => overlay.remove();

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  overlay.querySelector('#modal-close')?.addEventListener('click', closeModal);

  let selectedIcon: string = CATEGORY_ICONS[0].name;
  let selectedColor: string = PRESET_COLORS[0];

  overlay.querySelectorAll('#icon-picker .icon-option').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('#icon-picker .icon-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedIcon = (btn as HTMLElement).dataset.icon!;
    });
  });

  overlay.querySelectorAll('#color-picker .color-option').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelectorAll('#color-picker .color-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedColor = (btn as HTMLElement).dataset.color!;
    });
  });

  const form = overlay.querySelector('#category-form') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = overlay.querySelector('#cat-name') as HTMLInputElement;
    const name = nameInput.value.trim();
    if (!name) return;
    try {
      await addCategory(name, selectedIcon, selectedColor);
      closeModal();
      onSave?.();
    } catch {
      alert('Category already exists!');
    }
  });
}

export async function showAddFixedExpenseModal(categories: { id: number; name: string }[], onSave?: () => void): Promise<void> {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>Add Fixed Expense</h2>
        <button class="modal-close" id="modal-close">
          <iconify-icon icon="${ICONS.close}"></iconify-icon>
        </button>
      </div>
      <form id="fixed-form" class="fixed-form">
        <div class="form-group">
          <label for="fixed-name">Name</label>
          <input type="text" id="fixed-name" placeholder="e.g. Rent, EMI, Netflix" required autofocus />
        </div>

        <div class="form-group">
          <label for="fixed-amount">Amount</label>
          <div class="amount-input-wrap">
            <span class="currency-symbol">₹</span>
            <input type="number" id="fixed-amount" step="any" min="1" placeholder="0" required />
          </div>
        </div>

        <div class="form-group">
          <label for="fixed-category">Category (optional)</label>
          <select id="fixed-category" class="modal-select">
            <option value="">None</option>
            ${categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label for="fixed-payment-type">Payment Method</label>
          <select id="fixed-payment-type" class="modal-select">
            ${PAYMENT_TYPES.map(pt => `<option value="${pt.value}">${pt.label}</option>`).join('')}
          </select>
        </div>

        <button type="submit" class="clay-btn-primary" style="width:100%;height:44px;margin-top:8px;">
          <iconify-icon icon="${ICONS.check}"></iconify-icon>
          <span>Add Fixed Expense</span>
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => overlay.remove();

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  overlay.querySelector('#modal-close')?.addEventListener('click', closeModal);

  const form = overlay.querySelector('#fixed-form') as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = overlay.querySelector('#fixed-name') as HTMLInputElement;
    const amountInput = overlay.querySelector('#fixed-amount') as HTMLInputElement;
    const catSelect = overlay.querySelector('#fixed-category') as HTMLSelectElement;
    const paymentTypeSelect = overlay.querySelector('#fixed-payment-type') as HTMLSelectElement;
    const name = nameInput.value.trim();
    const amount = parseFloat(amountInput.value);
    if (!name || isNaN(amount) || amount <= 0) return;
    const catId = catSelect.value ? parseInt(catSelect.value) : null;
    const paymentType = paymentTypeSelect.value;
    await addFixedExpense(name, amount, catId, paymentType);
    closeModal();
    onSave?.();
  });
}

export async function renderSettings(container: HTMLElement): Promise<void> {
  container.innerHTML = '<div class="loading">Loading...</div>';

  const month = getCurrentMonth();
  const [budget, categories, allExpenses, savingsGoal, profiles] = await Promise.all([
    getBudget(month),
    getCategories(),
    getAllFixedExpenses(),
    getSavingsGoal(month),
    getProfiles(),
  ]);

  const budgetAmount = budget?.amount ?? 0;
  const income = budget?.income ?? 0;
  const activeProfileId = getActiveProfileId();

  container.innerHTML = `
    <div class="settings-page">
      <div class="dashboard-hero">
        <div class="hero-text">
          <h1>Settings</h1>
          <p class="hero-subtitle">Budget, categories, and fixed expenses</p>
        </div>
      </div>

      <!-- Profiles -->
      <div class="settings-section" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;box-shadow:var(--shadow-sm);margin-bottom:24px;">
        <div class="section-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <h2 style="font-family:'Cabinet Grotesk',sans-serif;font-weight:700;font-size:17px;color:var(--text-primary);">Profiles</h2>
          <button id="add-profile-btn" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:10px;border:none;background:var(--accent);color:white;font-family:'Cabinet Grotesk',sans-serif;font-weight:600;font-size:13px;cursor:pointer;">
            <iconify-icon icon="lucide:user-plus" style="font-size:14px;"></iconify-icon>
            Add
          </button>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${profiles.map(p => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-radius:10px;background:${p.id === activeProfileId ? 'var(--accent-light)' : 'var(--bg)'};border:1px solid ${p.id === activeProfileId ? 'rgba(26,107,74,0.2)' : 'var(--border)'};">
              <div style="display:flex;align-items:center;gap:10px;">
                <iconify-icon icon="lucide:user" style="font-size:16px;color:${p.id === activeProfileId ? 'var(--accent)' : 'var(--text-muted)'};"></iconify-icon>
                <span style="font-size:14px;font-weight:${p.id === activeProfileId ? '600' : '500'};color:var(--text-primary);">${p.name}</span>
                ${p.id === activeProfileId ? '<span style="font-size:11px;color:var(--accent);background:var(--accent-light);padding:2px 8px;border-radius:999px;font-weight:600;">Active</span>' : ''}
              </div>
              ${p.id !== 1 ? `<button class="delete-profile-btn" data-id="${p.id}" style="border:none;background:none;cursor:pointer;color:var(--text-muted);padding:4px;"><iconify-icon icon="lucide:trash-2" style="font-size:14px;"></iconify-icon></button>` : ''}
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Monthly Budget -->
      <div class="settings-section" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;box-shadow:var(--shadow-sm);margin-bottom:24px;">
        <h2 style="font-family:'Cabinet Grotesk',sans-serif;font-weight:700;font-size:17px;margin-bottom:16px;color:var(--text-primary);">Monthly Budget</h2>
        <div class="budget-form">
          <div class="budget-input-group">
            <label>Income</label>
            <div class="budget-input-wrap">
              <span class="currency-symbol">₹</span>
              <input type="number" id="income-input" value="${income}" step="1000" min="0" placeholder="Set income" />
            </div>
          </div>
          <div class="budget-input-group">
            <label>Budget</label>
            <div class="budget-input-wrap">
              <span class="currency-symbol">₹</span>
              <input type="number" id="budget-input" value="${budgetAmount}" step="1000" min="0" placeholder="Set budget" />
            </div>
          </div>
          <button id="save-budget-btn" class="clay-btn-primary">Save</button>
        </div>
      </div>

      <!-- Savings Goal -->
      <div class="settings-section" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;box-shadow:var(--shadow-sm);margin-bottom:24px;">
        <h2 style="font-family:'Cabinet Grotesk',sans-serif;font-weight:700;font-size:17px;margin-bottom:16px;color:var(--text-primary);">Savings Goal</h2>
        <div class="budget-form">
          <div class="budget-input-group">
            <label>Goal Name</label>
            <input type="text" id="goal-name-input" value="${savingsGoal?.name ?? ''}" placeholder="e.g. Emergency Fund" style="width:100%;padding:8px 12px;border-radius:8px;border:1px solid var(--border-strong);background:var(--bg);font-family:inherit;font-size:14px;color:var(--text-primary);" />
          </div>
          <div class="budget-input-group">
            <label>Target Amount</label>
            <div class="budget-input-wrap">
              <span class="currency-symbol">₹</span>
              <input type="number" id="goal-target-input" value="${savingsGoal?.target_amount ?? ''}" step="1000" min="0" placeholder="Set target" />
            </div>
          </div>
          <button id="save-goal-btn" class="clay-btn-primary">Save Goal</button>
        </div>
      </div>

      <!-- Categories -->
      <div class="settings-section" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;box-shadow:var(--shadow-sm);margin-bottom:24px;">
        <div class="section-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <h2 style="font-family:'Cabinet Grotesk',sans-serif;font-weight:700;font-size:17px;color:var(--text-primary);">Categories</h2>
          <button id="add-cat-btn" class="clay-btn-primary small">
            <iconify-icon icon="lucide:plus"></iconify-icon>
            Add
          </button>
        </div>
        <div class="cat-grid">
          ${categories.map(cat => `
            <div class="cat-item" data-id="${cat.id}">
              <div class="cat-item-icon" style="background: ${cat.color}"><iconify-icon icon="${cat.icon}"></iconify-icon></div>
              <span class="cat-item-name">${cat.name}</span>
              <button class="cat-delete-btn" data-id="${cat.id}" title="Delete"><iconify-icon icon="lucide:x"></iconify-icon></button>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Fixed Expenses -->
      <div class="settings-section" style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);padding:24px;box-shadow:var(--shadow-sm);margin-bottom:24px;">
        <div class="section-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <h2 style="font-family:'Cabinet Grotesk',sans-serif;font-weight:700;font-size:17px;color:var(--text-primary);">Fixed Expenses</h2>
          <button id="add-fixed-btn" class="clay-btn-primary small">
            <iconify-icon icon="lucide:plus"></iconify-icon>
            Add
          </button>
        </div>
        ${allExpenses.length > 0 ? `
          <div class="fixed-manage-list">
            ${allExpenses.map(exp => `
              <div class="fixed-manage-item ${exp.is_active ? '' : 'inactive'}">
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
            <span>No fixed expenses yet</span>
          </div>
        `}
      </div>
    </div>
  `;

  // Profile management
  document.getElementById('add-profile-btn')?.addEventListener('click', async () => {
    const name = prompt('Profile name:');
    if (name && name.trim()) {
      await addProfile(name.trim());
      renderSettings(container);
    }
  });

  container.querySelectorAll('.delete-profile-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt((btn as HTMLElement).dataset.id!);
      if (confirm('Delete this profile?')) {
        await deleteProfile(id);
        renderSettings(container);
      }
    });
  });

  // Budget/Income
  document.getElementById('save-budget-btn')?.addEventListener('click', async () => {
    const incInput = document.getElementById('income-input') as HTMLInputElement;
    const budInput = document.getElementById('budget-input') as HTMLInputElement;
    const incVal = parseFloat(incInput.value);
    const budVal = parseFloat(budInput.value);
    if (!isNaN(incVal) && incVal >= 0) await setIncome(month, incVal);
    if (!isNaN(budVal) && budVal >= 0) await setBudget(month, budVal);
    renderSettings(container);
  });

  // Savings Goal
  document.getElementById('save-goal-btn')?.addEventListener('click', async () => {
    const nameInput = document.getElementById('goal-name-input') as HTMLInputElement;
    const targetInput = document.getElementById('goal-target-input') as HTMLInputElement;
    const name = nameInput.value.trim() || 'Savings Goal';
    const target = parseFloat(targetInput.value);
    if (!isNaN(target) && target > 0) {
      await setSavingsGoal(name, target, month);
      renderSettings(container);
    }
  });

  // Category add button opens modal
  document.getElementById('add-cat-btn')?.addEventListener('click', () => {
    showAddCategoryModal(() => renderSettings(container));
  });

  document.querySelectorAll('.cat-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt((btn as HTMLElement).dataset.id!);
      if (confirm('Delete this category?')) {
        await deleteCategory(id);
        renderSettings(container);
      }
    });
  });

  // Fixed expenses
  document.getElementById('add-fixed-btn')?.addEventListener('click', () => {
    showAddFixedExpenseModal(categories, () => renderSettings(container));
  });

  container.querySelectorAll('.fixed-toggle-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt((btn as HTMLElement).dataset.id!);
      const isActive = (btn as HTMLElement).dataset.active === '1';
      await toggleFixedExpenseActive(id, !isActive);
      renderSettings(container);
    });
  });

  container.querySelectorAll('.fixed-delete-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt((btn as HTMLElement).dataset.id!);
      await deleteFixedExpense(id);
      renderSettings(container);
    });
  });
}
