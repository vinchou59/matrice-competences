// Lecture et écriture de classeurs Excel (.xlsx) simples, sans bibliothèque : un .xlsx est une archive ZIP
// de fichiers XML. Compression par les flux natifs (CompressionStream / DecompressionStream), présents dans
// les navigateurs récents comme dans Node.js 22 : le module est testé tel quel avec `npm test`.
// Écriture : texte et nombres, en-têtes en gras, largeurs de colonnes, ligne figée, listes déroulantes.
// Lecture : valeurs des cellules (texte partagé ou en ligne, nombres, booléens) ; aucune formule n'est évaluée.

export const MAX_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_UNZIPPED_BYTES = 10 * 1024 * 1024;

export class XlsxError extends Error {}

// ---------------------------------------------------------------- ZIP

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

async function pipe(bytes, stream, limit = Infinity) {
  const reader = new Blob([bytes]).stream().pipeThrough(stream).getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) { await reader.cancel(); throw new XlsxError('Fichier trop volumineux une fois décompressé'); }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { out.set(chunk, offset); offset += chunk.length; }
  return out;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** Archive ZIP (méthode deflate) à partir de { nom: texte }. */
export async function zip(files) {
  const parts = [];
  const central = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const compressed = await pipe(data, new CompressionStream('deflate-raw'));
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);       // version nécessaire
    local.setUint16(6, 0x0800, true);   // noms en UTF-8
    local.setUint16(8, 8, true);        // deflate
    local.setUint32(14, crc, true);
    local.setUint32(18, compressed.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    parts.push(new Uint8Array(local.buffer), nameBytes, compressed);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint16(10, 8, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, compressed.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, nameBytes.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), nameBytes);
    offset += 30 + nameBytes.length + compressed.length;
  }
  const centralSize = central.reduce((n, p) => n + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, Object.keys(files).length, true);
  end.setUint16(10, Object.keys(files).length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Uint8Array(await new Blob([...parts, ...central, new Uint8Array(end.buffer)]).arrayBuffer());
}

/** Contenu texte des fichiers d'une archive ZIP : { nom: texte }. */
export async function unzip(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 22) throw new XlsxError('Archive illisible');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new XlsxError('Archive illisible');
  const count = view.getUint16(end + 10, true);
  let pos = view.getUint32(end + 16, true);
  const files = {};
  let total = 0;
  for (let i = 0; i < count; i += 1) {
    if (pos + 46 > bytes.length || view.getUint32(pos, true) !== 0x02014b50) throw new XlsxError('Archive illisible');
    const method = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const size = view.getUint32(pos + 24, true);
    const nameLength = view.getUint16(pos + 28, true);
    const extraLength = view.getUint16(pos + 30, true);
    const commentLength = view.getUint16(pos + 32, true);
    const localOffset = view.getUint32(pos + 42, true);
    const name = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLength));
    pos += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith('/')) continue;
    total += size;
    if (total > MAX_UNZIPPED_BYTES) throw new XlsxError('Fichier trop volumineux une fois décompressé');
    if (localOffset + 30 > bytes.length || view.getUint32(localOffset, true) !== 0x04034b50) throw new XlsxError('Archive illisible');
    const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
    const raw = bytes.subarray(dataStart, dataStart + compressedSize);
    if (raw.length !== compressedSize) throw new XlsxError('Archive tronquée');
    let data;
    if (method === 0) data = raw;
    else if (method === 8) {
      try { data = await pipe(raw, new DecompressionStream('deflate-raw'), MAX_UNZIPPED_BYTES); } catch (error) {
        throw error instanceof XlsxError ? error : new XlsxError('Archive illisible');
      }
    } else throw new XlsxError('Compression non prise en charge');
    files[name] = decoder.decode(data);
  }
  return files;
}

// ---------------------------------------------------------------- XML

export const escapeXml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))
  // caractères interdits en XML 1.0
  // eslint-disable-next-line no-control-regex
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

export function unescapeXml(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e) => {
    const k = e.toLowerCase();
    if (k[0] === '#') return String.fromCodePoint(k[1] === 'x' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10));
    return { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[k];
  });
}

const tagRe = (tag, flags = 'g') => new RegExp(`<(?:\\w+:)?${tag}(\\s[^>]*)?(?:/>|>([\\s\\S]*?)</(?:\\w+:)?${tag}>)`, flags);
const attr = (attrs, name) => {
  const m = new RegExp(`(?:^|\\s)(?:\\w+:)?${name}\\s*=\\s*("([^"]*)"|'([^']*)')`).exec(attrs ?? '');
  return m ? unescapeXml(m[2] ?? m[3]) : null;
};
/** Texte d'un élément pouvant contenir du texte enrichi (<r><t>…</t></r>), sans le texte phonétique (<rPh>). */
const richText = (inner) => [...(inner ?? '').replace(tagRe('rPh'), '').matchAll(tagRe('t'))].map((m) => unescapeXml(m[2] ?? '')).join('');

/** Numéro de colonne (0 pour A) d'une référence de cellule comme « C12 ». */
export function columnIndex(ref) {
  let n = 0;
  for (const ch of /^[A-Z]+/i.exec(ref)?.[0].toUpperCase() ?? '') n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}
export function columnName(index) {
  let name = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

// ---------------------------------------------------------------- Lecture

/**
 * Lit un classeur : `{ sheets: [{ name, rows }] }`, dans l'ordre des onglets. `rows[i][j]` est la valeur de la
 * cellule (ligne i + 1, colonne j) : texte, nombre, booléen, ou undefined si vide.
 */
export async function readXlsx(bytes) {
  if (bytes.length > MAX_FILE_BYTES) throw new XlsxError('Fichier trop volumineux');
  let files;
  try { files = await unzip(bytes); } catch (error) {
    throw error instanceof XlsxError ? error : new XlsxError('Archive illisible');
  }
  const workbook = files['xl/workbook.xml'];
  if (!workbook) throw new XlsxError('Ce fichier n\'est pas un classeur Excel');
  const rels = {};
  for (const m of (files['xl/_rels/workbook.xml.rels'] ?? '').matchAll(tagRe('Relationship'))) {
    rels[attr(m[1], 'Id')] = attr(m[1], 'Target');
  }
  const shared = [...(files['xl/sharedStrings.xml'] ?? '').matchAll(tagRe('si'))].map((m) => richText(m[2]));
  const sheets = [];
  for (const m of workbook.matchAll(tagRe('sheet'))) {
    const name = attr(m[1], 'name') ?? '';
    const target = rels[attr(m[1], 'id')] ?? '';
    const path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
    const xml = files[path];
    const rows = [];
    if (xml) {
      let rowIndex = -1;
      for (const r of xml.matchAll(tagRe('row'))) {
        rowIndex = Number(attr(r[1], 'r') ?? rowIndex + 2) - 1;
        const row = [];
        let col = -1;
        for (const c of (r[2] ?? '').matchAll(tagRe('c'))) {
          const ref = attr(c[1], 'r');
          col = ref ? columnIndex(ref) : col + 1;
          const type = attr(c[1], 't') ?? 'n';
          const inner = c[2] ?? '';
          const v = tagRe('v', '').exec(inner)?.[2];
          let value;
          if (type === 's') value = shared[Number(v)];
          else if (type === 'inlineStr') value = richText(tagRe('is', '').exec(inner)?.[2]);
          else if (type === 'str' || type === 'e') value = v === undefined ? undefined : unescapeXml(v);
          else if (type === 'b') value = v === '1';
          else if (v !== undefined && v.trim() !== '') value = Number(v);
          if (value !== undefined && value !== '') row[col] = value;
        }
        rows[rowIndex] = row;
      }
    }
    sheets.push({ name, rows: Array.from(rows, (row) => row ?? []) });
  }
  return { sheets };
}

// ---------------------------------------------------------------- Écriture

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="3"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="14"/><name val="Calibri"/><family val="2"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDCE3F5"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

/** Styles de cellule disponibles pour l'écriture. */
export const STYLE = Object.freeze({ normal: 0, header: 1, wrap: 2, title: 3 });

function sheetXml({ rows, colWidths = [], freezeRows = 0, validations = [], selected = false }) {
  const cols = colWidths.length
    ? `<cols>${colWidths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '';
  const view = `<sheetViews><sheetView workbookViewId="0"${selected ? ' tabSelected="1"' : ''}>${freezeRows
    ? `<pane ySplit="${freezeRows}" topLeftCell="A${freezeRows + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${freezeRows + 1}" sqref="A${freezeRows + 1}"/>` : ''}</sheetView></sheetViews>`;
  const data = rows.map((row, r) => {
    const cells = row.map((cell, c) => {
      if (cell === null || cell === undefined) return '';
      const { value, style = 0 } = typeof cell === 'object' ? cell : { value: cell };
      if (value === null || value === undefined || value === '') return style ? `<c r="${columnName(c)}${r + 1}" s="${style}"/>` : '';
      const s = style ? ` s="${style}"` : '';
      return typeof value === 'number'
        ? `<c r="${columnName(c)}${r + 1}"${s}><v>${value}</v></c>`
        : `<c r="${columnName(c)}${r + 1}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
    }).join('');
    return `<row r="${r + 1}">${cells}</row>`;
  }).join('');
  const dv = validations.length ? `<dataValidations count="${validations.length}">${validations.map((v) =>
    `<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="${escapeXml(v.errorTitle ?? 'Valeur non valide')}" error="${escapeXml(v.error ?? '')}" sqref="${v.sqref}"><formula1>"${escapeXml(v.list.join(','))}"</formula1></dataValidation>`).join('')}</dataValidations>` : '';
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${view}<sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${data}</sheetData>${dv}<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;
}

/**
 * Écrit un classeur. `sheets` : [{ name, rows, colWidths?, freezeRows?, validations? }] (freezeRows : nombre de lignes figées en haut), où une cellule est
 * une valeur (texte ou nombre) ou `{ value, style }` (voir STYLE). Renvoie les octets du fichier .xlsx.
 */
export async function writeXlsx(sheets) {
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${sheets.map((s, i) => `<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': STYLES,
  };
  sheets.forEach((sheet, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = sheetXml({ ...sheet, selected: i === 0 }); });
  return zip(files);
}
