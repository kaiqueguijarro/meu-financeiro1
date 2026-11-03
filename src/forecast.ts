export type ForecastCard = {id:string;name:string;closing_day:number;due_day:number};
export type ForecastPurchase = {id:string;description:string;card_id:string;transaction_date:string;amount_cents:number;installments:number};
export type ForecastInstallment = {id:string;transaction_id:string;installment_number:number;amount_cents:number;statement_month:string;status:string};
export type ForecastRule = {id:string;description:string;card_id:string|null;amount_cents:number;direction:string;payment_method:string;day_of_month:number;start_date:string;end_date:string|null;active:boolean};
export type ForecastStatement = {id:string;card_id:string;statement_month:string;confirmed_total_cents:number|null;status:string};
export type ForecastLine = {id:string;label:string;amount_cents:number;kind:'installment'|'recurring'|'purchase';detail?:string};
export const monthKey=(date:string)=>date.slice(0,7);
export const addMonths=(key:string,delta:number)=>{const [y,m]=key.split('-').map(Number);const d=new Date(Date.UTC(y,m-1+delta,1));return d.toISOString().slice(0,7)};
export const currentMonth=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`};
export const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n/100);
export const statementMonth=(date:string,closingDay:number)=>{const day=Number(date.slice(8,10));return addMonths(monthKey(date),day<=closingDay?1:2)};
export function forecastForCard(card:ForecastCard,key:string,purchases:ForecastPurchase[],installments:ForecastInstallment[],rules:ForecastRule[],statements:ForecastStatement[]){
 const lines:ForecastLine[]=[];
 const cardPurchases=purchases.filter(p=>p.card_id===card.id);
 const byTx=new Map<string,ForecastInstallment[]>();
 for(const row of installments.filter(x=>x.status!=='cancelled'))byTx.set(row.transaction_id,[...(byTx.get(row.transaction_id)||[]),row]);
 for(const p of cardPurchases){
  const rows=byTx.get(p.id)||[];
  // Materialized installment rows are authoritative, including months with no row.
  if(rows.length){for(const row of rows.filter(r=>monthKey(r.statement_month)===key))lines.push({id:row.id,label:p.description,amount_cents:row.amount_cents,kind:'installment',detail:`${row.installment_number}/${p.installments}`});continue;}
  // Fallback only for purchases without materialized installments. Split integer cents deterministically.
  const count=Math.max(1,p.installments||1),first=statementMonth(p.transaction_date,card.closing_day);
  const offset=(Number(key.slice(0,4))-Number(first.slice(0,4)))*12+Number(key.slice(5,7))-Number(first.slice(5,7));
  if(offset>=0&&offset<count){const base=Math.floor(p.amount_cents/count);const remainder=p.amount_cents%count;lines.push({id:p.id,label:p.description,amount_cents:base+(offset<remainder?1:0),kind:count>1?'installment':'purchase',detail:count>1?`${offset+1}/${count}`:undefined})}
 }
 for(const rule of rules.filter(r=>r.active&&r.card_id===card.id&&r.payment_method==='credit'&&r.direction==='expense')){
  // Rule is dated by the actual charge month; determine which charge maps to the selected statement.
  for(let delta=-2;delta<=0;delta++){
   const chargeMonth=addMonths(key,delta),chargeDate=`${chargeMonth}-${String(rule.day_of_month).padStart(2,'0')}`;
   if(chargeDate<rule.start_date||(rule.end_date&&chargeDate>rule.end_date))continue;
   if(statementMonth(chargeDate,card.closing_day)===key)lines.push({id:`${rule.id}-${chargeMonth}`,label:rule.description,amount_cents:rule.amount_cents,kind:'recurring'});
  }
 }
 const projected=lines.reduce((sum,l)=>sum+l.amount_cents,0);
 const confirmed=statements.find(s=>s.card_id===card.id&&monthKey(s.statement_month)===key&&s.confirmed_total_cents!==null);
 return {lines,projected,total:confirmed?.confirmed_total_cents??projected,confirmed:!!confirmed,status:confirmed?.status};
}
