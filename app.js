/* 어댑터: DOM 화면. 계산은 src/ 의 순수 함수만 부른다. 네트워크 요청 없음. */
(function () {
  'use strict';
  var P = window.PortAx;
  var data = P.loadData(window.PORTAX_DATA);
  var items = P.buildItems(data);
  var STATUS = P.STATUS;
  var state = { tab: 'review', set: 'B', selected: null, opened: {}, reviews: {}, notes: {} };

  var REASON_LABEL = { NO_BASIS: '근거 없음', NUMBER_MISSING: '숫자 불일치', NUMBER_AMBIGUOUS: '숫자 확인 필요' };
  var SET_LABEL = { all: '전체', B: '위험물 규칙 (16)', A: '입출항법 (12)' };

  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'class') e.className = attrs[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] === true) e.setAttribute(k, '');
      else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c != null) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function $(id) { return document.getElementById(id); }
  function clear(e) { while (e.firstChild) e.removeChild(e.firstChild); }
  function lawName(id) { var l = data.laws[id]; return l.name + ' (시행일 ' + l.effective + ')'; }

  function reasonLines(v) {
    var out = [];
    if (v.reasons.indexOf('NO_BASIS') >= 0) out.push('근거 조문이 연결되지 않았거나 조문 번호를 찾지 못했습니다. 근거 없는 판정은 그대로 믿을 수 없습니다.');
    v.details.forEach(function (d) {
      if (d.reason === 'NUMBER_MISSING') out.push('판정 문장의 「' + d.token + '」이(가) 근거 원문에 없습니다.');
      if (d.reason === 'NUMBER_AMBIGUOUS') out.push('판정 문장의 「' + d.token + '」은 근거에 있지만, 같은 종류의 다른 숫자 「' + d.others.join('」「') + '」도 함께 있습니다. 어느 쪽 기준인지 원문에서 확인하세요.');
    });
    return out;
  }
  function badgesFor(v) { return v.reasons.map(function (r) { return h('span', { class: 'badge red', text: REASON_LABEL[r] }); }); }

  function basisNode(basis, verdict) {
    if (!basis) return h('div', { class: 'law', text: '근거 조문이 연결되지 않아 표시할 원문이 없습니다.' });
    var law = h('div', { class: 'law' });
    P.highlightBasis(basis.text, verdict).forEach(function (s) {
      if (s.kind === 'plain') law.appendChild(document.createTextNode(s.text));
      else {
        law.appendChild(h('mark', { class: s.kind === 'match' ? 'm' : 'o', text: s.text }));
        if (s.where) law.appendChild(h('span', { class: 'where', text: '(' + s.where + ')' }));
      }
    });
    if (!law.firstChild) law.textContent = basis.text;
    return law;
  }

  function stampReview(id, status) {
    state.reviews[id] = { status: status, at: new Date().toISOString(), note: state.notes[id] || '' };
    renderAll();
  }
  function reviewButtons(it) {
    var cur = state.reviews[it.id];
    var can = P.canConfirm({ weak: it.weak }, { opened: !!state.opened[it.id] });
    var b1 = h('button', { class: 'btn', text: '확인함', disabled: !can, title: can ? '' : '근거 원문을 열면 눌러집니다', onclick: function (e) { e.stopPropagation(); stampReview(it.id, STATUS.CONFIRMED); } });
    var b2 = h('button', { class: 'btn danger', text: '반려', onclick: function (e) { e.stopPropagation(); stampReview(it.id, STATUS.REJECTED); } });
    var wrap = h('div', { class: 'actions' }, [b1, b2]);
    if (!can) wrap.appendChild(h('span', { class: 'note', text: '근거 원문을 열면 「확인함」이 눌러집니다.' }));
    if (cur) wrap.appendChild(h('span', { class: 'badge ' + (cur.status === STATUS.CONFIRMED ? 'ok' : 'red'), text: cur.status }));
    return wrap;
  }

  function visibleItems() {
    var base = P.sortWeakFirst(items);
    return state.set === 'all' ? base : base.filter(function (i) { return i.set === state.set; });
  }

  function renderStats() {
    var vis = visibleItems(), ids = vis.map(function (i) { return i.id; });
    var s = P.summarizeReviews(ids, state.reviews);
    $('s-weak').textContent = vis.filter(function (i) { return i.weak; }).length;
    $('s-total').textContent = vis.length;
    $('s-done').textContent = s.confirmed + s.rejected;
  }

  function renderChips() {
    var c = $('chips'); clear(c);
    ['B', 'A', 'all'].forEach(function (k) {
      c.appendChild(h('button', { class: 'chip', 'aria-pressed': state.set === k ? 'true' : 'false', text: SET_LABEL[k], onclick: function () { state.set = k; state.selected = null; renderAll(); } }));
    });
  }

  function renderList() {
    var l = $('list'); clear(l);
    visibleItems().forEach(function (it) {
      var st = state.reviews[it.id];
      var top = h('div', { class: 'top' }, [h('span', { class: 'badge gray', text: it.id })].concat(it.weak ? badgesFor(it.verdict) : [h('span', { class: 'badge ok', text: '숫자 이상 없음 · 의미 미검사' })]));
      if (st) top.appendChild(h('span', { class: 'badge blue', text: st.status }));
      var row = h('div', { class: 'row' + (it.weak ? ' weak' : ''), role: 'button', tabindex: '0', 'aria-current': state.selected === it.id ? 'true' : 'false',
        onclick: function () { select(it.id); }, onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(it.id); } } }, [
        top,
        h('p', { class: 'claim', text: '「' + it.claim + '」' }),
        h('div', { class: 'basis', text: '근거 ' + (it.basis ? it.basis.label : '연결 없음') + ' · ' + data.laws[it.law].name }),
        reviewButtons(it)
      ]);
      l.appendChild(row);
    });
  }

  function select(id) { state.selected = id; state.opened[id] = true; renderAll(); var d = $('detail'); d.classList.add('open'); }

  function renderDetail() {
    var d = $('detail'); clear(d);
    var it = items.filter(function (i) { return i.id === state.selected; })[0];
    if (!it) {
      d.classList.remove('open');
      d.appendChild(h('p', { class: 'note', text: '왼쪽 목록에서 판정을 누르면 근거 조문 원문이 이 자리에 펼쳐집니다. 빨간 판정부터 보세요.' }));
      return;
    }
    d.appendChild(h('button', { class: 'btn ghost close', text: '← 목록으로', onclick: function () { state.selected = null; renderAll(); } }));
    d.appendChild(h('h2', { text: it.id + ' · ' + it.item }));
    d.appendChild(h('p', { class: 'kv', text: '서류 기재: ' + it.record }));
    d.appendChild(h('div', { class: 'verdict', text: 'AI 판정(예시): ' + it.claim }));
    if (it.weak) {
      d.appendChild(h('div', { class: 'warn' }, [h('b', { text: '확인이 필요한 판정입니다' }), h('ul', {}, reasonLines(it.verdict).map(function (t) { return h('li', { text: t }); }))]));
    } else {
      d.appendChild(h('div', { class: 'okbox', text: '판정 속 숫자·기한이 근거 원문과 대조됐습니다. 의미(부정어 등)는 이 규칙이 보지 않으니 원문을 읽어 확인하세요.' }));
    }
    if (it.basis) {
      d.appendChild(h('p', { class: 'lawhead', text: '근거 ' + it.basis.label + ' · ' + lawName(it.law) }));
      d.appendChild(basisNode(it.basis, it.verdict));
      if (it.basis.unit !== 'article') {
        d.appendChild(h('details', {}, [h('summary', { text: it.basis.article + ' 전문 보기' }), h('div', { class: 'law', text: it.basis.articleText })]));
      }
    } else {
      d.appendChild(basisNode(null, it.verdict));
    }
    var memo = h('input', { type: 'text', id: 'memo', placeholder: '반려 사유 (선택)', value: state.notes[it.id] || '', 'aria-label': '반려 사유' });
    memo.addEventListener('input', function () { state.notes[it.id] = memo.value; });
    d.appendChild(h('label', { for: 'memo', text: '메모' }));
    d.appendChild(memo);
    d.appendChild(reviewButtons(it));
    if (window.matchMedia && window.matchMedia('(max-width:900px)').matches) d.classList.add('open');
  }

  function tabSwitch(t) {
    state.tab = t;
    ['review', 'check', 'dg', 'eval', 'log'].forEach(function (k) { $('p-' + k).classList.toggle('hide', k !== t); });
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) { b.setAttribute('aria-selected', b.getAttribute('data-tab') === t ? 'true' : 'false'); });
    renderAll();
  }

  // 화면 C
  function runCheck() {
    var lawId = $('c-law').value, ref = $('c-ref').value.trim(), claim = $('c-claim').value;
    var out = $('c-out'); clear(out);
    if (!claim.trim()) { out.appendChild(h('p', { class: 'note', text: '판정 문장을 입력하세요.' })); return; }
    var r = P.judgeAgainst(data, lawId, ref, claim);
    if (r.verdict.weak) out.appendChild(h('div', { class: 'warn' }, [h('b', { text: '빨간 표시: ' + r.verdict.reasons.map(function (x) { return REASON_LABEL[x]; }).join(' · ') }), h('ul', {}, reasonLines(r.verdict).map(function (t) { return h('li', { text: t }); }))]));
    else out.appendChild(h('div', { class: 'okbox', text: '숫자 이상 없음: 판정 속 숫자·기한이 근거 원문에서 확인됩니다. 의미(부정어·의미 반전)는 검사하지 않았으니 원문을 읽어 확인하세요.' }));
    if (r.basis) { out.appendChild(h('p', { class: 'lawhead', text: '근거 ' + r.basis.label + ' · ' + lawName(lawId) })); out.appendChild(basisNode(r.basis, r.verdict)); }
    else if (ref) out.appendChild(h('p', { class: 'note', text: '「' + ref + '」을(를) 이 법령에서 찾지 못했습니다.' }));
  }
  function fillExample(law, ref, claim) { $('c-law').value = law; $('c-ref').value = ref; $('c-claim').value = claim; runCheck(); }


  // 화면 C-2: 위험물 목록 항목 대조 (UN번호·Class·용기등급·인화점)
  var DG_LABEL = { CLASS_MISMATCH: 'Class 불일치', FLASH_CATEGORY_MISMATCH: '인화점 구분 불일치', PG_MISMATCH: '용기등급 불일치' };
  var DG_NOTE = { UN_NOT_IN_EXCERPT: '이 UN번호는 이 화면의 목록 발췌(6개)에 없어 대조하지 못했습니다.', PG_I_NEEDS_BOILING: '용기등급 I은 초기 끓는점(35℃ 이하)이 있어야 판단할 수 있어 대조하지 않았습니다.', FLASH_OUT_OF_RANGE: '인화점 60℃ 초과는 인화성 액체류 구간 밖이라 인화점 구분·용기등급을 대조하지 않았습니다.' };
  function dgLines(r) {
    return r.details.map(function (d) {
      if (d.field === 'cls') return '서류 Class ' + d.claimed + ' ↔ 목록 Class ' + d.listed.join('·');
      if (d.field === 'flashCat') return '서류 인화점 구분 ' + d.claimed + ' ↔ 인화점 ' + d.flash + '℃는 ' + d.derived + ' (규칙 제2조 가목)';
      return '서류 용기등급 ' + d.claimed + ' ↔ 인화점 ' + d.flash + '℃는 용기등급 ' + d.derived + ' (초기 끓는점 35℃ 초과 가정)';
    });
  }
  function runDg() {
    var out = $('d-out'); clear(out);
    var un = $('d-un').value, cls = $('d-cls').value, fl = $('d-flash').value.trim(), cat = $('d-cat').value, pg = $('d-pg').value;
    if (!P.normalizeUn(un)) { out.appendChild(h('p', { class: 'note', text: 'UN번호 4자리(예: UN1263)를 입력하세요.' })); return; }
    var item = { un: un, cls: cls || null, flash: fl === '' || isNaN(Number(fl)) ? undefined : Number(fl), flashCat: cat || undefined, pg: pg || undefined };
    var r = P.checkDgItem(item);
    if (r.entry) out.appendChild(h('p', { class: 'lawhead', text: '목록 발췌: ' + P.normalizeUn(un) + ' · ' + r.entry.name + ' · Class ' + r.entry.classes.join('·') }));
    if (r.weak) out.appendChild(h('div', { class: 'warn' }, [h('b', { text: '빨간 표시: ' + r.reasons.map(function (x) { return DG_LABEL[x]; }).join(' · ') }), h('ul', {}, dgLines(r).map(function (t) { return h('li', { text: t }); }))]));
    else if (r.entry) out.appendChild(h('div', { class: 'okbox', text: '입력한 항목 사이에서 어긋남이 없습니다. (입력하지 않은 항목은 보지 않았습니다)' }));
    r.notes.forEach(function (n) { out.appendChild(h('p', { class: 'note', text: DG_NOTE[n] })); });
    out.appendChild(h('p', { class: 'hint', text: P.SOURCE_NOTE }));
  }
  function fillDg(un, cls, fl, cat, pg) { $('d-un').value = un; $('d-cls').value = cls; $('d-flash').value = fl; $('d-cat').value = cat; $('d-pg').value = pg; runDg(); }

  // 재현 시험 (시험용 표지는 이 탭에서만 집계로 쓴다)
  function renderEval() {
    var ev = P.evaluatePlanted(items), o = $('eval-out'); clear(o);
    function row(a, b, c) { return h('tr', {}, [h('td', { text: a }), h('td', { class: 'num', text: b }), h('td', { class: 'note', text: c })]); }
    o.appendChild(h('h2', { style: 'margin:0 0 4px;font-size:20px', text: '규칙이 심은 오판을 얼마나 잡았나' }));
    o.appendChild(h('p', { class: 'note', text: '이 합성 28건 한정 수치입니다. 목록 화면에는 어떤 건이 시험용인지 표시하지 않았습니다. 잡은 수만 공개하며 부풀리지 않습니다.' }));
    var t = h('table', {}, [h('thead', {}, [h('tr', {}, [h('th', { text: '구분' }), h('th', { text: '빨간 표시 / 전체' }), h('th', { text: '설명' })])]), h('tbody', {}, [
      row('숫자·기한형 심은 오판', ev.number.flagged + ' / ' + ev.number.total, '규칙 (나)(다)의 범위. 합격선 3/4 이상'),
      row('의미형 심은 오판', ev.semantic.flagged + ' / ' + ev.semantic.total, '숫자 없이 뜻을 뒤집은 판정. 이 규칙의 비목표라 못 잡는 것이 정상'),
      row('심은 오판 전체', ev.all.flagged + ' / ' + ev.all.total, '위험물 규칙 세트 ' + ev.setB.flagged + '/' + ev.setB.total + ' · 입출항법 세트 ' + ev.setA.flagged + '/' + ev.setA.total),
      row('정상 판정의 오탐', ev.normal.falseFlags + ' / ' + ev.normal.total, '합격선 2건 이하' + (ev.normal.ids.length ? ' · 오탐: ' + ev.normal.ids.join(', ') : ''))
    ])]);
    o.appendChild(t);
    o.appendChild(h('h3', { style: 'margin:20px 0 6px;font-size:16px', text: '못 잡은 건 (숨기지 않습니다)' }));
    var ul = h('ul', { class: 'note' });
    items.filter(function (i) { return i.planted && !i.weak; }).forEach(function (i) { ul.appendChild(h('li', { text: i.id + ' · 「' + i.claim + '」 — 숫자·기한이 없는 의미 반전' })); });
    o.appendChild(ul);
    o.appendChild(h('p', { class: 'note', text: '한계: 부정어·의미 반전은 판정하지 않습니다. 선령 같은 나이 숫자와 기한이 한 호에 같이 있으면 정상 판정도 빨갛게 될 수 있습니다(위 오탐).' }));
  }

  function renderLog() {
    var o = $('log-out'); clear(o);
    var scope = visibleItems().map(function (i) { return i.id; });
    var log = P.buildReviewLog(scope, state.reviews), s = log.summary;
    o.appendChild(h('h2', { style: 'margin:0 0 4px;font-size:20px', text: '확인 요약 — ' + SET_LABEL[state.set] }));
    o.appendChild(h('p', { class: 'note', text: '목록 화면에서 고른 세트 기준입니다. 세트를 바꾸려면 「판정 검수」 위의 칩을 누르세요.' }));
    o.appendChild(h('div', { class: 'stats' }, [
      h('div', { class: 'stat' }, [h('div', { class: 'n', text: s.confirmed }), h('div', { class: 'l', text: '확인함' })]),
      h('div', { class: 'stat red' }, [h('div', { class: 'n', text: s.rejected }), h('div', { class: 'l', text: '반려' })]),
      h('div', { class: 'stat' }, [h('div', { class: 'n', text: s.pending }), h('div', { class: 'l', text: '미확인' })])
    ]));
    o.appendChild(h('p', { class: 'note', text: '합계 ' + s.total + '건 = 확인함 ' + s.confirmed + ' + 반려 ' + s.rejected + ' + 미확인 ' + s.pending + '. 내려받는 파일에는 건마다 확인 시각이 찍힙니다. 이 페이지를 닫으면 기록은 사라집니다(서버·브라우저 저장 없음).' }));
    o.appendChild(h('button', { class: 'btn', id: 'dl', text: '확인 기록 내려받기 (CSV)', onclick: function () {
      var csv = '﻿' + P.reviewLogToCsv(P.buildReviewLog(scope, state.reviews));
      var a = h('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })), download: 'review-log.csv' });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    } }));
  }

  function renderAll() {
    renderStats(); renderChips(); renderList(); renderDetail();
    if (state.tab === 'eval') renderEval();
    if (state.tab === 'log') renderLog();
  }

  function init() {
    if (/[?&]measure=1(&|$)/.test(location.search)) {
      $('main').classList.add('hide');
      var v0 = Object.keys(data.laws).map(function (k) { return data.laws[k].name + ' 시행일 ' + data.laws[k].effective; });
      $('band-ver').textContent = '법령 판본: ' + v0.join(' / ') + ' (현행 여부 미확인).';
      window.PortAxMeasure.start(data, items, location.search);
      return;
    }
    var v = Object.keys(data.laws).map(function (k) { return data.laws[k].name + ' 시행일 ' + data.laws[k].effective; });
    $('band-ver').textContent = '법령 판본: ' + v.join(' / ') + ' (현행 여부 미확인).';
    ['portact', 'hazmat'].forEach(function (k) { $('c-law').appendChild(h('option', { value: k, text: data.laws[k].name })); });
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) { b.addEventListener('click', function () { tabSwitch(b.getAttribute('data-tab')); }); });
    ['d-un', 'd-flash'].forEach(function (id) { $(id).addEventListener('input', runDg); });
    ['d-cls', 'd-cat', 'd-pg'].forEach(function (id) { $(id).addEventListener('change', runDg); });
    $('d-run').addEventListener('click', runDg);
    $('d-ex1').addEventListener('click', function () { fillDg('UN1263', '3', '10', '중인화점', 'II'); });
    $('d-ex2').addEventListener('click', function () { fillDg('UN1263', '8', '10', '중인화점', 'II'); });
    $('d-ex3').addEventListener('click', function () { fillDg('UN1263', '3', '10', '고인화점', 'III'); });
    $('c-run').addEventListener('click', runCheck);
    ['c-ref', 'c-claim'].forEach(function (id) { $(id).addEventListener('input', runCheck); });
    $('c-law').addEventListener('change', runCheck);
    $('c-ex1').addEventListener('click', function () { fillExample('portact', '제16조', '신청인은 1개월 이내에 신고한다.'); });
    $('c-ex2').addEventListener('click', function () { fillExample('hazmat', '', '적합. 수하인 주소가 없어도 접수한다.'); });
    $('c-ex3').addEventListener('click', function () { fillExample('hazmat', '제35조제3항', '24시간이 지났고 부표찰도 있어 선적 가능하다.'); });
    document.documentElement.style.setProperty('--bandh', $('band').offsetHeight + 'px');
    window.addEventListener('resize', function () { document.documentElement.style.setProperty('--bandh', $('band').offsetHeight + 'px'); });
    renderAll();
  }
  init();
})();
