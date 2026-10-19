const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadData } = require('../src/application/loader.js');
const { buildItems, sortWeakFirst, evaluatePlanted } = require('../src/application/listing.js');
const { REASON } = require('../src/domain/weak.js');

const data = loadData(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data.json'), 'utf8')));
const items = buildItems(data);

test('데이터: 28건, 심은 오판 10건(숫자형 4 이상), 정상 18건, 머리 고지', () => {
  assert.equal(items.length, 28);
  assert.equal(items.filter(i => i.planted).length, 10);
  assert.ok(items.filter(i => i.plantedType === 'number').length >= 4);
  assert.equal(items.filter(i => !i.planted).length, 18);
  assert.match(data.note, /합성 사례, 실제 주최 서류 아님/);
  assert.ok(data.laws.hazmat.effective && data.laws.portact.effective);
});
test('S2: 모든 사례의 근거 조문이 판정 옆에 표시될 수 있다(근거 누락 0)', () => {
  const missing = items.filter(i => !i.basis);
  assert.deepEqual(missing.map(i => i.id), []);
  assert.equal(items.filter(i => i.set === 'B').length, 16);
  items.forEach(i => assert.ok(i.basis.text.length > 5 && i.basis.label));
});
test('GWT1: 정렬하면 약한 판정(빨강)이 맨 위에 모인다', () => {
  const sorted = sortWeakFirst(items);
  const firstOk = sorted.findIndex(i => !i.verdict.weak);
  assert.ok(firstOk > 0);
  assert.equal(sorted.slice(firstOk).some(i => i.verdict.weak), false);
});
test('S3·S4 재현 시험: 숫자·기한형 심은 오판 재현율 >= 3/4, 정상 오탐 <= 2', () => {
  const ev = evaluatePlanted(items);
  console.log('재현 시험 결과', JSON.stringify(ev));
  assert.equal(ev.number.total, 4);
  assert.ok(ev.number.flagged >= 3, '숫자형 재현 ' + ev.number.flagged + '/' + ev.number.total);
  assert.ok(ev.normal.falseFlags <= 2, '오탐 ' + ev.normal.falseFlags);
  assert.equal(ev.all.total, 10);
  assert.equal(ev.normal.total, 18);
  assert.equal(ev.setB.total, 6);
});
test('개별: A13 5년(25년 이상 호 -> 3년) MISSING, A15 15일 MISSING, A18 3회 MISSING, B12 20일 MISSING', () => {
  const by = Object.fromEntries(items.map(i => [i.id, i]));
  for (const id of ['A13', 'A15', 'A18', 'B12']) {
    assert.deepEqual(by[id].verdict.reasons, [REASON.NUMBER_MISSING], id);
  }
});
test('S8·S7: index.html 은 띠 문구가 항상 있고 외부 주소·쿠키·저장소·네트워크 호출이 없다', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const js = ['app.js', ...fs.readdirSync(path.join(__dirname, '..', 'src', 'domain')).map(f => 'src/domain/' + f), ...fs.readdirSync(path.join(__dirname, '..', 'src', 'application')).map(f => 'src/application/' + f)]
    .map(f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).join('\n');
  assert.match(html, /합성 사례/);
  assert.match(html, /공개 법령/);
  assert.match(html, /AI 판정은 보조/);
  assert.match(html, /id="band"/);
  assert.equal(/(src|href)\s*=\s*["']https?:/.test(html), false);
  assert.equal(/<input[^>]*type="(password|email)"/.test(html), false);
  assert.equal(/document\.cookie|localStorage|sessionStorage|indexedDB|XMLHttpRequest|WebSocket|sendBeacon/.test(js), false);
  assert.equal(/https?:\/\//.test(js), false);
});
