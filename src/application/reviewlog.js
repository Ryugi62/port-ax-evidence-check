/* 응용: 확인 기록(ReviewLog) 생성과 CSV. */
(function (root, factory) {
  var api = factory(typeof require !== 'undefined' ? require('../domain/review.js') : root.PortAx);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.PortAx = root.PortAx || {}; Object.keys(api).forEach(function (k) { root.PortAx[k] = api[k]; }); }
})(typeof self !== 'undefined' ? self : this, function (R) {
  function buildReviewLog(ids, reviews) {
    var rows = ids.map(function (id) {
      var r = reviews && reviews[id];
      return { id: id, status: r ? r.status : R.STATUS.PENDING, at: r && r.at ? r.at : '', note: r && r.note ? r.note : '' };
    });
    return { rows: rows, summary: R.summarizeReviews(ids, reviews) };
  }
  function reviewLogToCsv(log) {
    var q = function (v) { return /[",\n]/.test(v) ? '"' + String(v).replace(/"/g, '""') + '"' : v; };
    var lines = ['판정,상태,확인 시각,메모'].concat(log.rows.map(function (r) { return [r.id, r.status, r.at, q(r.note)].join(','); }));
    var s = log.summary;
    lines.push('# 합계 확인함 ' + s.confirmed + ' · 반려 ' + s.rejected + ' · 미확인 ' + s.pending + ' = ' + s.total);
    return lines.join('\n') + '\n';
  }
  return { buildReviewLog: buildReviewLog, reviewLogToCsv: reviewLogToCsv };
});
