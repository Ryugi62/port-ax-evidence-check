"""공개 법령 XML(국가법령정보센터 DRF)과 합성 사례 -> data.json / data.js. 사용: build_data.py <입출항법.xml> <위험물규칙.xml>"""
import json, sys, os
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAWS = [('portact', 'A'), ('hazmat', 'B')]


def mok(h):
    t = h.findtext('호내용') or ''
    for m in h.findall('목'):
        t += ' ' + (m.findtext('목내용') or '')
    return t.strip()


def parse(path, lid):
    r = ET.parse(path).getroot()
    name = r.findtext('.//법령명_한글')
    arts = {}
    for j in r.iter('조문단위'):
        if j.findtext('조문여부') != '조문':
            continue
        no = '제%s조' % j.findtext('조문번호')
        if j.findtext('조문가지번호'):
            no += '의' + j.findtext('조문가지번호')
        paras = []
        for h in j.findall('항'):
            items = []
            for ho in h.findall('호'):
                items.append(dict(no=(ho.findtext('호번호') or '').strip(), text=mok(ho)))
            paras.append(dict(no=(h.findtext('항번호') or '').strip(), text=(h.findtext('항내용') or '').strip(), items=items))
        arts[no] = dict(title=j.findtext('조문제목') or '', head=(j.findtext('조문내용') or '').strip(), paras=paras)
    return dict(id=lid, name=name, effective=r.findtext('.//시행일자'), promulgated=r.findtext('.//공포일자'), articles=arts)


def main():
    p1, p2 = sys.argv[1], sys.argv[2]
    laws = {'portact': parse(p1, 'portact'), 'hazmat': parse(p2, 'hazmat')}
    cases = json.load(open(os.path.join(ROOT, 'data-src', 'cases.json'), encoding='utf-8'))
    data = dict(note=cases['note'], laws=laws, cases=cases['cases'])
    s = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    open(os.path.join(ROOT, 'data.json'), 'w', encoding='utf-8').write(s)
    open(os.path.join(ROOT, 'data.js'), 'w', encoding='utf-8').write('window.PORTAX_DATA=' + s + ';')
    print(len(s), {k: len(v['articles']) for k, v in laws.items()})


main()
