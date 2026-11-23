import type { MapGeometry } from '@shared/models/map.model';

/**
 * Desolate Desert — static map GEOMETRY (transcribed verbatim from 1.0
 * desolate_desert.html MAP_NODES + SERVER_BADGES). Coordinates are in a
 * 0–100 viewBox over the dd_minimap raster. This is template data (identical
 * every occurrence); live ownership/sieges/routes come from the data file.
 *
 * activeDayOffset (days from eventStart) encodes the capture schedule:
 *   Z1→Z2 gates + cities = +1 · Z2↔Z2 gates + towers = +2 · Z2→Z3 gates = +5 ·
 *   Aaru = +6  (matches 1.0 nodeActiveDefault).
 * buff: cities grant health/attack/defense; towers grant dmgReduction/damage.
 */
export const DESOLATE_MAP: MapGeometry = {
  viewBox: '0 0 100 100',
  underlayAsset: 'assets/desolate-map.jpg',
  serverBadges: [
    { server: 'Era 8', x: 48.5, y: 10.5 }, // north — blue (us)
    { server: 'Era #068', x: 10.5, y: 49.5 }, // west — orange
    { server: 'Era #066', x: 89.0, y: 49.5 }, // east — purple
    { server: 'Era #028', x: 48.5, y: 89.0 }, // south — green
  ],
  nodes: [
    // outer-ring gates (Z1→Z2), clockwise from 12 o'clock
    { id: 'kingsguard_dock', x: 52.5, y: 19.2, type: 'gate', transition: 'Z1->Z2', label: 'Kingsguard Dock', activeDayOffset: 1 },
    { id: 'crown_fort', x: 60.3, y: 19.0, type: 'gate', transition: 'Z1->Z2', label: 'Crown Fort', activeDayOffset: 1 },
    { id: 'gate_sunshine', x: 69.7, y: 28.4, type: 'gate', transition: 'Z2<->Z2', label: 'Gate of Sunshine', activeDayOffset: 2 },
    { id: 'gate_moonfall', x: 64.4, y: 35.3, type: 'gate', transition: 'Z2<->Z2', label: 'Gate of Moonfall', activeDayOffset: 2 },
    { id: 'north_wind_fort', x: 79.8, y: 40.3, type: 'gate', transition: 'Z1->Z2', label: 'North Wind Fort', activeDayOffset: 1 },
    { id: 'soaring_fort', x: 79.7, y: 48.3, type: 'gate', transition: 'Z1->Z2', label: 'Soaring Fort', activeDayOffset: 1 },
    { id: 'vengeance_fort', x: 81.1, y: 57.7, type: 'gate', transition: 'Z1->Z2', label: 'Vengeance Fort', activeDayOffset: 1 },
    { id: 'ruler_fort', x: 80.5, y: 65.2, type: 'gate', transition: 'Z1->Z2', label: 'Ruler Fort', activeDayOffset: 1 },
    { id: 'dawn_fort', x: 61.7, y: 85.1, type: 'gate', transition: 'Z1->Z2', label: 'Dawn Fort', activeDayOffset: 1 },
    { id: 'duskfire_dock', x: 55.4, y: 84.5, type: 'gate', transition: 'Z1->Z2', label: 'Duskfire Dock', activeDayOffset: 1 },
    { id: 'lightbearer_dock', x: 45.5, y: 84.1, type: 'gate', transition: 'Z1->Z2', label: 'Lightbearer Dock', activeDayOffset: 1 },
    { id: 'blazing_fort', x: 38.8, y: 84.4, type: 'gate', transition: 'Z1->Z2', label: 'Blazing Fort', activeDayOffset: 1 },
    { id: 'gate_fury', x: 28.5, y: 73.9, type: 'gate', transition: 'Z2<->Z2', label: 'Gate of Fury', activeDayOffset: 2 },
    { id: 'gate_grace', x: 36.6, y: 66.2, type: 'gate', transition: 'Z2<->Z2', label: 'Gate of Grace', activeDayOffset: 2 },
    { id: 'mourning_fort', x: 17.8, y: 63.8, type: 'gate', transition: 'Z1->Z2', label: 'Mourning Fort', activeDayOffset: 1 },
    { id: 'balance_fort', x: 17.3, y: 52.4, type: 'gate', transition: 'Z1->Z2', label: 'Balance Fort', activeDayOffset: 1 },
    { id: 'immortality_fort', x: 17.7, y: 46.0, type: 'gate', transition: 'Z1->Z2', label: 'Immortality Fort', activeDayOffset: 1 },
    { id: 'judgement_fort', x: 17.7, y: 37.0, type: 'gate', transition: 'Z1->Z2', label: 'Judgement Fort', activeDayOffset: 1 },
    { id: 'jade_eye_fort', x: 35.9, y: 17.6, type: 'gate', transition: 'Z1->Z2', label: 'Jade Eye Fort', activeDayOffset: 1 },
    { id: 'majesty_dock', x: 42.9, y: 18.4, type: 'gate', transition: 'Z1->Z2', label: 'Majesty Dock', activeDayOffset: 1 },
    // inner-ring gates around Aaru (Z2→Z3)
    { id: 'gate_death', x: 52.7, y: 38.2, type: 'gate', transition: 'Z2->Z3', label: 'Gate of Death', activeDayOffset: 5 },
    { id: 'gate_windrest', x: 62.6, y: 47.4, type: 'gate', transition: 'Z2->Z3', label: 'Gate of Windrest', activeDayOffset: 5 },
    { id: 'gate_dawn_earth', x: 61.1, y: 56.3, type: 'gate', transition: 'Z2->Z3', label: 'Gate of Dawn Earth', activeDayOffset: 5 },
    { id: 'gate_azure_sky', x: 55.2, y: 63.3, type: 'gate', transition: 'Z2->Z3', label: 'Gate of Azure Sky', activeDayOffset: 5 },
    { id: 'gate_primal_water', x: 46.7, y: 64.2, type: 'gate', transition: 'Z2->Z3', label: 'Gate of Primal Water', activeDayOffset: 5 },
    { id: 'gate_life', x: 36.0, y: 53.7, type: 'gate', transition: 'Z2->Z3', label: 'Gate of Life', activeDayOffset: 5 },
    { id: 'gate_abundance', x: 36.9, y: 44.9, type: 'gate', transition: 'Z2->Z3', label: 'Gate of Abundance', activeDayOffset: 5 },
    { id: 'gate_chaos', x: 44.0, y: 39.1, type: 'gate', transition: 'Z2->Z3', label: 'Gate of Chaos', activeDayOffset: 5 },
    // pillar cities (buffs)
    { id: 'city_ibis', x: 57.7, y: 29.1, type: 'city', buff: { key: 'defense', label: 'Defense', magnitude: '+10%' }, label: 'City of Ibis', activeDayOffset: 1 },
    { id: 'city_hippo', x: 71.7, y: 44.0, type: 'city', buff: { key: 'defense', label: 'Defense', magnitude: '+10%' }, label: 'City of Hippo', activeDayOffset: 1 },
    { id: 'city_crocodile', x: 70.1, y: 58.3, type: 'city', buff: { key: 'attack', label: 'Attack', magnitude: '+10%' }, label: 'City of Crocodile', activeDayOffset: 1 },
    { id: 'city_bull', x: 72.3, y: 68.6, type: 'city', buff: { key: 'health', label: 'Health', magnitude: '+5%' }, label: 'City of Bull', activeDayOffset: 1 },
    { id: 'city_lion', x: 64.9, y: 74.7, type: 'city', buff: { key: 'health', label: 'Health', magnitude: '+5%' }, label: 'City of Lion', activeDayOffset: 1 },
    { id: 'city_cat', x: 56.0, y: 74.7, type: 'city', buff: { key: 'attack', label: 'Attack', magnitude: '+10%' }, label: 'City of Cat', activeDayOffset: 1 },
    { id: 'city_scorpion', x: 42.9, y: 73.8, type: 'city', buff: { key: 'defense', label: 'Defense', magnitude: '+10%' }, label: 'City of Scorpion', activeDayOffset: 1 },
    { id: 'city_vulture', x: 27.1, y: 58.1, type: 'city', buff: { key: 'defense', label: 'Defense', magnitude: '+10%' }, label: 'City of Vulture', activeDayOffset: 1 },
    { id: 'city_goose', x: 28.9, y: 44.5, type: 'city', buff: { key: 'attack', label: 'Attack', magnitude: '+10%' }, label: 'City of Goose', activeDayOffset: 1 },
    { id: 'city_ram', x: 27.3, y: 35.3, type: 'city', buff: { key: 'health', label: 'Health', magnitude: '+5%' }, label: 'City of Ram', activeDayOffset: 1 },
    { id: 'city_leopard', x: 34.6, y: 27.8, type: 'city', buff: { key: 'health', label: 'Health', magnitude: '+5%' }, label: 'City of Leopard', activeDayOffset: 1 },
    { id: 'city_jackal', x: 42.9, y: 29.7, type: 'city', buff: { key: 'attack', label: 'Attack', magnitude: '+10%' }, label: 'City of Jackal', activeDayOffset: 1 },
    // towers of rotation (buffs)
    { id: 'tower_1', x: 70.3, y: 53.1, type: 'tower', buff: { key: 'dmgReduction', label: 'Dmg Red.', magnitude: '+5%' }, label: 'Tower of Rotation', activeDayOffset: 2 },
    { id: 'tower_2', x: 66.2, y: 69.1, type: 'tower', buff: { key: 'dmgReduction', label: 'Dmg Red.', magnitude: '+5%' }, label: 'Tower of Rotation', activeDayOffset: 2 },
    { id: 'tower_3', x: 51.2, y: 72.6, type: 'tower', buff: { key: 'damage', label: 'Damage', magnitude: '+6%' }, label: 'Tower of Rotation', activeDayOffset: 2 },
    { id: 'tower_4', x: 28.8, y: 50.8, type: 'tower', buff: { key: 'dmgReduction', label: 'Dmg Red.', magnitude: '+5%' }, label: 'Tower of Rotation', activeDayOffset: 2 },
    { id: 'tower_5', x: 32.6, y: 33.2, type: 'tower', buff: { key: 'dmgReduction', label: 'Dmg Red.', magnitude: '+5%' }, label: 'Tower of Rotation', activeDayOffset: 2 },
    { id: 'tower_6', x: 48.5, y: 30.0, type: 'tower', buff: { key: 'damage', label: 'Damage', magnitude: '+6%' }, label: 'Tower of Rotation', activeDayOffset: 2 },
    // Aaru Palace (center) + invisible diamond path anchors
    { id: 'aaru', x: 49.8, y: 49.9, type: 'aaru', label: 'Aaru Palace', activeDayOffset: 6 },
    { id: 'aaru_n', x: 49.8, y: 44.5, type: 'anchor', label: 'Aaru — North' },
    { id: 'aaru_e', x: 55.2, y: 49.9, type: 'anchor', label: 'Aaru — East' },
    { id: 'aaru_s', x: 49.8, y: 55.3, type: 'anchor', label: 'Aaru — South' },
    { id: 'aaru_w', x: 44.4, y: 49.9, type: 'anchor', label: 'Aaru — West' },
    { id: 'intercept_moonfall_hippo', x: 68.05, y: 39.65, type: 'anchor', label: 'Intercept — Moonfall↔Hippo' },
  ],
};
