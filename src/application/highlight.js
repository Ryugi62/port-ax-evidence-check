/* 응용: 근거 원문에서 대조된 숫자를 강조할 조각으로 나눈다. 순수 함수. */
(function (root, factory) {
  var api = factory(typeof require !== 'undefined' ? require('../domain/weak.js') : root.PortAx);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.PortAx = root.PortAx || {}; Object.keys(api).forEach(function (k) { root.PortAx[k] = api[k]; }); }
})(typeof self !== 'undefined' ? self : this, function (W) {
  function whereOf(text, idx) {
    var before = text.slice(0, idx), m, last = null, re = /(?:^|\n)\s*([①-⑳])/g;
    while ((m = re.exec(before)) !== null) last = m[1];
    return last ? last + '항' : '';
  }

  // verdict.details 의 token(판정 숫자)과 others(근거의 다른 숫자)를 원문 위치에 매긴다.
  function highlightBasis(text, verdict) {
    if (!text) return [];
    var want = {}, ambiguous = verdict && verdict.details ? verdict.details : [];
    var claimTokens = {}, otherTokens = {};
    ambiguous.forEach(function (d) {
      if (d.reason === W.REASON.NUMBER_AMBIGUOUS) { claimTokens[d.token] = 1; d.others.forEach(function (o) { otherTokens[o] = 1; }); }
    });
    (verdict && verdict.matched || []).forEach(function (t) { claimTokens[t] = 1; });
    var qs = W.locateQuantities(text), segs = [], pos = 0;
    qs.forEach(function (q) {
      var kind = claimTokens[q.raw] ? 'match' : (otherTokens[q.raw] ? 'other' : null);
      if (!kind) return;
      if (q.index > pos) segs.push({ text: text.slice(pos, q.index), kind: 'plain' });
      segs.push({ text: text.slice(q.index, q.index + q.length), kind: kind, where: whereOf(text, q.index) });
      pos = q.index + q.length;
    });
    if (pos < text.length) segs.push({ text: text.slice(pos), kind: 'plain' });
    return segs;
  }
  return { highlightBasis: highlightBasis };
});
