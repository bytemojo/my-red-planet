// The player's own journal notes. Stored in the save (GameState.notes). Pure, tested.
import type { GameState } from './types';
export const NOTE_MAX = 280, NOTES_MAX = 40;
export function addNote(s: GameState, text: string): boolean {
  const t = text.trim().slice(0, NOTE_MAX);
  if (!t) return false;
  s.notes = s.notes ?? [];
  if (s.notes.length >= NOTES_MAX) return false;
  s.notes.push({ id: `note-${Date.now().toString(36)}-${s.notes.length}`, text: t });
  return true;
}
export function deleteNote(s: GameState, id: string): boolean {
  const before = s.notes?.length ?? 0;
  s.notes = (s.notes ?? []).filter(n => n.id !== id);
  return s.notes.length < before;
}
