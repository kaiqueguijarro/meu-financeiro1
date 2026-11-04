import { InfoHelp } from './InfoHelp';
import { useState } from 'react';
import { addMonths, cardStatementLabel, currentMonth, forecastForCard, isCardStatementPayment, money, shortCardName } from './forecast';
import type { ForecastCard, ForecastPurchase, ForecastInstallment, ForecastRule, ForecastStatement } from './forecast';

type Transaction = { id:string; description:string; amount_cents:number; direction:'income'|'expense'; payment_method:string; transaction_date:string; status:string };
type Props = { cards:ForecastCard[]; transactions:Transaction[]; purchases:ForecastPurchase[]; installments:ForecastInstallment[]; rules:ForecastRule[]; statements:ForecastStatement[] };
const label=(month:string)=>new Date(month+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
const paymentLabel=(status:string|undefined,date:string,type:'income'|'expense'|'card',today:string)=>{if(status==='paid'||(status==='posted'&&date<=today))return type==='income'?'Recebido':'Pago';if(status==='reconciled'||status==='open')return 'Fatura em aberto';if(status==='future')return 'Fatura futura';if(status==='closed')return 'Fechada';if(date<today)return 'Vencido';if(status==='unconfirmed')return 'Não confirmado';return 'Pendente'};
const dateFor=(month:string,day:number)=>month+'-'+String(Math.min(Math.max(day,1),new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate())).padStart(2,'0');

export function CashFlow({cards,transactions,purchases,installments,rules,statements}:Props){
 const [selected,setSelected]=useState(currentMonth());
 const [filter,setFilter]=useState<'all'|'income'|'expense'|'card'>('all');
 const months=Array.from({length:6},(_,i)=>addMonths(currentMonth(),i));
 // Opening balances are a snapshot. Historical posted entries must not be added to future cash flow.
 const today=new Date().toLocaleDateString('sv-SE');
 const data=months.map(month=>{
  const items:{id:string;date:string;description:string;amount:number;type:'income'|'expense'|'card';status?:string}[]=[];
  for(const t of transactions){
   if(t.transaction_date.slice(0,7)!==month||t.payment_method==='credit'||t.status==='cancelled'||((t.status==='posted'||t.status==='paid')&&t.transaction_date<=today))continue;
   items.push({id:t.id,date:t.transaction_date,description:t.description,amount:t.amount_cents,type:t.direction,status:t.status});
  }
  for(const r of rules){
   if(!r.active||r.payment_method==='credit')continue;
   const date=dateFor(month,r.day_of_month);
   if(date<r.start_date||(r.end_date&&date>r.end_date)||date<today)continue;
   if(transactions.some(t=>t.payment_method!=='credit'&&t.transaction_date===date&&t.description.trim().toLowerCase()===r.description.trim().toLowerCase()&&t.amount_cents===r.amount_cents&&t.direction===r.direction&&t.status!=='cancelled'))continue;
   items.push({id:'rule-'+r.id,date,description:r.description+' · recorrente',amount:r.amount_cents,type:r.direction==='income'?'income':'expense',status:'unconfirmed'});
  }
  for(const c of cards){
   // A statement is paid in its due month; forecastForCard uses statement month.
   const statementKey=month;
   const f=forecastForCard(c,statementKey,purchases,installments,rules,statements);
   const saved=statements.find(s=>s.card_id===c.id&&s.statement_month.slice(0,7)===statementKey);
   if(saved?.status==='paid')continue;
   const total=saved?.confirmed_total_cents??f.total;
   const paymentRecorded=total>0&&transactions.some(t=>t.payment_method!=='credit'&&t.direction==='expense'&&t.status!=='cancelled'&&t.transaction_date.slice(0,7)===month&&t.amount_cents===total&&isCardStatementPayment(t.description,c.name));
   if(total>0&&!paymentRecorded)items.push({id:'card-'+c.id,date:dateFor(month,c.due_day),description:'Fatura '+shortCardName(c.name)+' · '+cardStatementLabel(c,statementKey,saved?.status,today).toLocaleLowerCase('pt-BR'),amount:total,type:'card',status:saved?.status==='reconciled'?cardStatementLabel(c,statementKey,saved?.status,today)==='Fatura em aberto'?'open':'future':saved?.status});
  }
  items.sort((a,b)=>a.date.localeCompare(b.date));
  const income=items.filter(x=>x.type==='income').reduce((s,x)=>s+x.amount,0);
  const expense=items.filter(x=>x.type==='expense').reduce((s,x)=>s+x.amount,0);
  const cardsTotal=items.filter(x=>x.type==='card').reduce((s,x)=>s+x.amount,0);
  return {month,items,income,expense,cardsTotal,net:income-expense-cardsTotal};
 });
 const active=data.find(x=>x.month===selected)||data[0];
 return <section className="panel" aria-label="Fluxo de caixa consolidado">
  <div className="section-title"><h2>Fluxo de caixa · 6 meses</h2><InfoHelp title="Entenda o fluxo de caixa">As receitas, despesas e faturas são organizadas por mês de vencimento. O resultado mensal não inclui o saldo inicial. Revise recorrências e pagamentos para evitar duplicidades.</InfoHelp></div>
  
  <div className="month-strip">{data.map(d=><button key={d.month} type="button" className={selected===d.month?'month-choice active':'month-choice'} onClick={()=>setSelected(d.month)}>{new Date(d.month+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'short'})}</button>)}</div>
  <div className="forecast-total"><small>Resultado programado · {label(active.month)}</small><strong>{money(active.net)}</strong></div>
  <div className="stats">
   <div className="panel"><small>Entradas</small><strong>{money(active.income)}</strong></div>
   <div className="panel"><small>Pix, débito e contas</small><strong>{money(active.expense)}</strong></div>
   <div className="panel"><small>Faturas dos cartões</small><strong>{money(active.cardsTotal)}</strong></div>
   <div className="panel"><small>Saídas totais</small><strong>{money(active.expense+active.cardsTotal)}</strong></div>
  </div>
  <h3>Programação de {label(active.month)}</h3>
  <div className="month-strip" aria-label="Filtrar programação">{([{id:'all',name:'Todos'},{id:'income',name:'Entradas'},{id:'expense',name:'Conta corrente'},{id:'card',name:'Cartões'}] as const).map(f=><button key={f.id} type="button" className={filter===f.id?'month-choice active':'month-choice'} aria-pressed={filter===f.id} onClick={()=>setFilter(f.id)}>{f.name}</button>)}</div>
  {active.items.filter(x=>filter==='all'||x.type===filter).length?active.items.filter(x=>filter==='all'||x.type===filter).map(x=><div className="item" key={x.id} style={{borderLeft:'4px solid '+(x.type==='income'?'#22a06b':x.type==='card'?'#3b82f6':'#e5a000'),paddingLeft:12,background:x.type==='income'?'rgba(34,160,107,.06)':x.type==='card'?'rgba(59,130,246,.06)':'rgba(229,160,0,.06)',borderRadius:8}}><div className="item-main"><b>{x.description}</b><small style={{fontWeight:700,color:paymentLabel(x.status,x.date,x.type,today)==='Pago'||paymentLabel(x.status,x.date,x.type,today)==='Recebido'?'#86efac':x.date<today?'#fca5a5':(x.status==='reconciled'||x.status==='open'||x.status==='future')?'#93c5fd':'#fde68a'}}>{paymentLabel(x.status,x.date,x.type,today)}</small><small>{new Date(x.date+'T12:00:00').toLocaleDateString('pt-BR')} · {x.type==='income'?'Entrada':x.type==='card'?'Cartão':'Conta / débito'}</small></div><strong>{x.type==='income'?'+':'−'} {money(x.amount)}</strong></div>):<p className="empty">Nenhuma entrada ou despesa futura cadastrada neste mês.</p>}
  
 </section>;
}
