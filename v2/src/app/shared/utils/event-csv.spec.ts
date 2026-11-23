import { describe, it, expect } from 'vitest';
import { buildTemplate, applyCsv } from './event-csv';

const doc = {
  eventConfig: {
    kingdoms: [
      { server: 'Era 8', alliances: ['eRa', 'REU'] },
      { server: 'Era #039', alliances: ['③★⑨'] },
    ],
  },
};

describe('event-csv', () => {
  it('builds a template seeded with servers + our alliances', () => {
    const t = buildTemplate(doc);
    expect(t).toContain('# kingdomScoreboard');
    expect(t).toContain('8,');
    expect(t).toContain('39,');
    expect(t).toContain('# alliancePoints');
    expect(t).toContain('eRa,');
    expect(t).toContain('# scouting.8.alliances');
    expect(t).toContain('# scouting.39.players');
  });

  it('applies a scoreboard block back into the doc', () => {
    const csv = `# kingdomScoreboard\nserver,points\n8,50000000\n39,113600000\n`;
    const out = applyCsv(doc, csv);
    expect(out['kingdomScoreboard']).toEqual([
      { server: 'Era 8', points: '50000000' },
      { server: 'Era 39', points: '113600000' },
    ]);
  });

  it('routes scouting blocks to ours vs opponents by server number', () => {
    const csv =
      `# scouting.8.alliances\ntag,name,power,merits\neRa,WorldClass,24000,2300\n` +
      `# scouting.39.players\nname,alliance,power,merits\nFoo,③★⑨,400,90\n`;
    const out = applyCsv(doc, csv);
    const research = out['research'] as Record<string, unknown>;
    expect((research['ours'] as Record<string, unknown>)['alliances']).toEqual([
      { tag: 'eRa', name: 'WorldClass', power: '24000', merits: '2300' },
    ]);
    const opp = (research['opponents'] as Record<string, unknown>[])[0];
    expect(opp['server']).toBe('Era 39');
    expect(opp['players']).toEqual([{ name: 'Foo', alliance: '③★⑨', power: '400', merits: '90' }]);
  });

  it('skips blank placeholder rows and quotes commas', () => {
    const csv = `# alliancePoints\ntag,points\neRa,"1,234"\n,,\n`;
    const out = applyCsv(doc, csv);
    expect(out['alliancePoints']).toEqual([{ tag: 'eRa', points: '1,234' }]);
  });
});
