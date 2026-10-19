/* 도메인: 약한 판정(WeakVerdict) 규칙. DOM·fetch·파일을 모른다. 모델 호출 0. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.PortAx = root.PortAx || {}; Object.keys(api).forEach(function (k) { root.PortAx[k] = api[k]; }); }
})(typeof self !== 'undefined' ? self : this, function () {
  var REASON = { NO_BASIS: 'NO_BASIS', NUMBER_MISSING: 'NUMBER_MISSING', NUMBER_AMBIGUOUS: 'NUMBER_AMBIGUOUS' };
  var REASON_TEXT = {
    NO_BASIS: '근거 조문이 연결되지 않았거나 조문 번호가 데이터에 없음',
    NUMBER_MISSING: '판정 문장의 숫자·기한이 근거 원문에 없음',
    NUMBER_AMBIGUOUS: '근거 원문에 같은 종류(기한 등)의 다른 숫자가 함께 있어 어느 쪽인지 확인 필요'
  };
  var UNITS = ['개월', '일', '년', '시간', '회', '개', '통', '부', '톤', '%'];
  var PERIOD_UNITS = ['일', '개월', '년', '시간']; // 한 묶음(기한)으로 대조
  var TOKEN = new RegExp('(?<![\\d,.])(\\d{1,3}(?:,\\d{3})+|\\d+(?:\\.\\d+)?)(?![\\d,])\\s?(' + UNITS.map(function (u) { return u === '%' ? '%' : u; }).join('|') + ')', 'g');

  function family(unit) { return PERIOD_UNITS.indexOf(unit) >= 0 ? '기한' : unit; }

  function extractQuantities(text) {
    var out = [], m;
    TOKEN.lastIndex = 0;
    var s = String(text == null ? '' : text);
    while ((m = TOKEN.exec(s)) !== null) {
      // 「100분의 50」 같은 분수·소수점 뒤 숫자는 위 정규식이 이미 제외
      out.push({ value: m[1].replace(/,/g, ''), unit: m[2], raw: m[0].replace(/\s/g, '') });
    }
    return out;
  }

  // 원문 안의 위치(index, length)까지 돌려준다 (강조 표시용).
  function locateQuantities(text) {
    var out = [], m, s = String(text == null ? '' : text);
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(s)) !== null) {
      out.push({ value: m[1].replace(/,/g, ''), unit: m[2], raw: m[0].replace(/\s/g, ''), index: m.index, length: m[0].length });
    }
    return out;
  }

  function judgeVerdict(claim, basisText) {
    var reasons = [], details = [];
    if (basisText == null || String(basisText).trim() === '') {
      return { weak: true, reasons: [REASON.NO_BASIS], details: [] };
    }
    var claimQ = extractQuantities(claim), basisQ = extractQuantities(basisText);
    var missing = false, ambiguous = false;
    claimQ.forEach(function (q) {
      var found = basisQ.some(function (b) { return b.value === q.value && b.unit === q.unit; });
      if (!found) { missing = true; details.push({ reason: REASON.NUMBER_MISSING, token: q.raw, others: [] }); return; }
      var others = basisQ.filter(function (b) { return family(b.unit) === family(q.unit) && !(b.value === q.value && b.unit === q.unit); })
        .map(function (b) { return b.raw; }).filter(function (v, i, a) { return a.indexOf(v) === i; });
      if (others.length) { ambiguous = true; details.push({ reason: REASON.NUMBER_AMBIGUOUS, token: q.raw, others: others }); }
    });
    var matched = claimQ.filter(function (q) { return basisQ.some(function (b) { return b.value === q.value && b.unit === q.unit; }); }).map(function (q) { return q.raw; });
    if (missing) reasons.push(REASON.NUMBER_MISSING);
    if (ambiguous) reasons.push(REASON.NUMBER_AMBIGUOUS);
    return { weak: reasons.length > 0, reasons: reasons, details: details, matched: matched };
  }

  return { REASON: REASON, REASON_TEXT: REASON_TEXT, extractQuantities: extractQuantities, locateQuantities: locateQuantities, judgeVerdict: judgeVerdict };
});
