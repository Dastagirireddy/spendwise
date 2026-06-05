import { ICONS, PAYMENT_TYPES } from '../icons';
import { getCategories, addExpense } from '../db';
import { getToday } from '../utils/format';

export async function showAddExpenseModal(onSave?: () => void): Promise<void> {
  const categories = await getCategories();
  const today = getToday();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>Add Expense</h2>
        <button class="modal-close" id="modal-close">
          <iconify-icon icon="${ICONS.close}"></iconify-icon>
        </button>
      </div>
      <form id="expense-form" class="expense-form">
        <div class="form-group amount-group">
          <label for="amount">Amount</label>
          <div class="amount-input-wrap">
            <span class="currency-symbol">₹</span>
            <input type="number" id="amount" name="amount" step="0.01" min="0.01" placeholder="0.00" required autofocus />
          </div>
        </div>

        <div class="form-group">
          <label for="description">Description (optional)</label>
          <input type="text" id="description" name="description" placeholder="What did you spend on?" />
        </div>

        <div class="form-group">
          <label>Category</label>
          <div class="category-grid">
            ${categories.map((cat, i) => `
              <button type="button" class="category-chip ${i === 0 ? 'selected' : ''}"
                      data-id="${cat.id}" data-color="${cat.color}">
                <span class="chip-icon" style="color: ${cat.color}"><iconify-icon icon="${cat.icon}"></iconify-icon></span>
                <span class="chip-name">${cat.name}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label for="payment-type">Payment Method</label>
          <select id="payment-type" class="modal-select">
            ${PAYMENT_TYPES.map(pt => `<option value="${pt.value}">${pt.label}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label for="date">Date</label>
          <input type="date" id="date" name="date" value="${today}" required />
        </div>

        <button type="submit" class="clay-btn-primary" style="width:100%;height:44px;margin-top:8px;">
          <iconify-icon icon="${ICONS.check}"></iconify-icon>
          <span>Add Expense</span>
        </button>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => {
    overlay.remove();
  };

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  overlay.querySelector('#modal-close')?.addEventListener('click', closeModal);

  const form = document.getElementById('expense-form') as HTMLFormElement;
  const chips = overlay.querySelectorAll('.category-chip');
  let selectedCategoryId = categories[0]?.id;

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      selectedCategoryId = parseInt((chip as HTMLElement).dataset.id!);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const amountInput = document.getElementById('amount') as HTMLInputElement;
    const descInput = document.getElementById('description') as HTMLInputElement;
    const dateInput = document.getElementById('date') as HTMLInputElement;
    const paymentTypeSelect = document.getElementById('payment-type') as HTMLSelectElement;

    const amount = parseFloat(amountInput.value);
    const description = descInput.value.trim();
    const date = dateInput.value;
    const paymentType = paymentTypeSelect.value;

    if (!amount || amount <= 0 || !selectedCategoryId || !date) return;

    await addExpense(amount, description, selectedCategoryId, date, paymentType);
    closeModal();
    onSave?.();
  });
}

export async function renderAddExpense(container: HTMLElement): Promise<void> {
  const categories = await getCategories();
  const today = getToday();

  container.innerHTML = `
    <div class="add-expense">
      <div class="form-header">
        <h1>Add Expense</h1>
        <span class="date-badge">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
      </div>

      <form id="expense-form" class="expense-form">
        <div class="form-group amount-group">
          <label for="amount">Amount</label>
          <div class="amount-input-wrap">
            <span class="currency-symbol">₹</span>
            <input type="number" id="amount" name="amount" step="0.01" min="0.01" placeholder="0.00" required autofocus />
          </div>
        </div>

        <div class="form-group">
          <label for="description">Description (optional)</label>
          <input type="text" id="description" name="description" placeholder="What did you spend on?" />
        </div>

        <div class="form-group">
          <label>Category</label>
          <div class="category-grid">
            ${categories.map((cat, i) => `
              <button type="button" class="category-chip ${i === 0 ? 'selected' : ''}"
                      data-id="${cat.id}" data-color="${cat.color}">
                <span class="chip-icon" style="color: ${cat.color}"><iconify-icon icon="${cat.icon}"></iconify-icon></span>
                <span class="chip-name">${cat.name}</span>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label for="payment-type">Payment Method</label>
          <select id="payment-type" class="modal-select">
            ${PAYMENT_TYPES.map(pt => `<option value="${pt.value}">${pt.label}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label for="date">Date</label>
          <input type="date" id="date" name="date" value="${today}" required />
        </div>

        <button type="submit" class="submit-btn">
          <span>Add Expense</span>
          <iconify-icon icon="${ICONS.arrowRight}" class="btn-icon"></iconify-icon>
        </button>
      </form>

      <div id="success-msg" class="success-msg hidden">
        <span class="success-icon"><iconify-icon icon="${ICONS.check}"></iconify-icon></span>
        <span>Expense added successfully!</span>
      </div>
    </div>
  `;

  const form = document.getElementById('expense-form') as HTMLFormElement;
  const chips = container.querySelectorAll('.category-chip');
  let selectedCategoryId = categories[0]?.id;

  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');
      selectedCategoryId = parseInt((chip as HTMLElement).dataset.id!);
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const amountInput = document.getElementById('amount') as HTMLInputElement;
    const descInput = document.getElementById('description') as HTMLInputElement;
    const dateInput = document.getElementById('date') as HTMLInputElement;
    const paymentTypeSelect = document.getElementById('payment-type') as HTMLSelectElement;

    const amount = parseFloat(amountInput.value);
    const description = descInput.value.trim();
    const date = dateInput.value;
    const paymentType = paymentTypeSelect.value;

    if (!amount || amount <= 0 || !selectedCategoryId || !date) return;

    await addExpense(amount, description, selectedCategoryId, date, paymentType);

    const successMsg = document.getElementById('success-msg')!;
    successMsg.classList.remove('hidden');
    setTimeout(() => successMsg.classList.add('hidden'), 2000);

    form.reset();
    dateInput.value = today;
    paymentTypeSelect.value = 'cash';
    chips.forEach(c => c.classList.remove('selected'));
    if (chips[0]) chips[0].classList.add('selected');
    selectedCategoryId = categories[0]?.id;
  });
}
