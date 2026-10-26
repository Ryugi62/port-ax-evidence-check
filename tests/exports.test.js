const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
// 브라우저에서는 모든 모듈이 한 전역(PortAx)에 이름을 펼친다 — 이름이 겹치면 뒤 모듈이 앞 모듈을 덮는다(10/26 REASON 충돌 재발 방지).
test('모듈 내보내기 이름이 서로 겹치지 않는다', () => {
  const seen = {};
  ['domain', 'application'].forEach(dir => {
    fs.readdirSync(path.join(__dirname, '..', 'src', dir)).filter(f => f.endsWith('.js')).forEach(f => {
      Object.keys(require(path.join('..', 'src', dir, f))).forEach(k => {
        assert.equal(seen[k], undefined, k + ' 가 ' + seen[k] + ' 와 ' + f + ' 에서 겹친다');
        seen[k] = f;
      });
    });
  });
});
