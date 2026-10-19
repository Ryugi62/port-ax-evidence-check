/* 응용: 데이터 객체 정규화 (읽기는 어댑터가 한다). */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.PortAx = root.PortAx || {}; Object.keys(api).forEach(function (k) { root.PortAx[k] = api[k]; }); }
})(typeof self !== 'undefined' ? self : this, function () {
  function loadData(raw) {
    if (!raw || !raw.laws || !raw.cases) throw new Error('데이터 형식 오류');
    return raw;
  }
  return { loadData: loadData };
});
