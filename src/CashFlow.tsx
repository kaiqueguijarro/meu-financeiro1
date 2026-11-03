import { useState } from 'react';
import { addMonths, currentMonth, forecastForCard, money } from './forecast';
import type { ForecastCard, ForecastPurchase, ForecastInstallment, ForecastRule, ForecastStatement } from './forecast';

type Account = { opening_balance_cents:number };
type Transaction = { id:string; description:string; amount_cents:number; direction:'income'|'expense'; payment_method:string; transaction_date:string; status:string };
type Props = { accounts:Account[]; cards:ForecastCard[]; transactions:Transaction[]; purchases:ForecastPurchase[]; installments:ForecastInstallment[]; rules:ForecastRule[]; statements:ForecastStatement[] };
const label=(month:string)=>new Date(month+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
const dateFor=(month:string,day:number)=>month+'-'+String(Math.min(Math.max(day,1),new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate())).padStart(2,'0');

export function CashFlow({accounts,cards,transactions,purchases,installments,rules,statements}:Props){
 const [selected,setSelected]=useState(currentMonth());
 const months=Array.from({length:6},(_,i)=>addMonths(currentMonth(),i));
 const initial=accounts.reduce((s,a)=>s+a.opening_balance_cents,0);
 // Opening balances are a snapshot. Historical posted entries must not be added to future cash flow.
 const today=new Date().toLocaleDateString('en-CA');
 const data=months.map(month=>{
  const items:{id:string;date:string;description:string;amount:number;type:'income'|'expense'|'card'}[]=[];
  for(const t of transactions){
   if(t.transaction_date.slice(0,7)!==month||t.payment_method==='credit'||t.status==='cancelled'||t.status==='posted'||t.status==='paid')continue;
   items.push({id:t.id,date:t.transaction_date,description:t.description,amount:t.amount_cents,type:t.direction});
  }
  for(const r of rules){
   if(!r.active||r.payment_method==='credit')continue;
   const date=dateFor(month,r.day_of_month);
   if(date<r.start_date||(r.end_date&&date>r.end_date)||date<today)continue;
   items.push({id:'rule-'+r.id,date,description:r.description+' · recorrente',amount:r.amount_cents,type:r.direction==='income'?'income':'expense'});
  }
  for(const c of cards){
   // A statement is paid in its due month; forecastForCard uses statement month.
   const statementKey=c.due_day>c.closing_day?month:addMonths(month,-1);
   const f=forecastForCard(c,statementKey,purchases,installments,rules,statements);
   if(f.total>0)items.push({id:'card-'+c.id,date:dateFor(month,c.due_day),description:'Fatura '+c.name+(f.confirmed?' · confirmada':' · prevista'),amount:f.total,type:'card'});
  }
  items.sort((a,b)=>a.date.localeCompare(b.date));
  const income=items.filter(x=>x.type==='income').reduce((s,x)=>s+x.amount,0);
  const expense=items.filter(x=>x.type==='expense').reduce((s,x)=>s+x.amount,0);
  const cardsTotal=items.filter(x=>x.type==='card').reduce((s,x)=>s+x.amount,0);
  return {month,items,income,expense,cardsTotal,net:income-expense-cardsTotal};
 });
 const active=data.find(x=>x.month===selected)||data[0];
 return <section className="panel" aria-label="Fluxo de caixa consolidado">
  <div className="section-title"><h2>Fluxo de caixa · 6 meses</h2></div>
  <p className="forecast-footnote">Entradas programadas, despesas Pix/débito e faturas por mês de vencimento. Valores futuros ainda não cadastrados não são estimados.</p>
  <div className="month-strip">{data.map(d=><button key={d.month} type="button" className={selected===d.month?'month-choice active':'month-choice'} onClick={()=>setSelected(d.month)}>{new Date(d.month+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'short'})}</button>)}</div>
  <div className="forecast-total"><small>Resultado programado · {label(active.month)}</small><strong>{money(active.net)}</strong></div>
  <div className="stats">
   <div className="panel"><small>Entradas</small><strong>{money(active.income)}</strong></div>
   <div className="panel"><small>Pix, débito e contas</small><strong>{money(active.expense)}</strong></div>
   <div className="panel"><small>Faturas dos cartões</small><strong>{money(active.cardsTotal)}</strong></div>
   <div className="panel"><small>Saídas totais</small><strong>{money(active.expense+active.cardsTotal)}</strong></div>
  </div>
  <h3>Programação de {label(active.month)}</h3>
  {active.items.length?active.items.map(x=><div className="item" key={x.id}><div className="item-main"><b>{x.description}</b><small>{new Date(x.date+'T12:00:00').toLocaleDateString('pt-BR')} · {x.type==='income'?'Entrada':x.type==='card'?'Cartão':'Conta / débito'}</small></div><strong>{x.type==='income'?'+':'−'} {money(x.amount)}</strong></div>):<p className="empty">Nenhuma entrada ou despesa futura cadastrada neste mês.</p>}
  <p className="forecast-footnote">Saldo inicial informado nas contas: {money(initial)}. Não somado ao resultado mensal porque ainda é necessário conciliar a data-base e os pagamentos já realizados. Recorrências podem coincidir com lançamentos avulsos: revise antes de considerar a projeção definitiva.</p>
 </section>;
}
