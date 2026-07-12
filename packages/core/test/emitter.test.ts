import { describe, expect, it, mock } from 'bun:test';
import { TypedEmitter } from '../src/emitter';

type Events = { ping: { n: number }; pong: string };

describe('TypedEmitter', () => {
  it('delivers payloads to on() listeners and counts them', () => {
    const em = new TypedEmitter<Events>();
    const seen: number[] = [];
    em.on('ping', (p) => seen.push(p.n));
    expect(em.listenerCount('ping')).toBe(1);
    em.emit('ping', { n: 1 });
    em.emit('ping', { n: 2 });
    expect(seen).toEqual([1, 2]);
  });

  it('emit with no listeners is a no-op', () => {
    const em = new TypedEmitter<Events>();
    expect(() => em.emit('pong', 'x')).not.toThrow();
    expect(em.listenerCount('pong')).toBe(0);
  });

  it('on() returns an unsubscribe that removes the listener', () => {
    const em = new TypedEmitter<Events>();
    const cb = mock(() => {});
    const off = em.on('ping', cb);
    off();
    em.emit('ping', { n: 1 });
    expect(cb).not.toHaveBeenCalled();
    expect(em.listenerCount('ping')).toBe(0);
  });

  it('once() fires exactly once', () => {
    const em = new TypedEmitter<Events>();
    const cb = mock(() => {});
    em.once('ping', cb);
    em.emit('ping', { n: 1 });
    em.emit('ping', { n: 2 });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('once() can be cancelled before firing', () => {
    const em = new TypedEmitter<Events>();
    const cb = mock(() => {});
    const off = em.once('ping', cb);
    off();
    em.emit('ping', { n: 1 });
    expect(cb).not.toHaveBeenCalled();
  });

  it('off() on an unknown event is safe', () => {
    const em = new TypedEmitter<Events>();
    expect(() => em.off('ping', () => {})).not.toThrow();
  });

  it('off() removes only the given callback', () => {
    const em = new TypedEmitter<Events>();
    const a = mock(() => {});
    const b = mock(() => {});
    em.on('ping', a);
    em.on('ping', b);
    em.off('ping', a);
    em.emit('ping', { n: 1 });
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('a listener unsubscribing during emit does not disturb iteration', () => {
    const em = new TypedEmitter<Events>();
    const order: string[] = [];
    const off = em.on('ping', () => {
      order.push('a');
      off();
    });
    em.on('ping', () => order.push('b'));
    em.emit('ping', { n: 1 });
    expect(order).toEqual(['a', 'b']);
    expect(em.listenerCount('ping')).toBe(1);
  });

  it('removeAllListeners clears everything', () => {
    const em = new TypedEmitter<Events>();
    em.on('ping', () => {});
    em.on('pong', () => {});
    em.removeAllListeners();
    expect(em.listenerCount('ping')).toBe(0);
    expect(em.listenerCount('pong')).toBe(0);
  });
});
