import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  crc32, zip, unzip, readXlsx, writeXlsx, columnIndex, columnName, escapeXml, unescapeXml, XlsxError, MAX_FILE_BYTES, STYLE,
} from '../site/js/xlsx-lite.js';

test('CRC-32 de référence', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});

test('colonnes : A, Z, AA, AZ', () => {
  assert.deepEqual(['A1', 'Z9', 'AA10', 'AZ3'].map(columnIndex), [0, 25, 26, 51]);
  assert.deepEqual([0, 25, 26, 51].map(columnName), ['A', 'Z', 'AA', 'AZ']);
});

test('échappement XML', () => {
  assert.equal(escapeXml('a < b & "c"\u0001'), 'a &lt; b &amp; &quot;c&quot;');
  assert.equal(unescapeXml('&lt;&amp;&#233;&#xE9;&apos;'), "<&éé'");
});

test('ZIP : aller-retour', async () => {
  const files = { 'a.txt': 'Bonjour', 'dossier/é.xml': '<x>Équipe ✂</x>'.repeat(200) };
  assert.deepEqual(await unzip(await zip(files)), files);
});

test('ZIP : archive tronquée ou fichier quelconque refusés', async () => {
  const bytes = await zip({ 'a.txt': 'x'.repeat(1000) });
  await assert.rejects(unzip(bytes.subarray(0, bytes.length - 30)), XlsxError);
  await assert.rejects(readXlsx(new TextEncoder().encode('%PDF-1.4 pas un classeur')), XlsxError);
  await assert.rejects(readXlsx(new Uint8Array(MAX_FILE_BYTES + 1)), /trop volumineux/);
});

test('ZIP : bombe de décompression refusée', async () => {
  const bytes = await zip({ 'xl/workbook.xml': '<workbook/>', 'gros.xml': ' '.repeat(11 * 1024 * 1024) });
  assert.ok(bytes.length < MAX_FILE_BYTES);
  await assert.rejects(readXlsx(bytes), /décompressé/);
});

test('classeur : écriture puis lecture', async () => {
  const bytes = await writeXlsx([
    { name: "Mode d'emploi", rows: [[{ value: 'Titre', style: STYLE.title }], ['Ligne & <texte>']] },
    { name: 'Compétences', freezeRows: 1, colWidths: [40, 12, 12], validations: [{ sqref: 'B2:C201', list: ['0', '1', '2', '3', '4'] }],
      rows: [[{ value: 'Compétence', style: STYLE.header }, 'Cible'], ['Kafka', 3], [], ['Java', 4, 2]] },
  ]);
  const { sheets } = await readXlsx(bytes);
  assert.deepEqual(sheets.map((s) => s.name), ["Mode d'emploi", 'Compétences']);
  assert.deepEqual(sheets[0].rows, [['Titre'], ['Ligne & <texte>']]);
  assert.deepEqual(sheets[1].rows, [['Compétence', 'Cible'], ['Kafka', 3], [], ['Java', 4, 2]]);
});

// Fichiers produits par de vrais tableurs (openpyxl et LibreOffice), générés dans tests/fixtures.
for (const name of ['openpyxl.xlsx', 'libreoffice.xlsx']) {
  test(`lecture d'un fichier ${name.replace('.xlsx', '')} (chaînes partagées, nombres, cellules vides)`, async () => {
    const { sheets } = await readXlsx(new Uint8Array(readFileSync(new URL(`./fixtures/${name}`, import.meta.url))));
    const skills = sheets.find((s) => s.name === 'Compétences');
    assert.deepEqual(skills.rows[0], ['Compétence', 'Cible référent (0 à 4)', 'Cible back-up (0 à 4)']);
    assert.deepEqual(skills.rows[1], ['Kafka', 3, 2]);
    assert.deepEqual(skills.rows[3], ['Sécurité & <réseau>', , 1]);
    assert.equal(sheets.find((s) => s.name === 'Équipe').rows[0][1], 'Équipe Paiement');
  });
}
