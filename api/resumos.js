/* GET /api/resumos            → as frases de resumo guardadas (épicos, PBIs, bugs)
   GET /api/resumos?varrer=1   → uma rodada de geração (o cron diário chama isto)

   Só a porta de entrada da Vercel. A lógica, e os testes dela, estão em
   api/_lib/resumos.js. */
import { responder } from './_lib/resumos.js';

export default {
  fetch(request) {
    return responder(request, { env: process.env });
  },
};
