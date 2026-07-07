import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

class Updater {
  status = $state('idle');
  pending = $state<Update | null>(null);

  async check(): Promise<void> {
    this.status = 'checking for updates…';
    this.pending = null;
    try {
      const update = await check();
      if (update) {
        this.pending = update;
        this.status = `v${update.version} available`;
      } else {
        this.status = 'up to date';
      }
    } catch (e) {
      this.status = `update check failed: ${e}`;
    }
  }

  async install(): Promise<void> {
    if (!this.pending) return;
    try {
      this.status = `downloading v${this.pending.version}…`;
      await this.pending.downloadAndInstall();
      this.status = 'installed — relaunching';
      await relaunch();
    } catch (e) {
      this.status = `install failed: ${e}`;
    }
  }
}

export const updater = new Updater();
