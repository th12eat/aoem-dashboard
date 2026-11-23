import { describe, it, expect } from 'vitest';
import { parsePastedRows } from './paste-grid';

const COLS = ['rank', 'name', 'alliance', 'power', 'merits'] as const;

describe('parsePastedRows', () => {
  it('parses tab-separated spreadsheet rows', () => {
    const text = '1\tCollin6666\teRa\t464,049,635\t102,764,542\n2\tFoo\tMyt\t400,000,000\t90,000,000';
    const rows = parsePastedRows(text, COLS);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ rank: '1', name: 'Collin6666', alliance: 'eRa', power: '464,049,635', merits: '102,764,542' });
    expect(rows[1]['name']).toBe('Foo');
  });

  it('falls back to comma split when a line has no tab', () => {
    const rows = parsePastedRows('eRa,WorldClass,24000,2300', ['tag', 'name', 'power', 'merits']);
    expect(rows[0]).toEqual({ tag: 'eRa', name: 'WorldClass', power: '24000', merits: '2300' });
  });

  it('skips blank lines and trims cells', () => {
    const rows = parsePastedRows('\n  a\tb \n\n c \td\n', ['x', 'y']);
    expect(rows).toEqual([
      { x: 'a', y: 'b' },
      { x: 'c', y: 'd' },
    ]);
  });

  it('pads missing trailing cells with empty strings and drops extras', () => {
    const rows = parsePastedRows('only', COLS);
    expect(rows[0]).toEqual({ rank: 'only', name: '', alliance: '', power: '', merits: '' });
    const over = parsePastedRows('a\tb\tc\td\te\tEXTRA', COLS);
    expect(over[0]['merits']).toBe('e');
    expect(Object.values(over[0])).not.toContain('EXTRA');
  });

  it('keeps a comma inside a tab-separated cell intact (tabs win)', () => {
    const rows = parsePastedRows('1\tName\teRa\t464,049,635\t10', COLS);
    expect(rows[0]['power']).toBe('464,049,635');
  });
});
