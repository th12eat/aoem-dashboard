import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, BehaviorSubject, Observable } from 'rxjs';
import { EventDashboardPage } from './event-dashboard.page';
import { EVENT_DATA_SOURCE, EventDataSource } from '@core/services/event-dashboard.datasource';
import { normalizeEventData } from '@core/services/normalize-event-data';
import type { EventData } from '@shared/models/event-data.model';

// Minimal raw doc that routes through the real normalizer, so the test exercises
// the production data path (not a hand-built EventData).
const RAW = {
  schemaVersion: 2,
  eventConfig: {
    eventStart: '2026-11-02',
    eventEnd: '2099-11-15',
    servers: ['Era 8', 'Era #039'],
    ourServer: 'Era 8',
    ourAlliances: ['eRa'],
    corners: {},
    notes: '',
    eventOver: false,
  },
  kingdomPoints: { lastUpdated: 'Day 3' },
  kingdomScoreboard: [
    { server: 'Era #039', points: 76600000000 },
    { server: 'Era 8', points: 50200000000 },
  ],
  alliancePoints: [{ tag: 'eRa', points: '21,613,610,877' }],
  diplomacy: [{ id: 1, server: 'Era #015', alliance: 'TBD', relation: 'hostile', notes: 'Target.' }],
  research: { ours: { server: 'Era 8', sdRank: null, alliances: [], players: [] }, opponents: [] },
  serverTiers: { labels: ['100M+'], byServer: { 'Era 8': [264] } },
  serverDepth: { ranks: [1], byServer: { 'Era 8': { power: [487], merits: [376] } } },
  mapState: {},
  mapRoutes: { actual: [], planned: [] },
};

class StubDataSource implements EventDataSource {
  load(): Observable<EventData> {
    return of(normalizeEventData(RAW));
  }
}

function paramMap$(slug: string): BehaviorSubject<ParamMap> {
  return new BehaviorSubject<ParamMap>(convertToParamMap({ slug }));
}

describe('EventDashboardPage (config → data → widgets)', () => {
  function mount(slug: string) {
    TestBed.configureTestingModule({
      imports: [EventDashboardPage, TranslateModule.forRoot()],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: EVENT_DATA_SOURCE, useClass: StubDataSource },
        { provide: ActivatedRoute, useValue: { paramMap: paramMap$(slug) } },
      ],
    });
    const fixture = TestBed.createComponent(EventDashboardPage);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => TestBed.resetTestingModule());

  it('renders the Stormlands header, tabs, and scoreboard from real normalized data', async () => {
    const fixture = mount('stormlands');
    await fixture.whenStable();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

    // header title (translate returns the key when no catalog is loaded in test)
    expect(text).toContain('stormlands.title');
    // four tabs present
    expect(text).toContain('stormlands.tabs.overview');
    expect(text).toContain('stormlands.tabs.research');
    // the overview scoreboard painted the real server names + our marker
    expect(text).toContain('Era #039');
    expect(text).toContain('Era 8');
    // host [data-kvk] drives the accent
    expect((fixture.nativeElement as HTMLElement).getAttribute('data-kvk')).toBe('stormlands');
  });

  it('shows the unknown-dashboard fallback for an unregistered slug', async () => {
    const fixture = mount('does-not-exist');
    await fixture.whenStable();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('common.unknownDashboard');
  });
});
