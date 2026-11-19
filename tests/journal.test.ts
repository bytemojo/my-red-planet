import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { act, advance } from '../src/core/sim';
import { describePending, poll, resolve } from '../src/core/director';
import { HEBRUS_VALLES, mapXY } from '../src/core/marsmap';
import { addNote, deleteNote, NOTE_MAX } from '../src/core/notes';
import { DIARY_LEARN, SYSTEMS, deliverIce } from '../src/core/episode';
import { deserialize, newSession, serialize, sleep, type Session } from '../src/core/session';
import { LEARNING } from '../src/story/learning';
import { MARS_MAP, PHOTOS } from '../src/story/photos';

const sources = readFileSync('docs/NASA_SOURCES.md', 'utf8');
const story = (sess: Session, pick: Record<string, string> = {}) => { const s = sess.state; let n = 0; while (s.pending && n++ < 8) { const v = describePending(s)!; resolve(s, pick[v.id] ?? v.choices.find(c => !c.disabled && c.id !== 'wait')?.id ?? 'continue'); poll(s); } };
const playSol = (sess: Session, pick: Record<string, string> = {}) => { const s = sess.state; story(sess, pick); while (s.hour < 23.9) { advance(s, 0.25); story(sess, pick); } sleep(sess); story(sess, pick); };

describe('Mars map', () => {
  it('places real landmarks where they are on the simple-cylindrical map', () => {
    const hellas = mapXY(-42, 70, 1024, 512); // Hellas basin
    expect(Math.round(hellas.x)).toBe(711); expect(Math.round(hellas.y)).toBe(375);
    const p = mapXY(HEBRUS_VALLES.lat, HEBRUS_VALLES.lon, 1024, 512);
    expect(p.x).toBeGreaterThan(860); expect(p.x).toBeLessThan(885); expect(p.y).toBeGreaterThan(190); expect(p.y).toBeLessThan(210);
    expect(mapXY(0, 360, 1, 1).x).toBeCloseTo(mapXY(0, 0, 1, 1).x); // longitude wraps
  });
  it('uses the USGS Gazetteer coordinates and a bundled, credited, public-domain map', () => {
    expect(HEBRUS_VALLES.source).toMatch(/planetarynames\.wr\.usgs\.gov\/Feature\/2404/);
    expect(existsSync('public' + MARS_MAP.file)).toBe(true);
    expect(MARS_MAP.credit).toMatch(/USGS/); expect(MARS_MAP.credit).toMatch(/Public domain/);
  });
});

describe('journal photos', () => {
  it('every photo is bundled (not hotlinked), credited, and listed for the judges', () => {
    expect(PHOTOS.length).toBeGreaterThanOrEqual(3);
    for (const p of PHOTOS) {
      expect(existsSync('public' + p.file)).toBe(true);
      expect(p.file.startsWith('/journal/')).toBe(true);
      expect(p.credit).toMatch(/NASA/);
      expect(sources).toContain(p.id);
    }
  });
});

describe('player notes', () => {
  it('can be added, deleted, and survive a save', () => {
    const sess = newSession(1, { mode: 'storm' }), s = sess.state;
    expect(addNote(s, '   ')).toBe(false);
    expect(addNote(s, 'Stow the panels next time!')).toBe(true);
    expect(addNote(s, 'x'.repeat(400))).toBe(true);
    expect(s.notes![1].text.length).toBe(NOTE_MAX);
    const back = deserialize(serialize(sess))!;
    expect(back.state.notes!.map(n => n.text)[0]).toBe('Stow the panels next time!');
    expect(deleteNote(back.state, back.state.notes![0].id)).toBe(true);
    expect(back.state.notes!.length).toBe(1);
  });
});

describe('mission diary', () => {
  it('each objective writes exactly one first-person entry, with no Sol numbers, and a checked NASA link', () => {
    const sess = newSession(3, { mode: 'storm' }), s = sess.state;
    act(s, 'answer', { crew: 'reyes' }); story(sess); story(sess);
    for (const sys of SYSTEMS) act(s, 'check', { system: sys });
    playSol(sess, { storm_call: 'out' });
    for (let i = 0; i < 3; i++) playSol(sess, { radiation_peak: 'water_wall' });
    story(sess);
    s.res.power = 50; act(s, 'repair_watering', { part: 'spare_part' }); s.suitOn = true; s.outside = true; s.hour = 9; act(s, 'clean_panels');
    expect(s.ep!.phase).toBe('ice'); deliverIce(s);
    const diary = s.journal.filter(j => j.id.startsWith('diary:'));
    const keys = diary.map(j => j.id.slice(6));
    expect(keys.sort()).toEqual(Object.keys(DIARY_LEARN).sort());
    expect(new Set(keys).size).toBe(keys.length); // exactly one each
    for (const j of diary) {
      expect(j.happened).toMatch(/\bI\b/);           // first person
      expect(j.happened).not.toMatch(/\bSol\b|\d{4}-\d\d/); // no Sol numbers or dates
      const card = LEARNING[j.learnId!];
      expect(card?.url).toMatch(/^https:\/\//);
      expect(sources).toContain(card.url);           // every diary link is listed for the judges
    }
  });
});
