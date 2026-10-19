const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRef, resolveBasis } = require('../src/domain/refs.js');

const law = { articles: {
  '제16조': { title: 't', head: '제16조(t)', paras: [
    { no: '①', text: '① 가 1개월', items: [{ no: '1.', text: '1. 최초' }, { no: '2.', text: '2. 변경: 1개월' }] },
    { no: '②', text: '② 15일 이내', items: [] } ] },
  '제19조의3': { title: 'x', head: '제19조의3(x)', paras: [{ no: '①', text: '① a', items: [] }] },
  '제7조': { title: 'y', head: '제7조(y) 본문만 있다', paras: [] },
} };

test('참조 문자열 분해', () => {
  assert.deepEqual(parseRef('제16조제1항제2호'), { article: '제16조', para: 1, item: 2 });
  assert.deepEqual(parseRef('제16조제1항 단서'), { article: '제16조', para: 1, item: null });
  assert.deepEqual(parseRef('제19조의3제3항'), { article: '제19조의3', para: 3, item: null });
  assert.deepEqual(parseRef(' 제7조 '), { article: '제7조', para: null, item: null });
  assert.equal(parseRef('엉터리'), null);
  assert.equal(parseRef(''), null);
  assert.equal(parseRef(null), null);
});
test('가장 작은 인용 단위가 근거다', () => {
  assert.equal(resolveBasis(law, '제16조제1항제2호').unit, 'item');
  assert.match(resolveBasis(law, '제16조제1항제2호').text, /변경: 1개월/);
  assert.equal(resolveBasis(law, '제16조제2항').unit, 'para');
  assert.equal(resolveBasis(law, '제16조').unit, 'article');
  assert.match(resolveBasis(law, '제16조').text, /1개월[\s\S]*15일/);
  assert.match(resolveBasis(law, '제7조').text, /본문만/);
});
test('없는 조문·항·호는 null (NO_BASIS의 입력)', () => {
  assert.equal(resolveBasis(law, '제99조'), null);
  assert.equal(resolveBasis(law, '제16조제9항'), null);
  assert.equal(resolveBasis(law, '제16조제1항제9호'), null);
  assert.equal(resolveBasis(law, ''), null);
});
