import type { Component } from 'svelte';

export type Route = {
  id: string;
  label: string;
  component: Component<any>;
  /** Not shown in header nav (e.g. detail views reached by row click). */
  hidden?: boolean;
};

class Router {
  routes = $state<Route[]>([]);
  currentId = $state('home');
  /** Per-navigation params, e.g. record id for detail views. */
  params = $state<Record<string, unknown>>({});

  get current(): Route | undefined {
    return this.routes.find((r) => r.id === this.currentId);
  }

  register(...routes: Route[]): void {
    this.routes.push(...routes);
  }

  go(id: string, params: Record<string, unknown> = {}): void {
    if (!this.routes.some((r) => r.id === id)) return;
    this.params = params;
    this.currentId = id;
  }
}

export const router = new Router();
