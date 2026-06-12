// scripts/refactor-tailwind-aliases.mjs
import fs from 'node:fs';
import path from 'node:path';
import { globSync } from 'glob';

const FILES = globSync('{src,app,pages,components}/**/*.{js,jsx,ts,tsx,vue,html}', { nodir: true });

const FAMILY_MAP = {
  emerald: 'brand',
  rose: 'error',
  amber: 'warning',
  sky: 'info',
  slate: 'neutral',
};

// Utilities that accept color families + shade
const COLOR_UTILS = [
  'bg','text','border','ring','outline','fill','stroke','caret','accent','divide',
  'placeholder','decoration','shadow','from','via','to'
];

// Split a class like "dark:hover:bg-emerald-600/80" and rewrite only the "emerald" part
function rewriteToken(token) {
  // Preserve prefixes (anything ending with :)
  const parts = token.split(':');
  const core = parts.pop(); // e.g. "bg-emerald-600/80"

  // Only handle utilities we know
  const utilMatch = new RegExp(`^(${COLOR_UTILS.join('|')})-`).exec(core);
  if (!utilMatch) return token;

  // Extract family + shade (allow slash opacity like 600/80)
  const m = /^([a-z]+)-([a-z]+)-(\d{2,3})(?:\/\d{1,3})?$/.exec(core);
  if (!m) return token;
  const [, util, family, shade] = m;

  const mapped = FAMILY_MAP[family];
  if (!mapped) return token;

  const rebuilt = `${util}-${mapped}-${shade}${core.includes('/') ? core.slice(core.indexOf('/')) : ''}`;
  return [...parts, rebuilt].join(':');
}

function rewriteClasses(str) {
  // Replace within class attribute-like contexts and within template strings
  return str.replace(/class(Name)?=("|'|`)([\s\S]*?)(\2)/g, (full, _cn, quote, body) => {
    // Split on whitespace; we stay inside class strings
    const tokens = body.split(/\s+/).map(t => rewriteToken(t));
    const rebuilt = tokens.join(' ');
    return `class${_cn || ''}=${quote}${rebuilt}${quote}`;
  });
}

for (const file of FILES) {
  const input = fs.readFileSync(file, 'utf8');
  const output = rewriteClasses(input);
  if (output !== input) {
    fs.writeFileSync(file, output, 'utf8');
    console.log('Updated:', path.relative(process.cwd(), file));
  }
}
console.log('Done.');