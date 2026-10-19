const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../src/domain/measure.js');
const data = require('../data.json');
const cases = data.cases;

test('M1: 12건 선정 · A/B 6:6 · 심은 오판 A2 B2 · 정상 8', () => {
  [1, 7, 20261020, 99999].forEach(seed => {
    const plan = M.planSession(cases, seed);
    assert.equal(plan.length, 12);
    assert.equal(new Set(plan.map(p => p.id)).size, 12);
    const by = c => plan.filter(p => p.cond === c);
    assert.equal(by('A').length, 6);
    assert.equal(by('B').length, 6);
    const pl = id => cases.find(c => c.id === id).planted;
    assert.equal(by('A').filter(p => pl(p.id)).length, 2);
    assert.equal(by('B').filter(p => pl(p.id)).length, 2);
    assert.equal(plan.filter(p => pl(p.id)).length, 4);
  });
});
test('M1: 같은 시드는 같은 계획, 다른 시드 20개 중 서로 다른 것 ≥15', () => {
  assert.deepEqual(M.planSession(cases, 7), M.planSession(cases, 7));
  const sigs = new Set();
  for (let s = 1; s <= 20; s++) sigs.add(JSON.stringify(M.planSession(cases, s).map(p => p.id + p.cond)));
  assert.ok(sigs.size >= 15, 'distinct ' + sigs.size);
});
test('M2: 중앙값 홀수·짝수·빈 입력', () => {
  assert.equal(M.median([3, 1, 2]), 2);
  assert.equal(M.median([4, 1, 3, 2]), 2.5);
  assert.equal(M.median([]), null);
  assert.equal(M.median([5]), 5);
});
test('M2: 조건별 요약 — 중앙값 · 정오 · 심은 오판 발견', () => {
  const plan = M.planSession(cases, 7);
  const pl = id => cases.find(c => c.id === id).planted;
  // 전부 정답으로 답함: 심은 건 반려, 정상 건 확인함. A는 1000ms씩, B는 500ms씩
  const recs = plan.map(p => ({ id: p.id, cond: p.cond, ms: p.cond === 'A' ? 1000 : 500, choice: pl(p.id) ? '반려' : '확인함' }));
  const s = M.summarize(recs, cases);
  assert.equal(s.A.n, 6); assert.equal(s.B.n, 6);
  assert.equal(s.A.medianMs, 1000); assert.equal(s.B.medianMs, 500);
  assert.equal(s.A.correct, 6); assert.equal(s.B.correct, 6);
  assert.equal(s.A.found, 2); assert.equal(s.B.found, 2);
  assert.equal(s.A.planted, 2); assert.equal(s.total, 12);
  // 심은 건 하나를 확인함으로 놓침
  const miss = recs.map(r => ({ ...r }));
  const i = miss.findIndex(r => r.cond === 'B' && pl(r.id)); miss[i].choice = '확인함';
  const s2 = M.summarize(miss, cases);
  assert.equal(s2.B.found, 1); assert.equal(s2.B.correct, 5);
});
test('M3: 복사 코드 왕복 디코드 · 길이 ≤600 · 깨진 코드 오류', () => {
  const plan = M.planSession(cases, 20261020);
  const recs = plan.map((p, i) => ({ id: p.id, cond: p.cond, ms: 1234 + i * 977, choice: i % 3 ? '확인함' : '반려' }));
  const code = M.encodeCode(20261020, recs);
  assert.match(code, /^[A-Za-z0-9_-]+$/);
  assert.ok(code.length <= 600, 'len ' + code.length);
  assert.deepEqual(M.decodeCode(code), { seed: 20261020, records: recs });
  assert.throws(() => M.decodeCode('@@깨짐'), /코드/);
  assert.throws(() => M.decodeCode(code.slice(0, 10)), /코드/);
});
test('조문 검색: 키워드로 조문을 찾는다(조건 A 도구)', () => {
  const law = data.laws.hazmat;
  const r = M.searchArticles(law, '명세서');
  assert.ok(r.length >= 1 && r.length <= 5);
  assert.ok(r.every(x => /명세서/.test(x.text)));
  assert.deepEqual(M.searchArticles(law, ' '), []);
});
