import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trimestreDe } from '../trimestre.mjs';

test('trimestreDe classifica cada mes no trimestre calendario certo', () => {
  assert.deepEqual(trimestreDe('2026-01-01'), { label:'Q1 2026', start:'2026-01-01', end:'2026-03-31' });
  assert.deepEqual(trimestreDe('2026-03-31'), { label:'Q1 2026', start:'2026-01-01', end:'2026-03-31' });
  assert.deepEqual(trimestreDe('2026-04-01'), { label:'Q2 2026', start:'2026-04-01', end:'2026-06-30' });
  assert.deepEqual(trimestreDe('2026-06-30'), { label:'Q2 2026', start:'2026-04-01', end:'2026-06-30' });
  assert.deepEqual(trimestreDe('2026-07-01'), { label:'Q3 2026', start:'2026-07-01', end:'2026-09-30' });
  assert.deepEqual(trimestreDe('2026-08-20'), { label:'Q3 2026', start:'2026-07-01', end:'2026-09-30' });
  assert.deepEqual(trimestreDe('2026-09-30'), { label:'Q3 2026', start:'2026-07-01', end:'2026-09-30' });
  assert.deepEqual(trimestreDe('2026-10-01'), { label:'Q4 2026', start:'2026-10-01', end:'2026-12-31' });
  assert.deepEqual(trimestreDe('2026-12-31'), { label:'Q4 2026', start:'2026-10-01', end:'2026-12-31' });
});

test('trimestreDe aceita timestamp ISO completo, nao so a data', () => {
  assert.deepEqual(trimestreDe('2026-08-20T21:04:02.380Z'),
    { label:'Q3 2026', start:'2026-07-01', end:'2026-09-30' });
});

/* Nenhum trimestre calendário termina em fevereiro (Q1 termina em março), e
   por isso "último dia do mês" nunca precisa saber se o ano é bissexto para
   este cálculo específico — este teste tranca que fevereiro no meio do
   trimestre (Q1 sempre passa por ele) não desloca o fim de Q1. */
test('fevereiro no meio do trimestre nao desloca o fim de Q1, bissexto ou nao', () => {
  assert.equal(trimestreDe('2028-02-10').end, '2028-03-31'); // 2028 é bissexto
  assert.equal(trimestreDe('2027-02-10').end, '2027-03-31'); // 2027 não é
});
