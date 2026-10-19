const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeReviews, canConfirm, STATUS } = require('../src/domain/review.js');
const { buildReviewLog, reviewLogToCsv } = require('../src/application/reviewlog.js');

const ids = Array.from({ length: 16 }, (_, i) => 'B' + (i + 1));

test('S6 GWT4: 확인 8 · 반려 2 · 미확인 6 = 16', () => {
  const reviews = {};
  ids.slice(0, 8).forEach(i => (reviews[i] = { status: STATUS.CONFIRMED, at: '2026-10-20T10:00:00.000Z' }));
  ids.slice(8, 10).forEach(i => (reviews[i] = { status: STATUS.REJECTED, at: '2026-10-20T10:01:00.000Z' }));
  const s = summarizeReviews(ids, reviews);
  assert.deepEqual(s, { confirmed: 8, rejected: 2, pending: 6, total: 16 });
  const log = buildReviewLog(ids, reviews);
  assert.equal(log.rows.length, 16);
  assert.equal(log.rows.filter(r => r.status !== STATUS.PENDING).every(r => /^\d{4}-\d\d-\d\dT/.test(r.at)), true);
  assert.equal(log.summary.confirmed + log.summary.rejected + log.summary.pending, log.summary.total);
  const csv = reviewLogToCsv(log);
  assert.equal(csv.trim().split('\n').length, 18); // 머리 1 + 16건 + 합계 1
  assert.match(csv, /B1,확인함,2026-10-20T10:00:00.000Z/);
  assert.match(csv, /B16,미확인,/);
});
test('알 수 없는 id의 확인은 집계에서 뺀다', () => {
  const s = summarizeReviews(['a', 'b'], { a: { status: STATUS.CONFIRMED, at: 't' }, z: { status: STATUS.CONFIRMED, at: 't' } });
  assert.deepEqual(s, { confirmed: 1, rejected: 0, pending: 1, total: 2 });
});
test('GWT2: 약한 판정은 근거를 열기 전 확인함 비활성, 정상 판정은 활성', () => {
  assert.equal(canConfirm({ weak: true }, { opened: false }), false);
  assert.equal(canConfirm({ weak: true }, { opened: true }), true);
  assert.equal(canConfirm({ weak: false }, { opened: false }), true);
});
