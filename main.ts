// Leonida Trophy Guide — the entry program (Node 22, standard library only).
//
// The guide itself is this directory's app/ folder: plain static files a browser opens
// at app/index.html (ES modules, CSS, no build step), fully offline — it loads nothing
// over the network, and its trophy list and guides live in app/data/trophies.json.
// Screenshots of the guide, taken in headless Chrome, are in screenshots/.
//
// This program hands the entry in: it copies app/ and screenshots/ from beside this
// file into the output directory and writes dossier.json there, the summary the judge
// reads (the screenshots, the first load's files and bytes, and the source), built with
// the vendored make.fun library in vendor/makefun-frontend.ts. Leave that file exactly
// as it is: the scorer requires dossier.json to be byte for byte what its own copy of
// the library writes.
//
// The output directory is /output in the grader, or $MAKEFUN_OUTPUT_DIR outside it:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The run is deterministic: the same input files always produce the same bytes, so two
// runs write identical dossier.json files.
//
// One care point, learned from an earlier bounty: the grader's /output parent directory
// may be read-only, so this program never deletes /output itself. It empties /output's
// *contents* instead, then recreates what it needs inside it.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The repository root: the directory this file lives in.
const here = fileURLToPath(new URL('.', import.meta.url));

// The grader writes to /output; outside the grader MAKEFUN_OUTPUT_DIR stands in for it.
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Empty the output directory's contents without removing the directory itself:
// the grader's /output parent may be read-only, so rmSync(out) would fail with EACCES.
function emptyOutputContents(directory: string): void {
  mkdirSync(directory, { recursive: true });
  for (const entry of readdirSync(directory)) {
    rmSync(join(directory, entry), { recursive: true, force: true });
  }
}

emptyOutputContents(out);

// Copy the guide (app/) and its screenshots into the output directory.
// Fail with a plain message if app/ is missing, instead of cpSync's raw error.
if (!existsSync(join(here, 'app'))) {
  throw new Error(`app/ not found beside ${here} — nothing to hand in.`);
}
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Write the dossier the judge reads, with the scorer's own caps (see the kit's
// reference/gate.json): the text cap shapes the bytes; the others refuse an entry the
// scorer would refuse — more than 4 screenshots or one over 256 KiB; more than 993
// files and directories in app/ or 48 MiB of app files (app/ counts beside /output's
// own 1000-entry cap, with its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);

// One line on stdout so two runs can be eyeballed as the same hand-in.
const shotCount = existsSync(join(out, 'screenshots'))
  ? readdirSync(join(out, 'screenshots')).length
  : 0;
console.log(`Wrote ${out}/dossier.json with ${shotCount} screenshot(s).`);

