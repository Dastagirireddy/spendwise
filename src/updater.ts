import { check } from '@tauri-apps/plugin-updater';
import { ask, message } from '@tauri-apps/plugin-dialog';
import { relaunch } from '@tauri-apps/plugin-process';

export async function checkForUpdates(silent: boolean = true): Promise<void> {
  try {
    const update = await check();
    if (update) {
      if (silent) {
        const yes = await ask(
          `A new version (v${update.version}) is available.\n\n${update.body ?? ''}`,
          {
            title: 'Update Available',
            kind: 'info',
            okLabel: 'Update & Restart',
            cancelLabel: 'Later',
          }
        );
        if (yes) {
          await update.downloadAndInstall();
          await relaunch();
        }
      } else {
        await update.downloadAndInstall();
        await relaunch();
      }
    } else if (!silent) {
      await message('You are on the latest version.', {
        title: 'No Update Available',
        kind: 'info',
      });
    }
  } catch (err) {
    console.error('Update check failed:', err);
  }
}
