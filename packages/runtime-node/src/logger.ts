import type { LoggerAdapter } from '@ottervoice/core';

/**
 * Minimal console surface accepted by {@link ConsoleLogger} and
 * {@link NodeRuntimeOptions.logger}.
 */
export interface ConsoleLike {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

/** {@link LoggerAdapter} that forwards to `console` (or an injected console). */
export class ConsoleLogger implements LoggerAdapter {
  constructor(private readonly out: ConsoleLike = console) {}

  debug(...args: unknown[]): void {
    this.out.debug(...args);
  }

  info(...args: unknown[]): void {
    this.out.info(...args);
  }

  warn(...args: unknown[]): void {
    this.out.warn(...args);
  }

  error(...args: unknown[]): void {
    this.out.error(...args);
  }
}
