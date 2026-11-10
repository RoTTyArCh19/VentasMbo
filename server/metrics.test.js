import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarize,validateRange} from './metrics.js';
import {salesQuery} from './query.js';
const row={Date:'2026-11-01',StoreCode:'A',StoreName:'A',SellerCode:'1',SellerName:'Ana'};
test('factura y NC con mismo DocEntry se mantienen separadas; factura compartida cuenta una vez',()=>{
 const s=summarize([{...row,Type:'FACTURA',DocEntry:10,Amount:60},{...row,Type:'FACTURA',DocEntry:10,StoreCode:'B',Amount:40},{...row,Type:'NOTA CREDITO',DocEntry:10,Amount:-30}]);
 assert.equal(s.net,70);assert.equal(s.invoiceCount,1);assert.equal(s.creditCount,1);assert.equal(s.ticket,100);assert.equal(s.stores.reduce((n,r)=>n+r.net,0),70);assert.equal(s.sellers[0].net,70);
});
test('rango real, inclusive y acotado',()=>{
 validateRange('2024-02-29','2024-02-29');
 for (const [s,e] of [['2026-02-29','2026-03-01'],['2026-03-01','2026-02-28'],['2024-01-01','2026-01-01'],['bad','2026-01-01']]) assert.throws(()=>validateRange(s,e));
});
test('sin datos y devoluciones sin ventas',()=>{
 assert.equal(summarize([]).ticket,0);assert.equal(summarize([{...row,Type:'NOTA CREDITO',DocEntry:1,Amount:-50}]).net,-50);
});
test('schema validado y partición por tipo de documento',()=>{
 assert.throws(()=>salesQuery('x";DROP'));assert.match(salesQuery('SCHEMA'),/PARTITION BY "Type", "DocEntry"/);
});
