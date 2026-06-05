import { CATEGORY_ICONS } from '../icons';
import { getCategories, addCategory, deleteCategory } from '../db';

const PRESET_COLORS = [
  '#a8e6cf', '#88d8f7', '#ffeaa7', '#ffb8b8',
  '#d4a5ff', '#fdcb6e', '#55efc4', '#74b9ff',
  '#fab1a0', '#dfe6e9', '#ff7675', '#a29bfe',
];

export async function renderCategories(container: HTMLElement): Promise<void> {
  const categories = await getCategories();

  container.innerHTML = `
    <div class="categories-page">
      <div class="form-header">
        <h1>Categories</h1>
        <span class="date-badge">${categories.length} categories</span>
      </div>

      <div class="add-category-form clay-card">
        <h2 class="section-title">Add New Category</h2>
        <div class="cat-form-row">
          <div class="form-group compact">
            <label for="cat-name">Name</label>
            <input type="text" id="cat-name" placeholder="Category name" />
          </div>
          <div class="form-group compact">
            <label>Icon</label>
            <div class="icon-picker" id="icon-picker">
              ${CATEGORY_ICONS.map((item, i) => `
                <button type="button" class="icon-option ${i === 0 ? 'selected' : ''}" data-icon="${item.name}" title="${item.label}">
                  <iconify-icon icon="${item.name}"></iconify-icon>
                </button>
              `).join('')}
            </div>
          </div>
          <div class="form-group compact">
            <label>Color</label>
            <div class="color-picker" id="color-picker">
              ${PRESET_COLORS.map((color, i) => `
                <button type="button" class="color-option ${i === 0 ? 'selected' : ''}" data-color="${color}" style="background: ${color}"></button>
              `).join('')}
            </div>
          </div>
          <button id="add-cat-btn" class="clay-btn-primary add-cat-btn">Add</button>
        </div>
      </div>

      <div class="existing-categories clay-card">
        <h2 class="section-title">Existing Categories</h2>
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
    </div>
  `;

  let selectedIcon: string = CATEGORY_ICONS[0].name;
  let selectedColor: string = PRESET_COLORS[0];

  document.querySelectorAll('#icon-picker .icon-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#icon-picker .icon-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedIcon = (btn as HTMLElement).dataset.icon!;
    });
  });

  document.querySelectorAll('#color-picker .color-option').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#color-picker .color-option').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedColor = (btn as HTMLElement).dataset.color!;
    });
  });

  document.getElementById('add-cat-btn')?.addEventListener('click', async () => {
    const nameInput = document.getElementById('cat-name') as HTMLInputElement;
    const name = nameInput.value.trim();
    if (!name) return;

    try {
      await addCategory(name, selectedIcon, selectedColor);
      nameInput.value = '';
      renderCategories(container);
    } catch {
      alert('Category already exists!');
    }
  });

  document.querySelectorAll('.cat-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt((btn as HTMLElement).dataset.id!);
      if (confirm('Delete this category?')) {
        await deleteCategory(id);
        renderCategories(container);
      }
    });
  });
}
