/* 도메인: 위험물 목록 항목 대조 — UN번호·Class·용기등급·인화점. 순수 함수(DOM·네트워크 모름).
 * 목록 발췌의 UN번호→Class는 미국 49 CFR 172.101 Hazardous Materials Table(eCFR, 2026-10-01 판 조회)에서 옮겼고,
 * 용기등급 기준은 49 CFR 173.121(a)(1), 인화점 구분은 「위험물 선박운송 및 저장규칙」 제2조 가목 구간(국가법령정보센터)이다.
 * IMDG Code 본문(유료)은 읽지 못했다 — UN 모델 규정을 따르는 목록이라 UN번호→Class가 같다고 보지만 IMDG 본문 일치는 미확인이다. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { root.PortAx = root.PortAx || {}; Object.keys(api).forEach(function (k) { root.PortAx[k] = api[k]; }); }
})(typeof self !== 'undefined' ? self : this, function () {
  var REASON = { CLASS_MISMATCH: 'CLASS_MISMATCH', FLASH_CATEGORY_MISMATCH: 'FLASH_CATEGORY_MISMATCH', PG_MISMATCH: 'PG_MISMATCH' };
  var NOTE = { UN_NOT_IN_EXCERPT: 'UN_NOT_IN_EXCERPT', PG_I_NEEDS_BOILING: 'PG_I_NEEDS_BOILING', FLASH_OUT_OF_RANGE: 'FLASH_OUT_OF_RANGE' };
  var SOURCE_NOTE = '목록 발췌: 49 CFR 172.101 표(UN번호→Class), 49 CFR 173.121(용기등급 기준), 위험물 선박운송 및 저장규칙 제2조 가목(인화점 구분). IMDG Code 본문은 읽지 못했다.';
  // 발췌: UN번호 -> 품명(영문 표기 일부)·Class 후보. 에어로졸(UN1950)은 2.1·2.2 모두.
  var EXCERPT = {
    UN1263: { name: 'Paint (페인트류)', classes: ['3'] },
    UN1170: { name: 'Ethanol (에탄올)', classes: ['3'] },
    UN3066: { name: 'Paint or paint related material (부식성)', classes: ['8'] },
    UN1950: { name: 'Aerosols (에어로졸)', classes: ['2.1', '2.2'] },
    UN2810: { name: 'Toxic liquid, organic, n.o.s. (독물 액체)', classes: ['6.1'] },
    UN3082: { name: 'Environmentally hazardous substance, liquid, n.o.s. (해양오염물질)', classes: ['9'] }
  };

  function normalizeUn(s) {
    if (s == null) return null;
    var m = /^\s*(?:UN)?\s*(\d{4})\s*$/i.exec(String(s));
    return m ? 'UN' + m[1] : null;
  }
  function flashCategory(c) {
    if (typeof c !== 'number' || isNaN(c)) return null;
    if (c < -18) return '저인화점';
    if (c < 23) return '중인화점';
    if (c <= 60) return '고인화점';
    return null;
  }
  function impliedPackingGroup(c) {
    if (typeof c !== 'number' || isNaN(c)) return null;
    if (c < 23) return 'II';
    if (c <= 60) return 'III';
    return null;
  }
  function clsOk(listed, claimed) { return listed.indexOf(String(claimed).trim()) >= 0; }

  // item: { un, cls?, flash?(℃ 숫자), flashCat?, pg? }
  function checkDgItem(item) {
    var out = { weak: false, reasons: [], notes: [], details: [], entry: null };
    var un = normalizeUn(item && item.un);
    var entry = un && EXCERPT[un] ? EXCERPT[un] : null;
    out.entry = entry;
    if (!entry) { out.notes.push(NOTE.UN_NOT_IN_EXCERPT); }
    var given = item && item.cls != null && String(item.cls).trim() !== '' ? String(item.cls).trim() : null;
    var eff = given || (entry && entry.classes.length === 1 ? entry.classes[0] : null);   // Class 칸이 비면 목록의 단일 Class로 본다
    var isClass3 = eff === '3';
    if (entry && item.cls != null && String(item.cls).trim() !== '' && !clsOk(entry.classes, item.cls)) {
      out.reasons.push(REASON.CLASS_MISMATCH);
      out.details.push({ field: 'cls', claimed: String(item.cls).trim(), listed: entry.classes.slice() });
    }
    if (isClass3 && typeof item.flash === 'number') {
      var cat = flashCategory(item.flash);
      if (cat == null) out.notes.push(NOTE.FLASH_OUT_OF_RANGE);
      if (cat && item.flashCat && item.flashCat !== cat) {
        out.reasons.push(REASON.FLASH_CATEGORY_MISMATCH);
        out.details.push({ field: 'flashCat', claimed: item.flashCat, derived: cat, flash: item.flash });
      }
      if (item.pg) {
        if (item.pg === 'I') out.notes.push(NOTE.PG_I_NEEDS_BOILING);
        else {
          var pg = impliedPackingGroup(item.flash);
          if (pg && item.pg !== pg) {
            out.reasons.push(REASON.PG_MISMATCH);
            out.details.push({ field: 'pg', claimed: item.pg, derived: pg, flash: item.flash });
          }
        }
      }
    }
    out.weak = out.reasons.length > 0;
    return out;
  }

  return { DG_REASON: REASON, DG_NOTE: NOTE, SOURCE_NOTE: SOURCE_NOTE, DG_EXCERPT: EXCERPT, normalizeUn: normalizeUn, flashCategory: flashCategory, impliedPackingGroup: impliedPackingGroup, checkDgItem: checkDgItem };
});
