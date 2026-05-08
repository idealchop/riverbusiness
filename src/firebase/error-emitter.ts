'use client';

import { FirestorePermissionError } from './errors';

type ErrorEvents = {
  'permission-error': (error: FirestorePermissionError) => void;
};

type Listener<K extends keyof ErrorEvents> = ErrorEvents[K];

/**
 * A simple browser-compatible event emitter to avoid Node.js 'events' dependency
 * which can cause "Illegal constructor" errors in some browser environments.
 */
class SimpleEventEmitter {
  private listeners: { [K in keyof ErrorEvents]?: Listener<K>[] } = {};

  on<K extends keyof ErrorEvents>(event: K, listener: Listener<K>): this {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]?.push(listener);
    return this;
  }

  off<K extends keyof ErrorEvents>(event: K, listener: Listener<K>): this {
    if (!this.listeners[event]) return this;
    this.listeners[event] = this.listeners[event]?.filter(l => l !== listener);
    return this;
  }

  removeListener<K extends keyof ErrorEvents>(event: K, listener: Listener<K>): this {
    return this.off(event, listener);
  }

  emit<K extends keyof ErrorEvents>(event: K, ...args: Parameters<ErrorEvents[K]>): boolean {
    const listeners = this.listeners[event];
    if (!listeners || listeners.length === 0) return false;
    listeners.forEach(l => l(...args));
    return true;
  }
}

export const errorEmitter = new SimpleEventEmitter();
