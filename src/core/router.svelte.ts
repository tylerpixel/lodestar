import type { Component } from 'svelte';

export type Route = {
  id: string;
  label: string;
  component: Component<any>;
};

class Router {
  routes = $state<Route[]>([]);
  currentId = $state('home');

  get current(): Route | undefined {
    return this.routes.find((r) => r.id === this.currentId);
  }

  register(...routes: Route[]): void {
    this.routes.push(...routes);
  }

  go(id: string): void {
    if (this.routes.some((r) => r.id === id)) this.currentId = id;
  }
}

export const router = new Router();
