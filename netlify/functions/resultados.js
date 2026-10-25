const UFS='ac al ap am ba ce df es go ma mt ms mg pa pb pr pe pi rj rn rs ro rr sc sp se to'.split(' ');
const ROOT='https://resultados.tse.jus.br/oficial/ele2026/6258/dados';
const timeout=8500;
const toNum=x=>x===undefined||x===null||x===''?null:Number(String(x).replace(',','.'));
const field=(obj,...keys)=>keys.map(k=>obj?.[k]).find(v=>v!==undefined&&v!==null&&v!=='');
function parse(j){
  // EA20: resultados por cargo aparecem em cand; dados gerais variam por abrangencia.
  const rows=Array.isArray(j?.cand)?j.cand:Array.isArray(j?.carg?.[0]?.cand)?j.carg[0].cand:[];
  const candidatos=rows.map(c=>({numero:toNum(field(c,'n','numero','nr')),votos:toNum(field(c,'vap','votos','vot')),percentual:toNum(field(c,'pvap','percentual','pct'))})).filter(c=>[13,22].includes(c.numero));
  const hasValid=candidatos.length===2&&candidatos.every(c=>Number.isFinite(c.votos)&&c.votos>=0&&Number.isFinite(c.percentual)&&c.percentual>=0&&c.percentual<=100);
  if(!hasValid)return null;
  const total=candidatos.reduce((s,c)=>s+c.votos,0);
  // Nao divulgar votos de simulacao ou totalizacoes de outro pleito.
  const validos=toNum(field(j,'vvc','vv','validos'))??total;
  const brancos=toNum(field(j,'vb','brancos'));
  const nulos=toNum(field(j,'vn','nulos'));
  const pct=toNum(field(j,'pst','psa','apuradas_pct'));
  return {candidatos,validos,invalidos:brancos!==null&&nulos!==null?brancos+nulos:null,apuradas_pct:pct,atualizado_em:[j.dg,j.hg].filter(Boolean).join(' ')||null};
}
async function get(uf){const file=`${uf}-c0001-e006258-u.json`;const url=`${ROOT}/${uf}/${file}`;const controller=new AbortController();const t=setTimeout(()=>controller.abort(),timeout);try{const r=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});if(!r.ok)return null;const j=await r.json();return parse(j)}catch{return null}finally{clearTimeout(t)}}
exports.handler=async()=>{
  const entries=await Promise.all(['br',...UFS].map(async uf=>[uf.toUpperCase(),await get(uf)]));
  const resultados=Object.fromEntries(entries.filter(([,v])=>v));
  const ok=Object.keys(resultados).length;
  return {statusCode:200,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=25, s-maxage=25, stale-while-revalidate=30','Access-Control-Allow-Origin':'*'},body:JSON.stringify({mensagem:ok?`Dados obtidos do TSE para ${ok} abrangência(s). Atualização periódica; confira o horário da fonte.`:'Aguardando dados oficiais verificáveis do segundo turno. Nenhum resultado será estimado.',resultados})};
};
