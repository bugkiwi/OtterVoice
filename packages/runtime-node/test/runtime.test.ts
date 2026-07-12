import { describe, expect, it, mock, spyOn } from 'bun:test';
import { createNodeRuntime } from '../src/index';
import { ConsoleLogger } from '../src/logger';
import { NodeAudioInput, NodeAudioOutput } from '../src/audio';
import { NodeNetworkAdapter } from '../src/network';

describe('ConsoleLogger', () => {
  it('forwards each level to the injected console', () => {
    const calls: string[] = [];
    const fake = {
      debug: (...a: unknown[]) => calls.push(`debug:${a.join(',')}`),
      info: (...a: unknown[]) => calls.push(`info:${a.join(',')}`),
      warn: (...a: unknown[]) => calls.push(`warn:${a.join(',')}`),
      error: (...a: unknown[]) => calls.push(`error:${a.join(',')}`),
    };
    const log = new ConsoleLogger(fake);
    log.debug('a');
    log.info('b');
    log.warn('c');
    log.error('d');
    expect(calls).toEqual(['debug:a', 'info:b', 'warn:c', 'error:d']);
  });

  it('defaults to the global console', () => {
    const spy = spyOn(console, 'info').mockImplementation(() => {});
    new ConsoleLogger().info('hi');
    expect(spy).toHaveBeenCalledWith('hi');
    spy.mockRestore();
  });
});

describe('createNodeRuntime', () => {
  it('assembles input, output, network and a default logger', () => {
    const runtime = createNodeRuntime();
    expect(runtime.audioInput).toBeInstanceOf(NodeAudioInput);
    expect(runtime.audioOutput).toBeInstanceOf(NodeAudioOutput);
    expect(runtime.network).toBeInstanceOf(NodeNetworkAdapter);
    expect(runtime.logger).toBeInstanceOf(ConsoleLogger);
  });

  it('omits the logger when disabled', () => {
    expect(createNodeRuntime({ logger: false }).logger).toBeUndefined();
  });

  it('redirects the logger to a custom console', () => {
    const calls: string[] = [];
    const runtime = createNodeRuntime({
      logger: {
        debug: () => {},
        info: (...a: unknown[]) => calls.push(String(a[0])),
        warn: () => {},
        error: () => {},
      },
    });
    runtime.logger?.info('routed');
    expect(calls).toEqual(['routed']);
  });

  it('wires network options through to the adapter', async () => {
    const response = new Response('ok');
    const fetchImpl = mock(async () => response);
    const runtime = createNodeRuntime({ network: { fetch: fetchImpl } });
    expect(await runtime.network.fetch('https://x')).toBe(response);
    expect(fetchImpl).toHaveBeenCalled();
  });
});
