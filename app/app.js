// Leonida Trophy Guide — boot and state. Loads the trophy data, applies URL staging
// parameters (?view, ?filter, ?open, ?spoiler, ?demo), wires the toolbar and keeps the
// progress header, checklist, roadmap and detail panel in sync.
//
// URL parameters (for deterministic screenshots and deep links):
//   ?view=roadmap            show the roadmap instead of the checklist
//   ?filter=missable         one of all, story, missable, collectibles, activities, online
//   ?open=<id 1-55>          open that trophy's guide panel
//   ?spoiler=on|off          spoiler setting (overrides the saved preference for this view)
//   ?demo=1                  tick a few early story trophies in memory only, to show progress
//                            (never saved to localStorage)

import {
  loadProgress,
  saveProgress,
  loadSpoilerPreference,
  saveSpoilerPreference,
  serializeProgress,
  parseProgressFile,
  downloadTextFile,
} from './storage.js';
import {
  KIND_LABELS,
  isSpoilerHidden,
  renderChecklist,
  renderDetail,
  renderRoadmap,
} from './render.js';

const params = new URLSearchParams(window.location.search);
const DEMO_IDS = [2, 3, 8];

// --- State -----------------------------------------------------------------
const state = {
  trophies: [],
  earnedIds: loadProgress(),
  spoilersOn: loadSpoilerPreference(),
  kind: 'all',
  grade: 'all',
  earnedFilter: 'all',
  search: '',
  view: 'checklist',
  openId: null,
  demoMode: false,
};

// --- Element handles -------------------------------------------------------
const $ = (id) => document.getElementById(id);
const listElement = $('trophyList');
const detailPanel = $('detailPanel');
const roadmapView = $('roadmapView');
const checklistView = $('checklistView');
const progressCount = $('progressCount');
const progressFill = $('progressFill');
const progressDetail = $('progressDetail');
const progressNext = $('progressNext');
const resultCount = $('resultCount');
const emptyNote = $('emptyNote');
const missableBanner = $('missableBanner');
const searchInput = $('search');
const gradeSelect = $('grade');
const earnedSelect = $('earnedFilter');
const spoilerToggle = $('spoilerToggle');
const kindFilters = $('kindFilters');

// --- Filtering --------------------------------------------------------------
function trophyMatchesKind(trophy) {
  if (state.kind === 'all') return true;
  if (state.kind === 'missable') return trophy.missable;
  if (state.kind === 'online') return false; // no online trophies in this list
  return trophy.kind === state.kind;
}

function visibleTrophies() {
  const needle = state.search.trim().toLowerCase();
  return state.trophies.filter((trophy) => {
    if (!trophyMatchesKind(trophy)) return false;
    if (state.grade !== 'all' && trophy.grade !== state.grade) return false;
    const earned = state.earnedIds.has(trophy.id);
    if (state.earnedFilter === 'earned' && !earned) return false;
    if (state.earnedFilter === 'todo' && earned) return false;
    if (needle) {
      const haystack = `${trophy.name} ${trophy.description} ${trophy.guide} ${trophy.roadmap}`.toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

// --- Progress header ---------------------------------------------------------
function nextUnearnedStoryTrophy() {
  // The platinum is earned last by definition, so it is never "next up".
  return state.trophies.find((t) => t.kind === 'story' && t.grade !== 'platinum' && !state.earnedIds.has(t.id));
}

function updateProgressHeader() {
  const total = state.trophies.length;
  const earnedCount = state.earnedIds.size;
  progressCount.textContent = `${earnedCount} / ${total} earned`;
  progressFill.style.width = total ? `${Math.round((earnedCount / total) * 100)}%` : '0%';
  const byGrade = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const trophy of state.trophies) {
    if (state.earnedIds.has(trophy.id)) byGrade[trophy.grade] += 1;
  }
  progressDetail.textContent =
    `${byGrade.platinum} platinum · ${byGrade.gold} gold · ${byGrade.silver} silver · ${byGrade.bronze} bronze`;
  if (earnedCount === total && total > 0) {
    progressNext.textContent = 'Platinum earned — Vice Got a Price! is yours. Leonida Legend.';
  } else {
    const next = nextUnearnedStoryTrophy();
    // With spoilers on, the next story trophy's name is itself a spoiler.
    const nextLabel = next && isSpoilerHidden(next, state.spoilersOn, state.earnedIds)
      ? 'a hidden story trophy — earn it to reveal its name'
      : next ? `${next.name} — ${next.description}` : null;
    progressNext.textContent = nextLabel
      ? `Next up: ${nextLabel}`
      : 'Next up: work through the roadmap stages below.';
  }
}

// --- Rendering ---------------------------------------------------------------
function renderAll() {
  updateProgressHeader();
  const visible = visibleTrophies();
  renderChecklist(listElement, visible, state, toggleEarned, openTrophy);
  emptyNote.hidden = visible.length > 0;
  const kindLabel = state.kind === 'all' ? 'all kinds' : (KIND_LABELS[state.kind] ?? state.kind);
  resultCount.textContent =
    `Showing ${visible.length} of ${state.trophies.length} trophies (${kindLabel}${state.grade !== 'all' ? `, ${state.grade}` : ''}${state.search ? `, matching “${state.search}”` : ''}).`;
  renderRoadmap($('roadmapStages'), state.trophies, state.earnedIds, openTrophy, state.spoilersOn);
  const open = state.trophies.find((t) => t.id === state.openId) ?? null;
  renderDetail(detailPanel, open, state);
  updateViewTabs();
  updateKindChips();
  updateMissableBanner();
}

function updateViewTabs() {
  const checklist = state.view === 'checklist';
  checklistView.hidden = !checklist;
  roadmapView.hidden = checklist;
  $('viewChecklist').classList.toggle('active', checklist);
  $('viewRoadmap').classList.toggle('active', !checklist);
  $('viewChecklist').setAttribute('aria-pressed', String(checklist));
  $('viewRoadmap').setAttribute('aria-pressed', String(!checklist));
}

function updateKindChips() {
  for (const chip of kindFilters.querySelectorAll('.chip')) {
    const active = chip.dataset.kind === state.kind;
    chip.classList.toggle('active', active);
    chip.setAttribute('aria-pressed', String(active));
  }
}

function updateMissableBanner() {
  const missable = state.trophies.find((t) => t.missable);
  if (!missable) {
    missableBanner.hidden = true;
    return;
  }
  if (state.earnedIds.has(missable.id)) {
    missableBanner.hidden = true;
    return;
  }
  missableBanner.hidden = false;
  $('missableBannerText').textContent =
    ` ${missable.name} — meditate at every spot, and do Lucia's Chapter 1 balcony meditation before Chapter 1 ends. It is the only trophy that can be missed.`;
  $('missableBannerBtn').onclick = () => openTrophy(missable.id);
}

// --- Actions -----------------------------------------------------------------
function persistProgress() {
  if (state.demoMode) return; // demo ticks are for display only, never saved
  saveProgress(state.earnedIds);
}

function toggleEarned(id, earned) {
  if (earned) state.earnedIds.add(id);
  else state.earnedIds.delete(id);
  persistProgress();
  renderAll();
}

function openTrophy(id) {
  state.openId = id;
  renderAll();
  detailPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setView(view) {
  state.view = view === 'roadmap' ? 'roadmap' : 'checklist';
  renderAll();
}

function setKind(kind) {
  state.kind = Object.keys(KIND_LABELS).includes(kind) || kind === 'all' ? kind : 'all';
  renderAll();
}

// --- URL parameters ----------------------------------------------------------
function applyUrlParams() {
  const view = params.get('view');
  if (view === 'roadmap') state.view = 'roadmap';
  const filter = params.get('filter');
  if (filter) setKind(filter);
  const spoiler = params.get('spoiler');
  if (spoiler === 'on') state.spoilersOn = true;
  if (spoiler === 'off') state.spoilersOn = false;
  const open = Number.parseInt(params.get('open') ?? '', 10);
  if (Number.isInteger(open) && open >= 1 && open <= 55) {
    state.openId = open;
    state.scrollToDetail = true; // jump straight to the open guide on first paint
  }
  if (params.get('demo') === '1') {
    state.demoMode = true;
    for (const id of DEMO_IDS) state.earnedIds.add(id);
  }
}

// --- Wiring ------------------------------------------------------------------
function wireControls() {
  searchInput.addEventListener('input', () => {
    state.search = searchInput.value;
    renderAll();
  });
  gradeSelect.addEventListener('change', () => {
    state.grade = gradeSelect.value;
    renderAll();
  });
  earnedSelect.addEventListener('change', () => {
    state.earnedFilter = earnedSelect.value;
    renderAll();
  });
  spoilerToggle.addEventListener('change', () => {
    state.spoilersOn = spoilerToggle.checked;
    saveSpoilerPreference(state.spoilersOn);
    renderAll();
  });
  kindFilters.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (chip) setKind(chip.dataset.kind);
  });
  $('viewChecklist').addEventListener('click', () => setView('checklist'));
  $('viewRoadmap').addEventListener('click', () => setView('roadmap'));

  $('exportBtn').addEventListener('click', () => {
    downloadTextFile('leonida-trophy-progress.json', serializeProgress(state.earnedIds, state.trophies.length));
  });
  $('importFile').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const { earned } = parseProgressFile(await file.text());
      state.earnedIds = earned;
      persistProgress();
      renderAll();
    } catch (error) {
      window.alert(`Could not import that file: ${error.message}`);
    } finally {
      event.target.value = '';
    }
  });
  $('resetBtn').addEventListener('click', () => {
    if (window.confirm('Clear all earned ticks? This cannot be undone (export first if you want a backup).')) {
      state.earnedIds = new Set();
      persistProgress();
      renderAll();
    }
  });
}

// --- Boot ----------------------------------------------------------------------
async function boot() {
  const response = await fetch('data/trophies.json');
  if (!response.ok) throw new Error(`Could not load data/trophies.json (${response.status})`);
  const doc = await response.json();
  state.trophies = doc.trophies;
  applyUrlParams();
  spoilerToggle.checked = state.spoilersOn;
  wireControls();
  renderAll();
  // A ?open= link should land on the guide itself, not the top of the page.
  // Instant scroll (not smooth) so the position is deterministic for screenshots.
  if (state.scrollToDetail && !detailPanel.hidden) {
    detailPanel.scrollIntoView({ behavior: 'instant', block: 'start' });
    state.scrollToDetail = false;
  }
}

boot().catch((error) => {
  listElement.replaceChildren();
  const note = document.createElement('p');
  note.className = 'empty-note';
  note.textContent = `The trophy list could not be loaded: ${error.message}`;
  listElement.append(note);
});
