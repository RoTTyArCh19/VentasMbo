import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {salesQuery} from './query.js';
import {validateRange, summarize} from './metrics.js';
import {demoRows, stores, sellers} from './demo.js';
// Almacenes excluidos del panel de ventas.
const ALMACENES_EXCLUIDOS = new Set([
  "00A", "00F", "00FT", "00M", "00P", "00R", "00T",
  "03T", "04T", "07T", "08T", "09T",
  "101T", "106T", "107T",
  "111T", "112T", "113T", "114T", "116T", "117T",
  "118T", "119T", "120T", "121T", "122T", "123T",
  "13T", "14T", "16T", "17T",
  "200D",
  "23T", "25T", "26T", "27T", "28T",
  "31T", "32T", "36T", "37T",
  "41T", "42T", "43T", "45T", "46T", "48T",
  "50", "51T", "54T", "55T", "56T", "57T", "59T",
  "62T", "63T", "65T", "66T", "67T", "68T",
  "71", "71T", "86T", "92T", "95T", "96T", "98T", "99T",
  "BTXD", "CMKT",
  "LP01", "LP02", "LP03", "LP04", "LP05", "LP50",
  "M001", "M002", "M003", "M004",
  "M005", "M006", "M007", "M008",
  "MU1", "MU1T", "NO01", "P002", "P002T",
  "PA01", "PA02", "PA03", "PA04", "PA05", "PA50",
  "RES",
  "RP01", "RP02", "RP03", "RP04", "RP05",
  "SIN01", "TCOM", "48CA", "48FL", "48TR", "48OP", "48PE"
]);
function almacenPermitido(codigo) {
  const normalizado = String(codigo ?? "").trim().toUpperCase();
  return !ALMACENES_EXCLUIDOS.has(normalizado);
}
const app=express(), port=Number(process.env.PORT||3001), mode=process.env.DATA_MODE||'demo';
if (!['demo','hana'].includes(mode)) throw new Error('DATA_MODE debe ser demo o hana');
const schema=process.env.HANA_SCHEMA||'CLPRDCOMERVESTUARIO';
const query=salesQuery(schema);
app.disable('x-powered-by');
app.use((req,res,next)=>{
  const hostname=req.hostname;
  if (!['localhost','127.0.0.1','[::1]'].includes(hostname)) return res.status(403).json({error:'Solo acceso local.'});
  res.set('Cache-Control','no-store'); res.set('X-Content-Type-Options','nosniff'); next();
});
async function withHana(callback) {
  const {default:hana}=await import('@sap/hana-client');
  const conn=hana.createConnection();
  try {
    await new Promise((resolve,reject)=>conn.connect({serverNode:process.env.HANA_SERVER,uid:process.env.HANA_USER,pwd:process.env.HANA_PASSWORD,encrypt:process.env.HANA_ENCRYPT==='true',sslValidateCertificate:true,connectTimeout:15000},e=>e?reject(e):resolve()));
    const exec=(sql,params=[])=>new Promise((resolve,reject)=>conn.exec(sql,params,(e,r)=>e?reject(e):resolve(r)));
    return await callback(exec);
  } finally { try {conn.disconnect();} catch {} }
}
const route=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){console.error('Consulta fallida:', e.code||e.name);res.status(503).json({error:'No se pudo consultar SAP. Revisa VPN, servidor, credenciales y permisos de lectura. Consulta la terminal para el código de error.'});}};
app.get('/api/catalogs',route(async(req,res)=>{
  if(mode==='demo') return res.json({mode,currency:'CLP',stores,sellers});
  const data=await withHana(async exec=>({mode,
    currency:(await exec(`SELECT "MainCurncy" FROM "${schema}"."OADM"`))[0].MainCurncy,
    stores:(await exec(`SELECT "WhsCode", "WhsName" FROM "${schema}"."OWHS" ORDER BY "WhsName"`)).map(x=>({code:x.WhsCode,name:x.WhsName})),
    sellers:(await exec(`SELECT "SlpCode", "SlpName" FROM "${schema}"."OSLP" ORDER BY "SlpName"`)).map(x=>({code:String(x.SlpCode),name:x.SlpName}))}));
  res.json({
  ...data,
  stores: data.stores.filter(tienda => almacenPermitido(tienda.code))
});
}));
let active=false;
app.get('/api/sales',route(async(req,res)=>{
  const {start,end,store,seller}=req.query;
  try {validateRange(start,end);}catch(e){return res.status(400).json({error:e.message});}
  if (active) return res.status(429).json({error:'Hay una consulta en curso. Inténtalo nuevamente en unos segundos.'});
  active=true;
  try {
    let rows=mode==='demo'?demoRows(start,end):await withHana(exec=>exec(query,[start,end,start,end]));
    rows = rows
  .filter(r => almacenPermitido(r.StoreCode))
  .map(r => ({
    ...r,
    Amount: Number(r.Amount)
  }));
    const unallocated=rows.filter(r=>Number(r.Unallocated)===1);
    rows=rows.filter(r=>(!store||r.StoreCode===store)&&(!seller||String(r.SellerCode)===seller));
    res.json({mode,start,end,summary:summarize(rows),rows,unallocatedDocuments:new Set(unallocated.map(r=>r.Type+':'+r.DocEntry)).size,updatedAt:new Date().toISOString()});
  } finally {active=false;}
}));
app.use('/api',(req,res)=>res.status(404).json({error:'Ruta no encontrada'}));
app.use(express.static(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist')));
app.listen(port,'127.0.0.1',()=>console.log(`Ventas: http://localhost:${port} | Modo: ${mode}`));
