const test = require('node:test');
const assert = require('node:assert/strict');
const { highlightBasis } = require('../src/application/highlight.js');
const { judgeVerdict } = require('../src/domain/weak.js');

const article = '제16조(t)\n① 변경승인: 변경사유가 발생한 날부터 1개월\n② 신청서 접수일부터 15일 이내에 결과를 통보';

test('GWT3: 어긋난 두 숫자가 각각 어느 항에 있는지 표시한다', () => {
  const v = judgeVerdict('신청인은 1개월 이내에 신고한다.', article);
  const segs = highlightBasis(article, v);
  const hit = segs.filter(s => s.kind !== 'plain');
  assert.deepEqual(hit.map(s => [s.text, s.kind, s.where]), [['1개월', 'match', '①항'], ['15일', 'other', '②항']]);
  assert.equal(segs.map(s => s.text).join(''), article);
});
test('정상 판정은 일치 숫자만 강조(다른 숫자 없음)', () => {
  const b = '최소 24시간이 지난 후에 선적해야 한다';
  const segs = highlightBasis(b, judgeVerdict('24시간 경과', b));
  assert.deepEqual(segs.filter(s => s.kind !== 'plain').map(s => [s.text, s.kind]), [['24시간', 'match']]);
});
test('근거 없음이면 한 덩어리 plain', () => {
  assert.deepEqual(highlightBasis('', judgeVerdict('x', null)), []);
});
