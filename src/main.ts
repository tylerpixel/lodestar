import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { registerModule } from './core/module';
import { coreManifest } from './core';
import { homeManifest } from './home';
import { router } from './core/router.svelte';
import { palette } from './core/command-palette/registry.svelte';
import { updater } from './core/updater.svelte';

// Boot order per PRD: db → migrations → module registration → router → mount.
async function boot() {
  await registerModule(coreManifest);
  await registerModule(homeManifest);

  palette.register(
    ...router.routes.map((r) => ({
      id: `nav:${r.id}`,
      label: `Go to ${r.label}`,
      run: () => router.go(r.id),
    })),
    {
      id: 'app:check-updates',
      label: 'Check for updates',
      run: () => void updater.check(),
    }
  );

  mount(App, { target: document.getElementById('app')! });
  void updater.check();
}

boot().catch((e) => {
  const el = document.getElementById('app')!;
  el.innerHTML = '';
  const pre = document.createElement('pre');
  pre.className = 'boot-error';
  pre.textContent = `Boot failed:\n${e}`;
  el.appendChild(pre);
});
