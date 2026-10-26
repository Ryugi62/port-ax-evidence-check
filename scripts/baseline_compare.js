// 사용: node scripts/baseline_compare.js  — 같은 28건에서 목록 순서별 심은 오판 위치를 계산해 출력(사람 측정 아님).
const fs = require('fs'), path = require('path');
const { loadData } = require('../src/application/loader.js');
const { buildItems, sortWeakFirst } = require('../src/application/listing.js');
const { compare } = require('../src/application/baseline.js');
const data = loadData(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data.json'), 'utf8')));
const c = compare(buildItems(data), sortWeakFirst, [5, 10]);
const f = x => (Math.round(x * 100) / 100).toString();
console.log(`N=${c.N} 심은 오판=${c.planted}(숫자형 ${c.numberPlanted})`);
console.log('순서\t앞5건 안\t앞10건 안\t평균 자리\t마지막 자리');
console.log(`빨간 우선(이 안)\t${c.redFirst.firstK[5]}\t${c.redFirst.firstK[10]}\t${f(c.redFirst.meanRank)}\t${c.redFirst.lastRank}`);
console.log(`무작위(신뢰도 무관 기대값)\t${f(c.random.firstK[5])}\t${f(c.random.firstK[10])}\t${f(c.random.meanRank)}\t${f(c.random.lastRank)}`);
console.log(`원래 순서(자료 입력 순)\t${c.original.firstK[5]}\t${c.original.firstK[10]}\t${f(c.original.meanRank)}\t${c.original.lastRank}`);
console.log(`이론 상한(신뢰도 완벽)\t${c.oracle.firstK[5]}\t${c.oracle.firstK[10]}\t${f(c.oracle.meanRank)}\t${c.oracle.lastRank}`);
console.log(`숫자형 4건 자리: 빨간 우선 ${c.redFirst.numberPositions} / 원래 ${c.original.numberPositions} / 무작위 앞5건 기대 ${f(c.randomNumber.firstK[5])}, 마지막 자리 기대 ${f(c.randomNumber.lastRank)}`);
console.log(`오판 위치: 빨간 우선 ${c.redFirst.positions} / 원래 ${c.original.positions}`);
