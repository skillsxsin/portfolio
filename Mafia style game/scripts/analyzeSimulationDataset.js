const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../game_all_permutations_simulation.csv');
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n').filter(l => l.trim().length > 0);
const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));

const stats = {};

for (let i = 1; i < lines.length; i++) {
  // Parse CSV row
  const row = [];
  let inQuotes = false;
  let currentVal = '';
  for (const char of lines[i]) {
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { row.push(currentVal); currentVal = ''; }
    else { currentVal += char; }
  }
  row.push(currentVal);

  const pCount = parseInt(row[1]);
  const winner = row[14];

  if (!stats[pCount]) {
    stats[pCount] = { total: 0, citizensWin: 0, shadowsWin: 0, wildcardWin: 0, inProgress: 0 };
  }

  stats[pCount].total++;
  if (winner === 'CITIZENS') stats[pCount].citizensWin++;
  else if (winner === 'SHADOWS') stats[pCount].shadowsWin++;
  else if (winner === 'WILDCARD') stats[pCount].wildcardWin++;
  else stats[pCount].inProgress++;
}

console.log('📊 EMPIRICAL STATISTICAL ANALYSIS OF 816 SIMULATED MATCHES:\n');
console.log('Player Count | Total Sims | Citizens Win % | Shadows Win % | Wildcard Win % | Balance Assessment');
console.log('-'.repeat(95));

Object.keys(stats).sort((a, b) => a - b).forEach((count) => {
  const s = stats[count];
  const citPct = ((s.citizensWin / s.total) * 100).toFixed(1);
  const shadPct = ((s.shadowsWin / s.total) * 100).toFixed(1);
  const wcPct = ((s.wildcardWin / s.total) * 100).toFixed(1);

  let assessment = 'Balanced ⚖️';
  if (parseFloat(shadPct) >= 60) assessment = 'Shadow Heavy 🔴 (Shadow Bias)';
  else if (parseFloat(citPct) >= 60) assessment = 'Citizen Heavy 🟢 (Citizen Bias)';

  console.log(
    `${count.padStart(12)} | ${String(s.total).padStart(10)} | ${citPct.padStart(13)}% | ${shadPct.padStart(12)}% | ${wcPct.padStart(13)}% | ${assessment}`
  );
});
