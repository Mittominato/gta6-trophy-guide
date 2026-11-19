// Progress storage for the Leonida Trophy Guide: localStorage plus JSON export/import.
// Progress is a Set of trophy ids (numbers 1-55). Nothing here touches the network.

export const STORAGE_KEY = 'leonida-trophy-guide-progress-v1';
export const SPOILER_KEY = 'leonida-trophy-guide-spoilers-v1';

// Load the saved set of earned trophy ids. A corrupt or foreign value yields an empty set.
export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id) => Number.isInteger(id) && id >= 1 && id <= 55));
  } catch {
    return new Set();
  }
}

// Persist the set of earned trophy ids.
export function saveProgress(earnedIds) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...earnedIds].sort((a, b) => a - b)));
  } catch {
    // Storage full or unavailable (private mode): the in-memory set still works.
  }
}

// Load the saved spoiler preference (true = hide story trophies until earned).
export function loadSpoilerPreference() {
  try {
    return localStorage.getItem(SPOILER_KEY) === 'on';
  } catch {
    return false;
  }
}

// Persist the spoiler preference.
export function saveSpoilerPreference(spoilersOn) {
  try {
    localStorage.setItem(SPOILER_KEY, spoilersOn ? 'on' : 'off');
  } catch {
    // Ignore storage errors; the toggle still works in memory.
  }
}

// Serialise progress for export: a small JSON document with the earned ids and a version.
export function serializeProgress(earnedIds, totalCount) {
  return JSON.stringify(
    {
      app: 'leonida-trophy-guide',
      version: 1,
      exportedAt: new Date().toISOString(),
      total: totalCount,
      earned: [...earnedIds].sort((a, b) => a - b),
    },
    null,
    2,
  );
}

// Parse an imported progress document. Accepts our own export shape, or a bare array of ids
// (the shape the kit starter exported). Returns { earned: Set } or throws with a plain message.
export function parseProgressFile(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  const rawIds = Array.isArray(parsed) ? parsed : parsed.earned;
  if (!Array.isArray(rawIds)) {
    throw new Error('That file has no earned-trophy list in it.');
  }
  // An object export that names a different app is not our progress file.
  if (!Array.isArray(parsed) && parsed.app && parsed.app !== 'leonida-trophy-guide') {
    throw new Error('That file is progress for a different guide, not this one.');
  }
  const earned = new Set();
  for (const id of rawIds) {
    const n = typeof id === 'number' ? id : Number.parseInt(String(id), 10);
    if (Number.isInteger(n) && n >= 1 && n <= 55) earned.add(n);
  }
  return { earned };
}

// Trigger a download of the given text as a file with the given name.
export function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
