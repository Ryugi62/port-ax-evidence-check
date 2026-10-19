"""물리 검증: 측정 모드(?measure=1) 12건을 자동 클릭해 M1~M5를 재현한다. 사용: verify_measure.py [포트] [시드]"""
import subprocess, sys, time, json, os, signal, base64
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else 7
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
res = {}
try:
    time.sleep(0.8)
    base = 'http://127.0.0.1:%d/' % PORT
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={'width': 390, 'height': 800})
        page = ctx.new_page()
        reqs, errs = [], []
        page.on('request', lambda r: reqs.append(r.url))
        page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        page.on('pageerror', lambda e: errs.append(str(e)))
        page.goto(base + '?measure=1&seed=%d' % SEED)
        res['intro_has_seed'] = ('시드 %d' % SEED) in page.locator('#measure').inner_text()
        res['name_inputs'] = page.locator('input[type=text],input[type=email]').count()
        page.locator('#m-start').click()
        conds = []
        for i in range(12):
            has_basis = page.locator('#m-basis').count() == 1
            has_search = page.locator('#m-q').count() == 1
            conds.append('B' if has_basis else 'A')
            assert has_basis != has_search
            if has_search:
                page.locator('#m-q').fill('명세서')
            page.wait_for_timeout(120)
            (page.locator('#m-no') if i % 4 == 0 else page.locator('#m-ok')).click()
        res['cond_counts'] = {'A': conds.count('A'), 'B': conds.count('B')}
        res['result_visible'] = page.locator('#m-result').count() == 1
        res['result_text'] = page.locator('#m-result').inner_text().replace('\n', ' | ').replace('\t', ' ')[:300]
        code = page.locator('#m-code').input_value()
        pad = code + '=' * (-len(code) % 4)
        dec = json.loads(base64.urlsafe_b64decode(pad).decode())
        res['code_len'] = len(code); res['decoded_seed'] = dec[1]; res['decoded_rows'] = len(dec[2])
        res['mobile_h_scroll'] = page.evaluate('document.documentElement.scrollWidth > document.documentElement.clientWidth')
        res['external_requests'] = [u for u in reqs if not u.startswith(base)]
        res['console_errors'] = errs
        res['cookies'] = len(ctx.cookies())
        res['storage'] = page.evaluate('localStorage.length + sessionStorage.length')
        # 일반 화면은 그대로
        page.goto(base)
        res['normal_screen_ok'] = page.locator('#list .row').count() > 0
        b.close()
finally:
    srv.send_signal(signal.SIGTERM); srv.wait(timeout=5)
print(json.dumps(res, ensure_ascii=False, indent=1))
