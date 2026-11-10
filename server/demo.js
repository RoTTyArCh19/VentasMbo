export const stores = [ ['T01','Trial · Parque Arauco'], ['T02','Trial · Marina Arauco'], ['B01','Boss · Parque Arauco'], ['F01','Florsheim · Costanera'], ['C01','Canadienne · Viña'] ].map(([code,name])=>({code,name}));
export const sellers = ['Ana Torres','Diego Muñoz','Valentina Soto','Felipe Rojas','Camila Pérez','Martín Silva'].map((name,i)=>({code:String(i+1),name}));
export function demoRows(start,end) {
  const result=[];
  for(let day=Date.parse(start);day<=Date.parse(end);day+=86400000) {
    const date = new Date(day).toISOString().slice(0,10), seed=Math.floor(day/86400000);
    stores.forEach((store,s)=>{
      for(let j=0;j<5+(seed+s)%7;j++) {
        const seller=sellers[(j+s)%sellers.length], credit=j===0&&(seed+s)%3===0;
        result.push({Type:credit?'NOTA CREDITO':'FACTURA',DocEntry:seed*1000+s*30+j,FolioNum:800000+(seed%1000)*100+s*15+j,Date:date,DocCur:'CLP',StoreCode:store.code,StoreName:store.name,SellerCode:seller.code,SellerName:seller.name,Unallocated:0,Amount:(credit?-1:1)*(29990+((seed*13+j*7+s*19)%23)*10000)*(s===2?2:1)});
      }
    });
  }
  return result;
}
