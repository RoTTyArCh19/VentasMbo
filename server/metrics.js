export function validateRange(start, end) {
  const valid = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
  if (!valid(start) || !valid(end) || start > end) throw new Error('Selecciona un rango de fechas válido.');
  if ((Date.parse(end)-Date.parse(start))/86400000 > 365) throw new Error('Consulta un máximo de 366 días a la vez.');
}
export function summarize(rows) {
  let invoices = 0, credits = 0;
  const invoiceIds = new Set(), creditIds = new Set();
  const stores = new Map(), sellers = new Map(), days = new Map();
  for (const r of rows) {
    const amount = Number(r.Amount);
    if (!Number.isFinite(amount)) throw new Error('SAP devolvió un importe inválido');
    if (r.Type === 'FACTURA') { invoices += amount; invoiceIds.add(r.DocEntry); }
    else { credits -= amount; creditIds.add(r.DocEntry); }
    for (const [map, code, name] of [[stores,r.StoreCode,r.StoreName],[sellers,r.SellerCode,r.SellerName],[days,r.Date,r.Date]]) {
      const item = map.get(String(code)) || {code:String(code),name, invoices:0,credits:0,net:0,ids:new Set()};
      item.net += amount;
      if (r.Type === 'FACTURA') { item.invoices += amount; item.ids.add(r.DocEntry); } else item.credits -= amount;
      map.set(String(code),item);
    }
  }
  const values = map => [...map.values()].map(({ids,...r})=>({...r,count:ids.size})).sort((a,b)=>b.net-a.net);
  return {invoices,credits,net:invoices-credits,invoiceCount:invoiceIds.size,creditCount:creditIds.size,ticket:invoiceIds.size?invoices/invoiceIds.size:0,
    stores:values(stores),sellers:values(sellers),days:values(days).sort((a,b)=>a.code.localeCompare(b.code))};
}
