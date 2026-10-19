/* 도메인: 조문 참조(제16조제1항제2호) 분해와 근거(Basis) 해석. 순수 함수. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.PortAx = root.PortAx || {}; Object.keys(api).forEach(function (k) { root.PortAx[k] = api[k]; }); }
})(typeof self !== 'undefined' ? self : this, function () {
  var REF = /^\s*(제\d+조(?:의\d+)?)(?:\s*제(\d+)항)?(?:\s*제(\d+)호)?(?:\s*(?:단서|본문))?\s*$/;

  function parseRef(str) {
    if (str == null) return null;
    var m = REF.exec(String(str));
    if (!m) return null;
    return { article: m[1], para: m[2] ? parseInt(m[2], 10) : null, item: m[3] ? parseInt(m[3], 10) : null };
  }

  function articleText(a) {
    if (!a.paras.length) return a.head;
    return a.head.split(/\s*[①-⑳]/)[0] + '\n' + a.paras.map(function (p) {
      return [p.text].concat(p.items.map(function (i) { return '  ' + i.text; })).join('\n');
    }).join('\n');
  }

  function resolveBasis(law, refStr) {
    var r = parseRef(refStr);
    if (!r || !law || !law.articles) return null;
    var a = law.articles[r.article];
    if (!a) return null;
    var full = articleText(a);
    if (r.para == null) return { label: r.article, unit: 'article', text: full, article: r.article, articleText: full, title: a.title };
    var p = a.paras[r.para - 1];
    if (!p) return null;
    var plabel = r.article + '제' + r.para + '항';
    var ptext = [p.text].concat(p.items.map(function (i) { return i.text; })).join('\n');
    if (r.item == null) return { label: plabel, unit: 'para', text: ptext, article: r.article, articleText: full, title: a.title };
    var it = p.items[r.item - 1];
    if (!it) return null;
    return { label: plabel + '제' + r.item + '호', unit: 'item', text: it.text, article: r.article, articleText: full, title: a.title, parentLead: p.text };
  }

  return { parseRef: parseRef, resolveBasis: resolveBasis };
});
