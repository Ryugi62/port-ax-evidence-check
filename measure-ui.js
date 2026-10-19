/* 어댑터: 사람 확인자 측정 모드 화면(?measure=1). 계산은 src/domain/measure.js 의 순수 함수만 부른다. 서버 전송·저장 0. */
(function () {
  'use strict';
  var P = window.PortAx;
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
  function clear(e) { while (e.firstChild) e.removeChild(e.firstChild); }
  function sec(ms) { return ms == null ? '-' : (ms / 1000).toFixed(1) + '초'; }

  function start(data, items, search) {
    var seedParam = /[?&]seed=(\d+)/.exec(search);
    var seed = seedParam ? parseInt(seedParam[1], 10) : Math.floor(Math.random() * 900000) + 100000;
    var plan = P.planSession(data.cases, seed);
    var byId = {}; items.forEach(function (i) { byId[i.id] = i; });
    var records = [], idx = 0, shownAt = 0;
    var root = $('measure'); root.classList.remove('hide');
    function $(id) { return document.getElementById(id); }

    function intro() {
      clear(root);
      root.appendChild(h('h1', { text: '판정 확인 시간 측정 (약 10분)' }));
      root.appendChild(h('div', { class: 'card' }, [
        h('p', { text: '서류 사례 12건이 한 건씩 나옵니다. AI 판정이 맞으면 「확인함」, 틀렸으면 「반려」를 누르세요. 사례가 나온 순간부터 버튼을 누를 때까지의 시간이 자동으로 재집니다.' }),
        h('p', { class: 'note', text: '일부 사례에는 근거 조문이 안 보이고, 대신 조문 검색칸이 있습니다. 일부 판정은 일부러 틀리게 만든 것입니다. 이름·연락처는 묻지 않으며, 입력과 결과는 서버로 가지 않고 이 창을 닫으면 사라집니다.' }),
        h('p', { class: 'note', text: '시드 ' + seed + ' (같은 시드는 같은 12건·같은 순서입니다.)' }),
        h('button', { class: 'btn', id: 'm-start', text: '시작하기', onclick: next })
      ]));
    }

    function law(it) { return data.laws[it.law]; }

    function caseView() {
      clear(root);
      var p = plan[idx], it = byId[p.id];
      root.appendChild(h('p', { class: 'note', id: 'm-progress', text: (idx + 1) + ' / ' + plan.length }));
      var card = h('div', { class: 'card' }, [
        h('h2', { style: 'margin:0 0 4px;font-size:20px', text: it.item }),
        h('p', { class: 'kv', text: '서류 기재: ' + it.record }),
        h('div', { class: 'verdict', text: 'AI 판정: ' + it.claim })
      ]);
      if (p.cond === 'B') {
        card.appendChild(h('p', { class: 'lawhead', text: it.basis ? '근거 ' + it.basis.label + ' · ' + law(it).name : '근거 조문이 연결되지 않았습니다.' }));
        if (it.basis) {
          card.appendChild(h('div', { class: 'law', id: 'm-basis', text: it.basis.text }));
          if (it.basis.unit !== 'article') card.appendChild(h('details', {}, [h('summary', { text: it.basis.article + ' 전문 보기' }), h('div', { class: 'law', text: it.basis.articleText })]));
        }
      } else {
        card.appendChild(h('p', { class: 'lawhead', text: '근거 조문은 보이지 않습니다. 필요하면 조문을 검색하세요.' }));
        var q = h('input', { type: 'text', id: 'm-q', placeholder: '조문 검색어 (예: 명세서)', 'aria-label': '조문 검색어', autocomplete: 'off' });
        var out = h('div', { id: 'm-hits' });
        q.addEventListener('input', function () {
          clear(out);
          var hits = P.searchArticles(law(it), q.value);
          if (q.value.trim() && !hits.length) out.appendChild(h('p', { class: 'note', text: '검색 결과가 없습니다.' }));
          hits.forEach(function (x) { out.appendChild(h('p', { class: 'lawhead', text: x.article + ' (' + x.title + ')' })); out.appendChild(h('div', { class: 'law', text: x.text })); });
        });
        card.appendChild(q); card.appendChild(out);
      }
      card.appendChild(h('div', { class: 'actions' }, [
        h('button', { class: 'btn', id: 'm-ok', text: '확인함', onclick: function () { answer(P.CONFIRMED); } }),
        h('button', { class: 'btn danger', id: 'm-no', text: '반려', onclick: function () { answer(P.REJECTED); } })
      ]));
      root.appendChild(card);
      shownAt = performance.now();
    }

    function answer(choice) {
      var ms = performance.now() - shownAt, p = plan[idx];
      records.push({ id: p.id, cond: p.cond, ms: Math.round(ms), choice: choice });
      idx++; next();
    }
    function next() { if (idx < plan.length) caseView(); else result(); }

    function result() {
      clear(root);
      var s = P.summarize(records, data.cases), code = P.encodeCode(seed, records);
      function row(label, a, b) { return h('tr', {}, [h('td', { text: label }), h('td', { class: 'num', text: a }), h('td', { class: 'num', text: b })]); }
      root.appendChild(h('h1', { text: '측정이 끝났습니다' }));
      root.appendChild(h('div', { class: 'card', id: 'm-result' }, [
        h('table', {}, [
          h('thead', {}, [h('tr', {}, [h('th', { text: '' }), h('th', { text: 'A 근거 숨김' }), h('th', { text: 'B 근거 표시' })])]),
          h('tbody', {}, [
            row('사례 수', String(s.A.n), String(s.B.n)),
            row('확인 시간 중앙값', sec(s.A.medianMs), sec(s.B.medianMs)),
            row('정오 맞음', s.A.correct + ' / ' + s.A.n, s.B.correct + ' / ' + s.B.n),
            row('심은 오판 발견', s.A.found + ' / ' + s.A.planted, s.B.found + ' / ' + s.B.planted)
          ])
        ]),
        h('p', { class: 'note', text: '한계: 1명·12건이라 방향 신호일 뿐 확정치가 아니고, 심은 오판이 4건뿐이라 근거를 믿고 놓치는 경향은 잘 못 봅니다.' })
      ]));
      var ta = h('textarea', { id: 'm-code', readonly: true, rows: '4', 'aria-label': '복사용 측정 코드' });
      ta.value = code;
      root.appendChild(h('div', { class: 'card' }, [
        h('h2', { style: 'margin:0 0 4px;font-size:20px', text: '이 코드를 복사해 채팅에 붙여 넣어 주세요' }),
        ta,
        h('div', { class: 'actions' }, [h('button', { class: 'btn', id: 'm-copy', text: '코드 복사', onclick: function () {
          ta.select();
          try { if (navigator.clipboard) navigator.clipboard.writeText(code); else document.execCommand('copy'); } catch (e) { /* 직접 선택해 복사 */ }
          this.textContent = '복사했습니다';
        } })]),
        h('p', { class: 'note', text: '코드에는 시드·사례 번호·조건·시간·선택만 들어 있고 이름은 없습니다. 이 창을 닫으면 기록은 사라집니다.' })
      ]));
    }
    intro();
  }
  window.PortAxMeasure = { start: start };
})();
