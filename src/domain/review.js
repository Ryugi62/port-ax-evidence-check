/* 도메인: 확인(Review) 상태와 집계. 순수 함수. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.PortAx = root.PortAx || {}; Object.keys(api).forEach(function (k) { root.PortAx[k] = api[k]; }); }
})(typeof self !== 'undefined' ? self : this, function () {
  var STATUS = { CONFIRMED: '확인함', REJECTED: '반려', PENDING: '미확인' };

  function summarizeReviews(ids, reviews) {
    var s = { confirmed: 0, rejected: 0, pending: 0, total: ids.length };
    ids.forEach(function (id) {
      var r = reviews && reviews[id];
      if (r && r.status === STATUS.CONFIRMED) s.confirmed++;
      else if (r && r.status === STATUS.REJECTED) s.rejected++;
      else s.pending++;
    });
    return s;
  }

  // 약한 판정은 근거를 열기 전에는 「확인함」을 누를 수 없다.
  function canConfirm(item, state) {
    if (!item.weak) return true;
    return !!(state && state.opened);
  }

  return { STATUS: STATUS, summarizeReviews: summarizeReviews, canConfirm: canConfirm };
});
