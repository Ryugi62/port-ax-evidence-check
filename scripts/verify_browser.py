"""물리 검증: 로컬 정적 서버를 띄워 헤드리스 브라우저로 GWT 1~5, S5·S7을 재현한다. 사용: verify_browser.py [포트]"""
import subprocess, sys, time, json, os, signal
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
OUT = os.environ.get('SHOTS', '/tmp')
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
res = {}
try:
    time.sleep(0.8)
    base = 'http://127.0.0.1:%d/' % PORT
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True)
        page = ctx.new_page()
        reqs, errs, popups = [], [], []
        page.on('request', lambda r: reqs.append(r.url))
        page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.on('dialog', lambda d: (popups.append(d.message), d.dismiss()))
        t0 = time.time(); page.goto(base, wait_until='load'); res['load_sec'] = round(time.time() - t0, 3)
        res['requests'] = sorted(set(u.replace(base, '/') for u in reqs))
        res['external_requests'] = [u for u in reqs if not u.startswith(base)]
        res['console_errors'] = errs
        res['cookies'] = len(ctx.cookies()); res['password_inputs'] = page.locator('input[type=password]').count()
        res['band_text'] = page.locator('#band').inner_text()[:140]
        # GWT1: 약한 판정이 맨 위
        page.get_by_role('button', name='전체', exact=True).click()
        rows = page.locator('#list .row')
        n = rows.count(); weak = [rows.nth(i).get_attribute('class').find('weak') >= 0 for i in range(n)]
        res['rows'] = n; res['weak_count'] = sum(weak)
        res['weak_on_top'] = weak == sorted(weak, reverse=True)
        # 세트 B 16건 필터 + S2: 모든 행에 '근거' 표시
        page.get_by_role('button', name='위험물 규칙 (16)').click()
        res['setB_rows'] = page.locator('#list .row').count()
        res['setB_rows_with_basis_label'] = page.locator('#list .row .basis', has_text='근거 제').count()
        # GWT2: 약한 건은 열기 전 확인함 비활성
        first = page.locator('#list .row').first
        btn = first.get_by_role('button', name='확인함')
        res['gwt2_confirm_disabled_before_open'] = btn.is_disabled()
        first.click()
        res['gwt1_detail_has_basis'] = page.locator('#detail .law').count() >= 1
        res['gwt1_highlight_marks'] = page.locator('#detail mark').count()
        res['gwt2_confirm_enabled_after_open'] = page.locator('#detail').get_by_role('button', name='확인함').first.is_enabled()
        page.screenshot(path=OUT + '/shot-review-desktop.png', full_page=False)
        # GWT4: 8 확인 · 2 반려 (세트 B 16건)
        page.get_by_role('button', name='위험물 규칙 (16)').click()
        for i in range(10):
            row = page.locator('#list .row').nth(0 if False else i)
            row.click()
            tgt = '확인함' if i < 8 else '반려'
            page.locator('#detail').get_by_role('button', name=tgt).first.click()
        page.locator('.tab[data-tab=log]').click()
        res['gwt4_summary'] = page.locator('#log-out .stat .n').all_inner_texts()
        res['gwt4_note'] = page.locator('#log-out p.note').first.inner_text()[:80]
        with page.expect_download() as dl:
            page.locator('#dl').click()
        path = dl.value.path(); csv = open(path, encoding='utf-8-sig').read()
        res['gwt4_csv_lines'] = len(csv.strip().split('\n')); res['gwt4_csv_has_time'] = csv.count('T') >= 10 and '2026' in csv
        res['gwt4_csv_tail'] = csv.strip().split('\n')[-1]
        page.screenshot(path=OUT + '/shot-log.png')
        # GWT3 + S5: 입력 2종 결과가 서로 다름
        page.locator('.tab[data-tab=check]').click()
        page.locator('#c-law').select_option('portact'); page.locator('#c-ref').fill('제16조'); page.locator('#c-claim').fill('신청인은 1개월 이내에 신고한다.')
        o1 = page.locator('#c-out').inner_text(); res['gwt3_out'] = o1[:200].replace('\n', ' | ')
        res['gwt3_ambiguous'] = '숫자 확인 필요' in o1 and page.locator('#c-out mark.o').count() == 1 and page.locator('#c-out .where').count() == 2
        page.screenshot(path=OUT + '/shot-check-1.png')
        page.locator('#c-claim').fill('관청은 접수일부터 15일 안에 결과를 통보해야 한다.')
        page.locator('#c-ref').fill('제16조제2항')
        o2 = page.locator('#c-out').inner_text(); res['s5_second_out'] = o2[:60].replace('\n', ' | ')
        res['s5_outputs_differ'] = o1 != o2
        # GWT5: 네트워크 끈 상태
        ctx.set_offline(True)
        page.locator('#c-claim').fill('20일 안에 반납해야 한다.'); page.locator('#c-law').select_option('hazmat'); page.locator('#c-ref').fill('제24조의5')
        o3 = page.locator('#c-out').inner_text(); res['gwt5_offline_out'] = o3[:80].replace('\n', ' | ')
        res['gwt5_offline_ok'] = '숫자 불일치' in o3
        ctx.set_offline(False)
        page.locator('.tab[data-tab=eval]').click()
        res['eval_text'] = page.locator('#eval-out table').inner_text().replace('\n', ' ').replace('\t', ' ')[:400]
        page.screenshot(path=OUT + '/shot-eval.png', full_page=True)
        res['popups'] = popups
        res['requests_after_all'] = sorted(set(u.replace(base, '/') for u in reqs))
        # 모바일
        m = b.new_context(viewport={'width': 390, 'height': 800}, device_scale_factor=2).new_page()
        m.goto(base); m.screenshot(path=OUT + '/shot-mobile.png')
        res['mobile_h_scroll'] = m.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
        m.locator('#list .row').first.click(); m.wait_for_timeout(200); m.screenshot(path=OUT + '/shot-mobile-detail.png')
        b.close()
finally:
    srv.send_signal(signal.SIGTERM); srv.wait(timeout=5)
print(json.dumps(res, ensure_ascii=False, indent=1))
