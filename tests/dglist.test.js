const test = require('node:test');
const assert = require('node:assert/strict');
const D = require('../src/domain/dglist.js');

test('인화점 구분: 위험물 선박운송 및 저장규칙 제2조 가목 구간(-18 미만 저 / -18~23 미만 중 / 23~60 고)', () => {
  assert.equal(D.flashCategory(-19), '저인화점');
  assert.equal(D.flashCategory(-18), '중인화점');
  assert.equal(D.flashCategory(22.9), '중인화점');
  assert.equal(D.flashCategory(23), '고인화점');
  assert.equal(D.flashCategory(60), '고인화점');
  assert.equal(D.flashCategory(61), null);   // 60도 초과는 인화성 액체류 구간 밖(고온 운송 예외는 판단하지 않는다)
});
test('용기등급: 인화점 23 미만 -> II, 23~60 -> III (초기 끓는점 35 초과 가정). I은 끓는점이 있어야 판단', () => {
  assert.equal(D.impliedPackingGroup(10), 'II');
  assert.equal(D.impliedPackingGroup(23), 'III');
  assert.equal(D.impliedPackingGroup(60), 'III');
  assert.equal(D.impliedPackingGroup(61), null);
});
test('정상: UN1263 페인트 / 제3급 / 인화점 10도 / 중인화점 / 용기등급 II 는 어긋남 0', () => {
  const r = D.checkDgItem({ un: 'UN1263', cls: '3', flash: 10, flashCat: '중인화점', pg: 'II' });
  assert.equal(r.weak, false); assert.deepEqual(r.reasons, []); assert.equal(r.entry.name.startsWith('Paint'), true);
});
test('UN1263 + 제8급 -> CLASS_MISMATCH (목록상 제3급, UN3066 페인트류가 제8급)', () => {
  const r = D.checkDgItem({ un: 'UN1263', cls: '8' });
  assert.equal(r.weak, true); assert.deepEqual(r.reasons, [D.DG_REASON.CLASS_MISMATCH]);
  assert.deepEqual(r.details[0], { field: 'cls', claimed: '8', listed: ['3'] });
});
test('인화점 10도인데 고인화점으로 기재 -> FLASH_CATEGORY_MISMATCH', () => {
  const r = D.checkDgItem({ un: 'UN1263', cls: '3', flash: 10, flashCat: '고인화점' });
  assert.deepEqual(r.reasons, [D.DG_REASON.FLASH_CATEGORY_MISMATCH]);
  assert.equal(r.details[0].derived, '중인화점');
});
test('인화점 30도인데 용기등급 II -> PG_MISMATCH (III 이어야 함)', () => {
  const r = D.checkDgItem({ un: 'UN1170', cls: '3', flash: 30, pg: 'II' });
  assert.deepEqual(r.reasons, [D.DG_REASON.PG_MISMATCH]); assert.equal(r.details[0].derived, 'III');
});
test('용기등급 I 은 끓는점 없이 판단 불가 -> 어긋남이 아니라 UNVERIFIED 안내', () => {
  const r = D.checkDgItem({ un: 'UN1263', cls: '3', flash: 10, pg: 'I' });
  assert.equal(r.weak, false); assert.deepEqual(r.notes, [D.DG_NOTE.PG_I_NEEDS_BOILING]);
});
test('목록 발췌에 없는 UN번호 -> 빨간 표시가 아니라 대조 불가 안내', () => {
  const r = D.checkDgItem({ un: 'UN9999', cls: '3' });
  assert.equal(r.weak, false); assert.deepEqual(r.notes, [D.DG_NOTE.UN_NOT_IN_EXCERPT]); assert.equal(r.entry, null);
});
test('UN번호 형식: 숫자 4자리만 받고 공백·소문자를 정리한다', () => {
  assert.equal(D.normalizeUn(' un 1263 '), 'UN1263');
  assert.equal(D.normalizeUn('1263'), 'UN1263');
  assert.equal(D.normalizeUn('12'), null);
});
test('UN1950 에어로졸은 제2류 하위(2.1·2.2)를 모두 받는다; UN2810 독물은 6.1, UN3082은 9', () => {
  assert.equal(D.checkDgItem({ un: 'UN1950', cls: '2.1' }).weak, false);
  assert.equal(D.checkDgItem({ un: 'UN1950', cls: '3' }).weak, true);
  assert.equal(D.checkDgItem({ un: 'UN2810', cls: '6.1' }).weak, false);
  assert.equal(D.checkDgItem({ un: 'UN3082', cls: '9' }).weak, false);
});
test('제3급이 아닌데 인화점 구분을 적으면 구분 대조는 건너뛴다(제3급 규칙)', () => {
  const r = D.checkDgItem({ un: 'UN3082', cls: '9', flash: 10, flashCat: '고인화점' });
  assert.equal(r.weak, false);
});
test('출처 표기가 데이터에 붙어 있다(발췌 범위 한계 고지)', () => {
  assert.match(D.SOURCE_NOTE, /49 CFR/); assert.match(D.SOURCE_NOTE, /IMDG/);
});
test('Class 칸을 비우면 목록의 단일 Class(UN1263 -> 3)로 보고 인화점 구분·용기등급을 대조한다', () => {
  const r = D.checkDgItem({ un: 'UN1263', flash: 10, flashCat: '고인화점' });
  assert.deepEqual(r.reasons, [D.DG_REASON.FLASH_CATEGORY_MISMATCH]);
});
