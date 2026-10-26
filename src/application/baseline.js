/* 응용: 목록 순서 비교(근거만 표시한 화면 기준선 vs 빨간 표시 우선). 정렬 알고리즘 비교라 사람 측정이 아니다. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.PortAx = root.PortAx || {}; Object.keys(api).forEach(function (k) { root.PortAx[k] = api[k]; }); }
})(typeof self !== 'undefined' ? self : this, function () {
  // order: 위에서부터 읽는 순서의 목록. 심은 오판(planted)이 놓인 자리를 센다.
  function orderMetrics(order, ks) {
    var positions = [], numberPositions = [];
    order.forEach(function (it, i) {
      if (it.planted) { positions.push(i + 1); if (it.plantedType === 'number') numberPositions.push(i + 1); }
    });
    var sum = positions.reduce(function (a, b) { return a + b; }, 0);
    var firstK = {};
    (ks || []).forEach(function (k) { firstK[k] = positions.filter(function (p) { return p <= k; }).length; });
    return {
      positions: positions, numberPositions: numberPositions,
      meanRank: positions.length ? Math.round(sum / positions.length * 100) / 100 : null,
      lastRank: positions.length ? positions[positions.length - 1] : null,
      firstK: firstK
    };
  }
  // N건 중 m건이 무작위로 놓일 때의 정확한 기댓값(균등 순열).
  function randomExpectation(N, m, ks) {
    var firstK = {};
    (ks || []).forEach(function (k) { firstK[k] = m * k / N; });
    return { firstK: firstK, meanRank: (N + 1) / 2, lastRank: m * (N + 1) / (m + 1) };
  }
  // 이론 상한: 신뢰도가 심은 오판을 전부 맨 위로 올리는 가정(실제 신뢰도 점수는 이 자료에 없다).
  function oracleOrder(items) {
    return items.filter(function (i) { return i.planted; }).concat(items.filter(function (i) { return !i.planted; }));
  }
  function compare(items, sortRed, ks) {
    var N = items.length, m = items.filter(function (i) { return i.planted; }).length;
    var nNum = items.filter(function (i) { return i.plantedType === 'number'; }).length;
    return {
      N: N, planted: m, numberPlanted: nNum, ks: ks,
      original: orderMetrics(items, ks),
      redFirst: orderMetrics(sortRed(items), ks),
      random: randomExpectation(N, m, ks),
      randomNumber: randomExpectation(N, nNum, ks),
      oracle: orderMetrics(oracleOrder(items), ks)
    };
  }
  return { orderMetrics: orderMetrics, randomExpectation: randomExpectation, oracleOrder: oracleOrder, compare: compare };
});
