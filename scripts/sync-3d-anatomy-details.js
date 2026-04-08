#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const muskelfinderRoot = path.resolve(__dirname, '..');
const anatomyRoot = path.resolve(muskelfinderRoot, '..', '3DAnatomy');
const buildScript = path.join(anatomyRoot, 'scripts', 'build-muskelfinder-map.js');

const generatedFiles = [
  path.join(anatomyRoot, 'data', 'muskelfinder-map.json'),
  path.join(anatomyRoot, 'data', 'muskelfinder-map.generated.json'),
  path.join(anatomyRoot, 'data', 'muskelfinder-map.report.json'),
  path.join(anatomyRoot, 'data', 'muskelfinder-details.json')
];

function fail(message) {
  console.error(`\n❌ ${message}`);
  process.exit(1);
}

if (!fs.existsSync(anatomyRoot)) {
  fail(`3DAnatomy-Ordner nicht gefunden: ${anatomyRoot}`);
}

if (!fs.existsSync(buildScript)) {
  fail(`Build-Script nicht gefunden: ${buildScript}`);
}

console.log('🔄 Übertrage Muskelfinder-Details nach 3DAnatomy...');
console.log(`   Quelle: ${muskelfinderRoot}`);
console.log(`   Ziel:   ${anatomyRoot}\n`);

const result = spawnSync(process.execPath, [buildScript], {
  cwd: anatomyRoot,
  stdio: 'inherit'
});

if (result.error) {
  fail(result.error.message);
}

if (result.status !== 0) {
  process.exit(result.status || 1);
}

const missingFiles = generatedFiles.filter((file) => !fs.existsSync(file));
if (missingFiles.length) {
  fail(`Folgende Dateien fehlen nach dem Sync:\n- ${missingFiles.join('\n- ')}`);
}

console.log('\n✅ 3DAnatomy wurde mit den aktuellen Muskelfinder-Daten aktualisiert.');
console.log('   Danach die 3D-App einmal hart neu laden.');
console.log('\nBefehl für später:');
console.log('   node scripts/sync-3d-anatomy-details.js');
