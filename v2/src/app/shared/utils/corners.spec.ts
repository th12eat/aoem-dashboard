import { describe, it, expect } from 'vitest';
import { cornerColor, fmtServer, serverNumber, ourServerNumber } from './corners';

describe('corners + server format', () => {
  it('maps corners to their canonical colours', () => {
    expect(cornerColor('North').color).toBe('#5b8bc4');
    expect(cornerColor('East').color).toBe('#9a6dd4');
    expect(cornerColor('South').color).toBe('#5aa87a');
    expect(cornerColor('West').color).toBe('#d4934a');
  });

  it('falls back to grey for an unknown corner', () => {
    expect(cornerColor('').color).toBe('#8a90a5');
    expect(cornerColor('Nowhere').color).toBe('#8a90a5');
  });

  it('formats a server number in the four house styles', () => {
    expect(fmtServer(8, 'full')).toBe('Era #008');
    expect(fmtServer(8, 'spaced')).toBe('Era 8');
    expect(fmtServer(8, 'hashed')).toBe('#008');
    expect(fmtServer(8, 'bare')).toBe('8');
    expect(fmtServer(39, 'full')).toBe('Era #039');
  });

  it('accepts already-formatted strings', () => {
    expect(fmtServer('Era #008', 'bare')).toBe('8');
    expect(fmtServer('#039', 'spaced')).toBe('Era 39');
  });

  it('extracts the bare number from any format', () => {
    expect(serverNumber('Era #008')).toBe(8);
    expect(serverNumber('Era 8')).toBe(8);
    expect(serverNumber('#015')).toBe(15);
    expect(serverNumber(8)).toBe(8);
  });

  it('ourServerNumber is 8 (hardcoded seam)', () => {
    expect(ourServerNumber()).toBe(8);
  });
});
