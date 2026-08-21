/* Trimestre calendário (Q1 jan-mar, Q2 abr-jun, Q3 jul-set, Q4 out-dez) a
   partir da data em que a rodada de tools/sync.mjs roda. Substitui o
   `meta.quarter` que antes era escrito à mão em prosa.js: era a única parte
   daquele bloco que não era decisão editorial nenhuma — só matemática de
   calendário sobre "hoje", que não precisa de julgamento humano toda
   quinzena. O rótulo "Qn AAAA" é o mesmo formato que já aparecia à mão (e
   que o medidor do trimestre e as faixas do Futuro, em app.js, já esperam) —
   mantido aqui para o site continuar mostrando exatamente o mesmo formato
   sem precisar mudar HTML/CSS nenhum.

   Puro: só matemática de data, sem I/O, sem `new Date()` interno — quem
   chama passa "hoje" por fora, o que é o que torna esta função testável sem
   mockar relógio. */
export function trimestreDe(hojeIso){
  const [y, m] = hojeIso.slice(0, 10).split('-').map(Number);
  const q = Math.floor((m - 1) / 3); // 0..3
  const mesIni = q * 3 + 1;
  const mesFim = mesIni + 2;
  /* new Date(y, mesFim, 0) é "dia 0 do mês depois de mesFim" — truque padrão
     para pegar o último dia de mesFim sem tabela de 28/30/31 (e sem precisar
     saber se `y` é bissexto para fevereiro). */
  const ultimoDia = new Date(y, mesFim, 0).getDate();
  const pad = n => String(n).padStart(2, '0');
  return {
    label: `Q${q + 1} ${y}`,
    start: `${y}-${pad(mesIni)}-01`,
    end: `${y}-${pad(mesFim)}-${pad(ultimoDia)}`
  };
}
