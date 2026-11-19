// Rendering for the Leonida Trophy Guide: the checklist cards, the guide detail panel
// and the roadmap stages. All DOM is built with textContent / createElement — no innerHTML
// from data — so trophy text can never inject markup.

export const KIND_LABELS = {
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  online: 'Online',
};

// The roadmap's stage order and the one-line note for each stage.
export const ROADMAP_STAGES = [
  {
    id: '1 · Story — Chapters 1–2',
    note: 'Play the story. Do the Chapter 1 meditation (Positive Mental Attitude) before Chapter 1 ends — it is the only thing in the whole list that can be missed.',
  },
  {
    id: '2 · Story — Chapters 3–4',
    note: 'Keep playing the story and pick up the side-character questlines as they appear (Andy, Randy, Tyrone). Chapter 4 unlocks bank vault robberies.',
  },
  {
    id: '3 · Story — Chapter 5 & finale',
    note: 'Finish the story. After the credits you return to free roam and the 100% checklist appears.',
  },
  {
    id: '4 · Side characters & strangers',
    note: 'Finish the stranger strands that count. Many questlines do not count toward Strangers & Freaks — see that trophy.',
  },
  {
    id: '5 · Collectibles',
    note: 'Scan, meditate and hunt cards: WAiNK locations, vehicles, meditation spots, card sets and the whole map.',
  },
  {
    id: '6 · Activities & open world',
    note: 'Races, stunts, challenges, robberies and the one-off trophies. Most of these feed the 100% checklist, so do them before chasing A Long Road.',
  },
  {
    id: '7 · 100% completion & platinum',
    note: 'Finish the 100% checklist (Progress > Stats > 100% Completion) and the platinum pops with it.',
  },
];

// A trophy whose guide says the steps are not yet known (launch day, 19 Nov 2026).
export function isUnknownGuide(trophy) {
  return trophy.guide.startsWith('NOT YET KNOWN');
}

// Whether the spoiler setting hides this trophy's name and description right now.
export function isSpoilerHidden(trophy, spoilersOn, earnedIds) {
  return spoilersOn && trophy.kind === 'story' && trophy.grade !== 'platinum' && !earnedIds.has(trophy.id);
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function gradeBadge(trophy) {
  return el('span', `grade-badge grade-${trophy.grade}`, trophy.grade);
}

function tagList(trophy) {
  const wrap = el('div', 'trophy-tags');
  wrap.append(el('span', 'tag', KIND_LABELS[trophy.kind] ?? trophy.kind));
  if (trophy.hidden) wrap.append(el('span', 'tag tag-hidden', 'Hidden'));
  if (trophy.missable) wrap.append(el('span', 'tag tag-missable', '⚠ Missable'));
  if (trophy.count !== null && trophy.count !== undefined) {
    wrap.append(el('span', 'tag tag-count', `Target: ${formatCount(trophy.count)}`));
  }
  if (isUnknownGuide(trophy)) wrap.append(el('span', 'tag tag-unknown', 'Steps not yet known'));
  return wrap;
}

// Counts like 250000 read better with separators; small counts stay plain.
export function formatCount(count) {
  return count >= 1000 ? count.toLocaleString('en-US') : String(count);
}

// Build one checklist card. onToggle and onOpen are callbacks owned by app.js.
export function buildTrophyCard(trophy, state, onToggle, onOpen) {
  const { earnedIds, spoilersOn, openId } = state;
  const earned = earnedIds.has(trophy.id);
  const hidden = isSpoilerHidden(trophy, spoilersOn, earnedIds);

  const item = el('li', `trophy-card${earned ? ' earned' : ''}${openId === trophy.id ? ' open' : ''}`);
  item.dataset.trophyId = String(trophy.id);

  const checkWrap = el('span', 'trophy-check');
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = earned;
  box.setAttribute('aria-label', `Mark ${hidden ? 'this hidden story trophy' : trophy.name} as earned`);
  box.addEventListener('change', (event) => {
    event.stopPropagation();
    onToggle(trophy.id, box.checked);
  });
  checkWrap.append(box);
  item.append(checkWrap);

  const name = el('span', 'trophy-name');
  name.append(el('span', 't-num', `#${trophy.id}`));
  if (hidden) {
    name.append(el('span', 'spoiler-hidden-name', 'Hidden story trophy — earn it to reveal its name'));
  } else {
    name.append(document.createTextNode(trophy.name));
  }
  item.append(name);
  item.append(gradeBadge(trophy));

  const desc = el('span', 'trophy-desc');
  if (hidden) {
    desc.textContent = 'Hidden until earned. Its name, description and guide stay hidden while spoilers are on.';
  } else {
    const em = el('em', null, trophy.description);
    desc.append(em);
  }
  item.append(desc);
  item.append(tagList(trophy));

  item.addEventListener('click', (event) => {
    if (event.target === box) return;
    onOpen(trophy.id);
  });
  // A card is opened by clicking; make it reachable by keyboard too.
  item.tabIndex = 0;
  item.setAttribute('role', 'button');
  item.setAttribute('aria-label', `Open the guide for ${hidden ? 'this hidden story trophy' : trophy.name}`);
  item.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpen(trophy.id);
    }
  });
  return item;
}

// Render the whole checklist into the given <ol>, from the filtered trophy list.
export function renderChecklist(listElement, trophies, state, onToggle, onOpen) {
  listElement.replaceChildren();
  for (const trophy of trophies) {
    listElement.append(buildTrophyCard(trophy, state, onToggle, onOpen));
  }
}

// Render the guide detail panel for one trophy. Returns nothing; hides the panel for null.
export function renderDetail(panel, trophy, state) {
  if (!trophy) {
    panel.hidden = true;
    panel.replaceChildren();
    return;
  }
  const { earnedIds, spoilersOn } = state;
  const earned = earnedIds.has(trophy.id);
  const hidden = isSpoilerHidden(trophy, spoilersOn, earnedIds);
  panel.replaceChildren();
  panel.hidden = false;

  const close = el('button', 'btn btn-quiet btn-small detail-close', 'Close');
  close.type = 'button';
  close.addEventListener('click', () => {
    panel.hidden = true;
    panel.replaceChildren();
  });
  panel.append(close);

  const heading = el('h2', null, hidden ? 'Hidden story trophy' : trophy.name);
  panel.append(heading);

  const meta = el('div', 'detail-meta');
  meta.append(gradeBadge(trophy));
  meta.append(tagList(trophy));
  panel.append(meta);

  if (hidden) {
    panel.append(el('p', 'official', 'This is a story trophy you have not earned yet, and spoilers are on — so its name, official description and guide are hidden. Tick it earned in the checklist to reveal it.'));
    return;
  }

  panel.append(el('p', 'official-label', 'Official description — PlayStation'));
  panel.append(el('p', 'official', trophy.description));
  if (trophy.count !== null && trophy.count !== undefined) {
    panel.append(el('p', 'official', `PlayStation tracks a count for this one: ${formatCount(trophy.count)}.`));
  }

  if (trophy.missable) {
    const flag = el('p', 'missable-flag');
    flag.textContent = '⚠ Missable: this is the only trophy in the list that can be missed. Do the Chapter 1 balcony meditation (after the mission Down to Earth, talk to Lucia in the kitchen in the morning and follow her to the balcony) before Chapter 1 ends.';
    panel.append(flag);
  }
  if (isUnknownGuide(trophy)) {
    const flag = el('p', 'unknown-flag');
    flag.textContent = 'Steps not yet known: no public guide had documented this trophy on launch day (19 Nov 2026). The guide below says what the official description implies and nothing more — check the linked guides for the first confirmed report.';
    panel.append(flag);
  }

  panel.append(el('h3', null, 'How to get it'));
  panel.append(el('p', 'guide-text', trophy.guide));

  panel.append(el('h3', null, 'Sources — where each fact comes from'));
  const list = el('ul', 'sources');
  for (const source of trophy.sources) {
    const item = el('li');
    const link = document.createElement('a');
    link.href = source.url;
    link.textContent = source.name;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    item.append(link);
    list.append(item);
  }
  panel.append(list);

  const stateLine = el('p', 'official', earned
    ? 'You have marked this trophy earned. Untick it in the checklist if that was a mistake.'
    : 'Not earned yet — tick the box in the checklist when it pops.');
  panel.append(stateLine);
}

// Render the roadmap stages into the given container, with per-stage trophy chips.
export function renderRoadmap(container, trophies, earnedIds, onOpen, spoilersOn = false) {
  container.replaceChildren();
  for (const stage of ROADMAP_STAGES) {
    const members = trophies.filter((t) => t.roadmap === stage.id);
    const block = el('article', 'roadmap-stage');
    block.append(el('h3', null, stage.id));
    block.append(el('p', null, stage.note));
    const list = el('ul', 'roadmap-trophies');
    for (const trophy of members) {
      const item = el('li');
      if (earnedIds.has(trophy.id)) item.classList.add('earned');
      item.append(el('span', 't-check', earnedIds.has(trophy.id) ? '✓ ' : '○ '));
      item.append(el('span', 't-num', `#${trophy.id} `));
      // With spoilers on, an unearned story trophy's name is hidden here too.
      const name = el('span', null, isSpoilerHidden(trophy, spoilersOn, earnedIds)
        ? 'Hidden story trophy'
        : trophy.name);
      item.append(name);
      if (trophy.missable) item.append(el('span', 'tag tag-missable', '⚠ Missable'));
      item.addEventListener('click', () => onOpen(trophy.id));
      item.style.cursor = 'pointer';
      list.append(item);
    }
    block.append(list);
    container.append(block);
  }
}
