import { describe, it, expect, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ActivatedRoute, convertToParamMap, ParamMap } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, BehaviorSubject, Observable } from 'rxjs';
import { EventDashboardPage } from './event-dashboard.page';
import { EVENT_DATA_SOURCE, EventDataSource, type LoadedEvent } from '@core/services/event-dashboard.datasource';
import { normalizeEventData } from '@core/services/normalize-event-data';
import { PageTitleService } from '@core/services/page-title.service';

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
    kingdoms: [
      { server: 'Era 8', display: 'Era #008', color: '#9a6dd4', rgb: '154,109,212', us: true },
      { server: 'Era #039', display: 'Era #039', color: '#5b8bc4', rgb: '91,139,196' },
    ],
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
  load(): Observable<LoadedEvent> {
    return of({ data: normalizeEventData(RAW), status: 'published', occurrence: null });
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
    // header crests render the data-driven kingdom displays (our server's
    // display label comes from meta.kingdoms, proving the join landed)
    expect(text).toContain('Era #008');
    expect(text).toContain('Era #039');
    // the event accent is published to the shell (drives [data-kvk] on the app
    // root, shared by the frozen top bar + page)
    expect(TestBed.inject(PageTitleService).kvkTheme()).toBe('stormlands');
  });

  it('shows the unknown-dashboard fallback for an unregistered slug', async () => {
    const fixture = mount('does-not-exist');
    await fixture.whenStable();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('common.unknownDashboard');
  });
});
