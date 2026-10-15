/* GET /api/relatorio?edicao=2026-10&de=urlan → o pacote do relatório, ao vivo.

   Só a porta de entrada da Vercel, no formato que ela documenta (`fetch` Web
   Standard). A lógica, e os testes dela, estão em api/_lib/relatorio.js. */
import { responder } from './_lib/relatorio.js';

export default {
  fetch(request) {
    return responder(request, { env: process.env });
  },
};
