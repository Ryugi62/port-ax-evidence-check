const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadData } = require('../src/application/loader.js');
const { buildItems, sortWeakFirst } = require('../src/application/listing.js');
const B = require('../src/application/baseline.js');
const { rng } = require('../src/domain/measure.js');

const data = loadData(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data.json'), 'utf8')));
const items = buildItems(data);

test('순서 지표: 심은 오판의 자리(1부터), 앞 k건 안 개수, 평균 자리', () => {
  const order = [{ planted: false }, { planted: true }, { planted: false }, { planted: true }];
  const m = B.orderMetrics(order, [5, 2]);
  assert.deepEqual(m.positions, [2, 4]);
  assert.equal(m.meanRank, 3);
  assert.equal(m.lastRank, 4);
  assert.deepEqual(m.firstK, { 5: 2, 2: 1 });
});
test('무작위 순서의 정확한 기댓값: 앞 k건 안 개수 = m*k/N, 평균 자리 = (N+1)/2, 마지막 자리 = m(N+1)/(m+1)', () => {
  const e = B.randomExpectation(28, 10, [5, 10]);
  assert.ok(Math.abs(e.firstK[5] - 10 * 5 / 28) < 1e-9);
  assert.ok(Math.abs(e.meanRank - 14.5) < 1e-9);
  assert.ok(Math.abs(e.lastRank - 10 * 29 / 11) < 1e-9);
});
test('정확한 기댓값은 시드 고정 무작위 섞기 20000회 평균과 0.1 안에서 일치한다', () => {
  const r = rng(20261026);
  let f5 = 0, f10 = 0, last = 0; const R = 20000;
  for (let t = 0; t < R; t++) {
    const a = items.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    const m = B.orderMetrics(a, [5, 10]); f5 += m.firstK[5]; f10 += m.firstK[10]; last += m.lastRank;
  }
  const e = B.randomExpectation(28, 10, [5, 10]);
  assert.ok(Math.abs(f5 / R - e.firstK[5]) < 0.1);
  assert.ok(Math.abs(f10 / R - e.firstK[10]) < 0.1);
  assert.ok(Math.abs(last / R - e.lastRank) < 0.3);
});
test('28건: 빨간 우선은 앞 5건에 숫자형 4건을 모두 올린다(자리 1·2·4·5)', () => {
  const c = B.compare(items, sortWeakFirst, [5, 10]);
  assert.deepEqual(c.redFirst.numberPositions, [1, 2, 4, 5]);
  assert.equal(c.redFirst.firstK[5], 4);
  assert.equal(c.redFirst.firstK[10], 6);
  assert.equal(c.redFirst.meanRank, 9.2);
  assert.ok(c.random.firstK[5] < 2 && c.random.firstK[10] < 4);
  assert.ok(c.oracle.meanRank <= c.redFirst.meanRank, '신뢰도가 완벽한 이론 상한은 우리보다 낫다 — 숨기지 않는다');
});
test('끝까지 다 읽으면 열 건을 다 찾는 점은 같다: 마지막 자리 차이는 작다(숨기지 않는다)', () => {
  const c = B.compare(items, sortWeakFirst, [5, 10]);
  assert.equal(c.redFirst.lastRank, 25);
  assert.ok(c.random.lastRank > 25);
});
