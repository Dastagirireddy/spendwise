import './icons';
import type { View } from './types';
import { renderDashboard } from './components/dashboard';
import { renderSettings } from './components/settings';
import { renderReports } from './components/reports';
import { seedTestData, getExpenseCount, getProfiles, addProfile, switchProfile, getActiveProfileId } from './db';
import { checkForUpdates } from './updater';

(window as any).seedTestData = seedTestData;

async function autoSeedIfNeeded(): Promise<void> {
  try {
    const count = await getExpenseCount();
    if (count === 0) {
      await seedTestData();
    }
  } catch {
    // DB not ready yet, skip
  }
}

function setActiveTab(view: View): void {
  document.querySelectorAll('.tab-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-view') === view);
  });
}

async function navigate(view: View): Promise<void> {
  setActiveTab(view);

  const content = document.getElementById('app-content');
  if (!content) return;

  content.innerHTML = '<div class="loading">Loading...</div>';

  try {
    switch (view) {
      case 'dashboard':
        await renderDashboard(content);
        break;
      case 'reports':
        await renderReports(content);
        break;
      case 'settings':
        await renderSettings(content);
        break;
    }
  } catch (err) {
    console.error('Render error:', err);
    content.innerHTML = `<div class="empty-state" style="flex-direction:column;gap:12px;padding:48px;">
      <iconify-icon icon="lucide:alert-triangle" style="font-size:32px;color:var(--error);"></iconify-icon>
      <span style="color:var(--error);font-weight:600;">Something went wrong</span>
      <span style="color:var(--text-muted);font-size:13px;">${err instanceof Error ? err.message : String(err)}</span>
    </div>`;
  }
}

function initTheme(): void {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved ?? (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
}

function toggleTheme(): void {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

// Profile Switcher
async function initProfileSwitcher(): Promise<void> {
  const profiles = await getProfiles();
  const activeId = getActiveProfileId();
  const activeProfile = profiles.find(p => p.id === activeId) ?? profiles[0];

  // Update button text
  const nameEl = document.querySelector('.profile-name');
  if (nameEl && activeProfile) {
    nameEl.textContent = activeProfile.name;
  }

  // Build dropdown
  const dropdown = document.getElementById('profile-dropdown');
  if (!dropdown) return;

  dropdown.innerHTML = `
    ${profiles.map(p => `
      <button class="profile-dropdown-item ${p.id === activeId ? 'active' : ''}" data-profile-id="${p.id}">
        <iconify-icon icon="lucide:user" class="item-icon"></iconify-icon>
        ${p.name}
      </button>
    `).join('')}
    <div class="profile-dropdown-divider"></div>
    <button class="profile-dropdown-add" id="add-profile-btn">
      <iconify-icon icon="lucide:user-plus" class="item-icon"></iconify-icon>
      Add Profile
    </button>
  `;

  // Profile switch
  dropdown.querySelectorAll('.profile-dropdown-item').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt((btn as HTMLElement).dataset.profileId!);
      await switchProfile(id);
      closeProfileDropdown();
      // Re-init profile switcher and re-render current view
      await initProfileSwitcher();
      const activeView = document.querySelector('.tab-item.active')?.getAttribute('data-view') as View;
      if (activeView) navigate(activeView);
    });
  });

  // Add profile
  document.getElementById('add-profile-btn')?.addEventListener('click', async () => {
    const name = prompt('Profile name:');
    if (name && name.trim()) {
      await addProfile(name.trim());
      await initProfileSwitcher();
    }
    closeProfileDropdown();
  });
}

function closeProfileDropdown(): void {
  document.getElementById('profile-switcher')?.classList.remove('open');
}

function toggleProfileDropdown(): void {
  document.getElementById('profile-switcher')?.classList.toggle('open');
}

window.addEventListener('DOMContentLoaded', async () => {
  initTheme();

  // Theme toggle
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);

  // Profile switcher toggle
  document.getElementById('profile-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleProfileDropdown();
  });

  // Close profile dropdown on outside click
  document.addEventListener('click', (e) => {
    const switcher = document.getElementById('profile-switcher');
    if (switcher && !switcher.contains(e.target as Node)) {
      closeProfileDropdown();
    }
  });

  await autoSeedIfNeeded();
  await initProfileSwitcher();

  // Check for updates silently on startup (non-blocking)
  checkForUpdates(true).catch(console.error);

  document.querySelectorAll('.tab-item').forEach(item => {
    item.addEventListener('click', () => {
      const view = item.getAttribute('data-view') as View;
      if (view) navigate(view);
    });
  });

  navigate('dashboard');
});
