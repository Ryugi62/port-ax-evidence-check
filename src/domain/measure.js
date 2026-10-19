/* 도메인: 사람 확인자 측정 모드. 순수 함수 — DOM·시계·네트워크를 모른다. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.PortAx = root.PortAx || {}; Object.keys(api).forEach(function (k) { root.PortAx[k] = api[k]; }); }
})(typeof self !== 'undefined' ? self : this, function () {
  var PLANTED_N = 4, NORMAL_N = 8, MAX_HITS = 5;
  var CONFIRMED = '확인함', REJECTED = '반려';

  // 시드 난수(mulberry32): 같은 시드는 항상 같은 수열.
  function rng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rand) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // 12건 선정(심은 4 + 정상 8) → 조건 A/B 6:6(심은 2:2) → 제시 순서 섞기.
  function planSession(cases, seed) {
    var rand = rng(seed);
    var planted = shuffle(cases.filter(function (c) { return c.planted; }), rand).slice(0, PLANTED_N);
    var normal = shuffle(cases.filter(function (c) { return !c.planted; }), rand).slice(0, NORMAL_N);
    var pc = shuffle(['A', 'A', 'B', 'B'], rand), nc = shuffle(['A', 'A', 'A', 'A', 'B', 'B', 'B', 'B'], rand);
    var plan = planted.map(function (c, i) { return { id: c.id, cond: pc[i] }; })
      .concat(normal.map(function (c, i) { return { id: c.id, cond: nc[i] }; }));
    return shuffle(plan, rand);
  }

  function median(xs) {
    if (!xs || !xs.length) return null;
    var s = xs.slice().sort(function (a, b) { return a - b; }), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  // 기록: {id, cond, ms, choice}. 정답 = 심은 건은 반려, 정상 건은 확인함.
  function summarize(records, cases) {
    var byId = {}; cases.forEach(function (c) { byId[c.id] = c; });
    var out = { total: records.length };
    ['A', 'B'].forEach(function (cond) {
      var rs = records.filter(function (r) { return r.cond === cond; });
      var planted = rs.filter(function (r) { return byId[r.id] && byId[r.id].planted; });
      out[cond] = {
        n: rs.length,
        medianMs: median(rs.map(function (r) { return r.ms; })),
        correct: rs.filter(function (r) { var p = byId[r.id] && byId[r.id].planted; return p ? r.choice === REJECTED : r.choice === CONFIRMED; }).length,
        planted: planted.length,
        found: planted.filter(function (r) { return r.choice === REJECTED; }).length
      };
    });
    return out;
  }

  // 복사 코드: [버전, 시드, [[id, 조건, ms, 선택(1=반려)], ...]] → JSON 압축 → base64url.
  function b64enc(s) {
    if (typeof Buffer !== 'undefined') return Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64dec(s) {
    var p = s.replace(/-/g, '+').replace(/_/g, '/'); while (p.length % 4) p += '=';
    if (typeof Buffer !== 'undefined') return Buffer.from(p, 'base64').toString('utf8');
    return decodeURIComponent(escape(atob(p)));
  }
  function encodeCode(seed, records) {
    var rows = records.map(function (r) { return [r.id, r.cond, Math.round(r.ms), r.choice === REJECTED ? 1 : 0]; });
    return b64enc(JSON.stringify([1, seed, rows]));
  }
  function decodeCode(code) {
    var bad = new Error('측정 코드를 읽을 수 없습니다');
    if (typeof code !== 'string' || !/^[A-Za-z0-9_-]+$/.test(code.trim())) throw bad;
    var v;
    try { v = JSON.parse(b64dec(code.trim())); } catch (e) { throw bad; }
    if (!Array.isArray(v) || v[0] !== 1 || typeof v[1] !== 'number' || !Array.isArray(v[2])) throw bad;
    var records = v[2].map(function (r) {
      if (!Array.isArray(r) || r.length !== 4 || (r[1] !== 'A' && r[1] !== 'B')) throw bad;
      return { id: r[0], cond: r[1], ms: r[2], choice: r[3] === 1 ? REJECTED : CONFIRMED };
    });
    return { seed: v[1], records: records };
  }

  // 조건 A 도구: 법령 조문 키워드 검색(최대 5건, 조 단위 원문).
  function searchArticles(law, query) {
    var q = (query || '').trim();
    if (!q) return [];
    var hits = [];
    Object.keys(law.articles).forEach(function (no) {
      var a = law.articles[no];
      var text = a.head + '\n' + a.paras.map(function (p) { return [p.text].concat((p.items || []).map(function (i) { return i.text; })).join('\n'); }).join('\n');
      if (text.indexOf(q) >= 0) hits.push({ article: no, title: a.title, text: text });
    });
    return hits.slice(0, MAX_HITS);
  }

  return { rng: rng, planSession: planSession, median: median, summarize: summarize, encodeCode: encodeCode, decodeCode: decodeCode, searchArticles: searchArticles, CONFIRMED: CONFIRMED, REJECTED: REJECTED };
});
