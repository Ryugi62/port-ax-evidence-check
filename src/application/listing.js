/* 응용: 판정 목록 만들기·정렬·재현 시험 집계. */
(function (root, factory) {
  var api = factory(typeof require !== 'undefined' ? { weak: require('../domain/weak.js'), refs: require('../domain/refs.js') } : { weak: root.PortAx, refs: root.PortAx });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.PortAx = root.PortAx || {}; Object.keys(api).forEach(function (k) { root.PortAx[k] = api[k]; }); }
})(typeof self !== 'undefined' ? self : this, function (D) {
  function judgeAgainst(data, lawId, ref, claim) {
    var basis = D.refs.resolveBasis(data.laws[lawId], ref);
    var verdict = D.weak.judgeVerdict(claim, basis ? basis.text : null);
    return { basis: basis, verdict: verdict };
  }

  function buildItems(data) {
    return data.cases.map(function (c) {
      var j = judgeAgainst(data, c.law, c.ref, c.claim);
      return Object.assign({}, c, { basis: j.basis, verdict: j.verdict, weak: j.verdict.weak });
    });
  }

  function sortWeakFirst(items) {
    return items.map(function (it, i) { return { it: it, i: i }; })
      .sort(function (a, b) { return (b.it.verdict.weak - a.it.verdict.weak) || (a.i - b.i); })
      .map(function (x) { return x.it; });
  }

  function evaluatePlanted(items) {
    var cnt = function (arr) { return { total: arr.length, flagged: arr.filter(function (i) { return i.verdict.weak; }).length }; };
    var planted = items.filter(function (i) { return i.planted; });
    var normal = items.filter(function (i) { return !i.planted; });
    var nf = normal.filter(function (i) { return i.verdict.weak; });
    return {
      all: cnt(planted),
      number: cnt(planted.filter(function (i) { return i.plantedType === 'number'; })),
      semantic: cnt(planted.filter(function (i) { return i.plantedType === 'semantic'; })),
      setA: cnt(planted.filter(function (i) { return i.set === 'A'; })),
      setB: cnt(planted.filter(function (i) { return i.set === 'B'; })),
      normal: { total: normal.length, falseFlags: nf.length, ids: nf.map(function (i) { return i.id; }) },
      missed: planted.filter(function (i) { return !i.verdict.weak; }).map(function (i) { return i.id + ':' + i.plantedType; })
    };
  }

  return { judgeAgainst: judgeAgainst, buildItems: buildItems, sortWeakFirst: sortWeakFirst, evaluatePlanted: evaluatePlanted };
});
