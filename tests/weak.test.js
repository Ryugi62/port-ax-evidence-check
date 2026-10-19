const test = require('node:test');
const assert = require('node:assert/strict');
const { extractQuantities, judgeVerdict, REASON } = require('../src/domain/weak.js');

test('숫자+단위 토큰을 뽑는다', () => {
  assert.deepEqual(extractQuantities('접수일부터 15일 이내에 통보'), [{ value: '15', unit: '일', raw: '15일' }]);
  assert.deepEqual(extractQuantities('변경사유가 발생한 날부터 1개월'), [{ value: '1', unit: '개월', raw: '1개월' }]);
  assert.deepEqual(extractQuantities('총톤수 1,500톤'), [{ value: '1500', unit: '톤', raw: '1,500톤' }]);
});
test('조문 번호·서식 번호·분수는 숫자 토큰이 아니다', () => {
  assert.deepEqual(extractQuantities('법 제35조제1항제2호, 별지 제4호서식'), []);
  assert.deepEqual(extractQuantities('전체 예항력의 100분의 50을 넘는'), []);
});
test('앞뒤 숫자와 붙은 숫자는 한 토큰이다 (5년은 25년 안에 있지 않다)', () => {
  const q = extractQuantities('선령이 25년 미만인 경우: 5년');
  assert.deepEqual(q.map(x => x.raw), ['25년', '5년']);
});
test('S1 규칙(가) 근거 없음 -> NO_BASIS', () => {
  const r = judgeVerdict('적합. 수하인 주소가 없어도 접수한다.', null);
  assert.equal(r.weak, true);
  assert.deepEqual(r.reasons, [REASON.NO_BASIS]);
});
test('규칙(나) 판정 숫자가 근거에 없으면 NUMBER_MISSING', () => {
  const basis = '사유가 발생한 날부터 30일 이내에 위험물운송적합증을 반납하여야 한다.';
  const r = judgeVerdict('사유 발생일부터 20일 안에 반납해야 한다.', basis);
  assert.equal(r.weak, true);
  assert.deepEqual(r.reasons, [REASON.NUMBER_MISSING]);
  assert.equal(r.details[0].token, '20일');
});
test('규칙(다) GWT3: 1개월 판정 + 근거에 15일이 함께 있으면 NUMBER_AMBIGUOUS, 두 숫자 위치 정보', () => {
  const basis = '① 변경승인: 변경사유가 발생한 날부터 1개월 ② 신청서 접수일부터 15일 이내에 결과를 통보';
  const r = judgeVerdict('신청인은 1개월 이내에 신고한다.', basis);
  assert.equal(r.weak, true);
  assert.deepEqual(r.reasons, [REASON.NUMBER_AMBIGUOUS]);
  assert.equal(r.details[0].token, '1개월');
  assert.deepEqual(r.details[0].others, ['15일']);
});
test('숫자가 일치하고 다른 숫자가 없으면 정상', () => {
  const r = judgeVerdict('24시간이 지났고 부표찰도 있어 선적 가능하다.', '훈증제가 투입되고 최소 24시간이 지난 후에 선적해야 한다');
  assert.equal(r.weak, false);
  assert.deepEqual(r.reasons, []);
});
test('같은 값이 근거에 두 번 나와도 어긋남이 아니다', () => {
  const r = judgeVerdict('육상구역의 관로마다 1개 이상 설치해야 한다.', '선석마다 1개 이상 설치하며 관로마다 1개 이상 설치한다');
  assert.equal(r.weak, false);
});
test('판정에 숫자가 없으면 숫자 규칙은 판단하지 않는다 (의미 반전은 한계)', () => {
  const r = judgeVerdict('제어온도와 비상온도는 적지 않아도 된다.', '제어온도와 비상온도를 각각 기재해야 한다.');
  assert.equal(r.weak, false);
});
test('빈 근거 문자열도 NO_BASIS', () => {
  assert.deepEqual(judgeVerdict('15일 안에', '  ').reasons, [REASON.NO_BASIS]);
});
