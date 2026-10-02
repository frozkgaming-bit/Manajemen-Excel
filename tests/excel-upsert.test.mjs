import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function loadSource(filePath, context) {
  const source = fs.readFileSync(filePath, 'utf8')
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*\r?\n/gm, '')
    .replace(/^export\s+const\s+/gm, 'var ')
    .replace(/^export\s+function\s+/gm, 'function ')
    .replace(/^export\s+/gm, '');

  vm.runInContext(source, context);
}

const context = {
  console,
  window: { supabase: { createClient() { return {}; } } },
  document: {},
  setTimeout,
  clearTimeout,
};
vm.createContext(context);
loadSource(new URL('../public/js/config/supabase.js', import.meta.url), context);
loadSource(new URL('../public/js/modules/excel.js', import.meta.url), context);

const { cleanSuratUkur, buildSignature, ID_COLUMNS } = context;

test('cleanSuratUkur normalizes equivalent surat ukur values', () => {
  assert.equal(cleanSuratUkur('SU 123/ABC/2024'), 'SU 123/2024');
  assert.equal(cleanSuratUkur('SU.123/ABC/2024'), 'SU 123/2024');
  assert.equal(cleanSuratUkur('GS 001/XYZ/2023'), 'GS 001/2023');
  assert.equal(cleanSuratUkur('GS. 001 / XYZ / 2023'), 'GS 001/2023');
  assert.equal(cleanSuratUkur('123/ABC/2024'), '123/2024');
});

test('buildSignature treats equivalent natural-key identifiers as the same row', () => {
  const rowA = {
    kelurahan: 'Cimahi',
    nomor_hak: '123',
    surat_ukur: 'SU 123/ABC/2024',
    nib: ' 1A2B ',
  };

  const rowB = {
    kelurahan: 'Cimahi',
    nomor_hak: '123',
    surat_ukur: 'SU.123/ABC/2024',
    nib: '1A2B',
  };

  assert.equal(buildSignature(rowA, ID_COLUMNS), buildSignature(rowB, ID_COLUMNS));
});

test('buildSignature differs when identifier actually differs', () => {
  const rowA = { kelurahan: 'Cimahi', nomor_hak: '123', surat_ukur: 'SU 1/ABC/2024', nib: '1A2B' };
  const rowB = { kelurahan: 'Cimahi', nomor_hak: '124', surat_ukur: 'SU 1/ABC/2024', nib: '1A2B' };
  assert.notEqual(buildSignature(rowA, ID_COLUMNS), buildSignature(rowB, ID_COLUMNS));
});
