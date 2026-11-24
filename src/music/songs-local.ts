import type { SongSource } from './song.ts';

// Platz für Lieder, die nur in der eigenen Arbeitskopie leben (`local: true`). Diese Datei bleibt im Repo leer;
// lokal mit `git update-index --skip-worktree src/music/songs-local.ts` füllen, dann wird sie nie mit eingecheckt.

export const LOCAL_SONGS: SongSource[] = [];
