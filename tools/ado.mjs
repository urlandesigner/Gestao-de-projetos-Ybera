/* Camada REST do Azure DevOps para o Radar — sem DOM, sem dependência.

   PROCEDÊNCIA: cópia reduzida de "Gestão de projetos/assets/api.js", da
   Central de Projetos (hoje em github.com/urlandesigner/Gestao-de-projetos-Ybera).
   É cópia e não dependência porque a identidade deste projeto é "sem build e
   sem dependência", e submódulo ou pacote npm para ~100 linhas custa mais do
   que paga. O custo real disto é divergência: correção feita lá não chega aqui
   sozinha. Se você corrigir algo neste arquivo, leve para lá também.

   Toda função recebe ctx = {base, pat, fetchImpl}. O fetchImpl injetado é o
   que torna o tratamento de erro testável sem rede. */

const API = 'api-version=7.1';

export class AuthError extends Error {}
export class NetworkError extends Error {}

function b64(s){ return Buffer.from(s, 'utf8').toString('base64'); }

export async function adoFetch(ctx, caminho, options = {}){
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: 'Basic ' + b64(':' + ctx.pat)
  };
  let res;
  try {
    res = await ctx.fetchImpl(ctx.base + caminho, { ...options, headers });
  } catch (e) {
    throw new NetworkError(e.message); // CORS, offline, DNS…
  }
  if(res.status === 401 || res.status === 403) throw new AuthError('PAT inválido ou vencido');
  const tipo = res.headers.get('content-type') || '';
  if(!res.ok){
    if(tipo.includes('json')){
      const data = await res.json().catch(() => null);
      throw new Error((data && data.message) || `HTTP ${res.status}`);
    }
    throw new Error(`HTTP ${res.status}`);
  }
  /* PAT vencido no ADO não vem como 401: vem como 302 para a página de signin,
     que responde 200 text/html. Este check de content-type é o que detecta
     isso — não remova. (Verificado contra dev.azure.com em 2026-08.) */
  if(!tipo.includes('json')) throw new AuthError('Resposta não-JSON — PAT provavelmente vencido');
  return res.json();
}

export async function runWiql(ctx, projeto, query){
  const p = encodeURIComponent(projeto);
  const data = await adoFetch(ctx, `/${p}/_apis/wit/wiql?$top=2000&${API}`, {
    method: 'POST',
    body: JSON.stringify({ query })
  });
  return (data.workItems || []).map(w => w.id);
}

/* A API de lote aceita no máximo 200 ids por chamada. */
export async function getFields(ctx, ids, campos){
  const out = [];
  for(let i = 0; i < ids.length; i += 200){
    const data = await adoFetch(ctx, `/_apis/wit/workitemsbatch?${API}`, {
      method: 'POST',
      body: JSON.stringify({ ids: ids.slice(i, i + 200), fields: campos, errorPolicy: 'Omit' })
    });
    out.push(...(data.value || []).filter(Boolean));
  }
  return out;
}

export async function listProjects(ctx){
  const data = await adoFetch(ctx, `/_apis/projects?$top=500&${API}`);
  return (data.value || []).map(p => ({ id: p.id, name: p.name }));
}
