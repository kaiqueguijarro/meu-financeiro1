import { InfoHelp } from './InfoHelp';
import { useState } from 'react';
import { addMonths, currentMonth, forecastForCard, isCardStatementPayment, money } from './forecast';
import type { ForecastCard, ForecastPurchase, ForecastInstallment, ForecastRule, ForecastStatement } from './forecast';

type Transaction = { id:string; description:string; amount_cents:number; direction:'income'|'expense'; payment_method:string; transaction_date:string; status:string;account_id:string|null };
type Account={id:string;opening_balance_cents:number;opening_balance_date:string};
type Props = { accounts:Account[]; cards:ForecastCard[]; transactions:Transaction[]; purchases:ForecastPurchase[]; installments:ForecastInstallment[]; rules:ForecastRule[]; statements:ForecastStatement[] };
const monthLabel=(key:string)=>new Date(key+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'short'});
const dateFor=(month:string,day:number)=>month+'-'+String(Math.min(Math.max(day,1),new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate())).padStart(2,'0');
function curve(points:{x:number;y:number}[]){return points.map((p,i)=>{if(!i)return 'M '+p.x+' '+p.y;const prev=points[i-1];const mid=(prev.x+p.x)/2;return 'C '+mid+' '+prev.y+', '+mid+' '+p.y+', '+p.x+' '+p.y}).join(' ')}
export function ForecastWave({accounts,cards,transactions,purchases,installments,rules,statements}:Props){
 const [active,setActive]=useState(0);
 const months=Array.from({length:6},(_,i)=>addMonths(currentMonth(),i));
 const today=new Date().toLocaleDateString('sv-SE');
 const values=months.map(month=>{
  let income=0,expense=0;
  for(const t of transactions){
   if(t.transaction_date.slice(0,7)!==month||t.payment_method==='credit'||t.status==='cancelled'||(['posted','paid'].includes(t.status)&&t.transaction_date<=today))continue;
   if(t.direction==='income')income+=t.amount_cents;else expense+=t.amount_cents;
  }
  for(const r of rules){
   if(!r.active||r.payment_method==='credit')continue;
   const date=dateFor(month,r.day_of_month);
   if(date<today||date<r.start_date||(r.end_date&&date>r.end_date))continue;
   if(transactions.some(t=>t.payment_method!=='credit'&&t.transaction_date===date&&t.description.trim().toLowerCase()===r.description.trim().toLowerCase()&&t.amount_cents===r.amount_cents&&t.direction===r.direction&&t.status!=='cancelled'))continue;
   if(r.direction==='income')income+=r.amount_cents;else expense+=r.amount_cents;
  }
  for(const card of cards){
   const saved=statements.find(s=>s.card_id===card.id&&s.statement_month.slice(0,7)===month);
   if(saved?.status==='paid')continue;
   const total=forecastForCard(card,month,purchases,installments,rules,statements).total;
   const paymentRecorded=total>0&&transactions.some(t=>t.payment_method!=='credit'&&t.direction==='expense'&&t.status!=='cancelled'&&t.transaction_date.slice(0,7)===month&&t.amount_cents===total&&isCardStatementPayment(t.description,card.name));
   if(!paymentRecorded)expense+=total;
  }
  return {month,income,expense};
 });
 const validBase=accounts.length>0&&accounts.every(a=>a.opening_balance_date&&a.opening_balance_date<=today);
 const accountIds=new Set(accounts.map(a=>a.id));
 const initialBalance=accounts.reduce((s,a)=>s+a.opening_balance_cents,0)+transactions.filter(t=>t.account_id&&accountIds.has(t.account_id)&&t.payment_method!=='credit'&&['posted','paid'].includes(t.status)&&t.transaction_date<=today&&accounts.some(a=>a.id===t.account_id&&t.transaction_date>a.opening_balance_date)).reduce((s,t)=>s+(t.direction==='income'?t.amount_cents:-t.amount_cents),0);
 let running=initialBalance;
 const balances=values.map(v=>{running+=v.income-v.expense;return running});
 const width=620,height=226,left=22,right=18,top=20,bottom=42;
 const allPoints=[0,...values.flatMap(v=>[v.income,v.expense]),...(validBase?balances:[])];
 const min=Math.min(0,...allPoints),max=Math.max(100,...allPoints);
 const padding=Math.max(100,(max-min)*.12);
 const lower=min-padding,upper=max+padding;
 const x=(i:number)=>left+i*(width-left-right)/5;
 const y=(v:number)=>top+(height-top-bottom)*(1-(v-lower)/(upper-lower));
 const revenue=values.map((v,i)=>({x:x(i),y:y(v.income)}));
 const spending=values.map((v,i)=>({x:x(i),y:y(v.expense)}));
 const balancePoints=balances.map((v,i)=>({x:x(i),y:y(v)}));
 const selected=values[active];
 return <section className="panel wave-panel" aria-label="Gráfico de previsão de receitas e despesas para seis meses">
  <div className="section-title wave-heading"><div><div className="eyebrow">Visão dos próximos 6 meses</div><h2>Entradas e saídas</h2></div><div className="info-help-actions"><span className="wave-live">Projeção dinâmica</span><InfoHelp title="Entenda o gráfico">Verde: receitas. Azul: gastos e cartões. Amarelo: saldo acumulado estimado. Toque em cada mês para consultar os valores. Movimentações não cadastradas não são estimadas, e o saldo não é uma consulta ao banco.</InfoHelp></div></div>
  <div className="wave-legend"><span><i className="wave-dot income-dot"/>Receitas</span><span><i className="wave-dot expense-dot"/>Gastos + cartões</span>{validBase&&<span className="wave-balance-key">● Saldo acumulado</span>}</div>
  <div className="wave-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Linhas de receitas em verde e despesas em azul, atualizadas conforme os lançamentos" preserveAspectRatio="xMidYMid meet">
   <defs><linearGradient id="incomeWaveFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity=".18"/><stop offset="100%" stopColor="#34d399" stopOpacity="0"/></linearGradient></defs>
   {[0,.5,1].map(t=><line key={t} x1={left} x2={width-right} y1={y(lower+(upper-lower)*t)} y2={y(lower+(upper-lower)*t)} stroke="#35435d" strokeDasharray="4 8" strokeWidth="1"/>)}
   <path d={curve(revenue)+` L ${x(5)} ${height-bottom} L ${x(0)} ${height-bottom} Z`} fill="url(#incomeWaveFill)"/>
   <path d={curve(revenue)} fill="none" stroke="#34d399" strokeWidth="3.5" strokeLinecap="round"/>
   <path d={curve(spending)} fill="none" stroke="#60a5fa" strokeWidth="3.5" strokeLinecap="round"/>
   {validBase&&<path d={curve(balancePoints)} fill="none" stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" strokeDasharray="7 5"/>}
   <line x1={x(active)} x2={x(active)} y1={top} y2={height-bottom} stroke="#ffffff" strokeOpacity=".25" strokeDasharray="3 6"/>
   {validBase&&balances.map((v,i)=><circle key={months[i]} cx={x(i)} cy={y(v)} r={i===active?5:3} fill="#fbbf24" stroke="#111b2e" strokeWidth="1.5"/>)}
   {values.map((v,i)=><g key={v.month}><circle cx={x(i)} cy={y(v.income)} r={i===active?6:3.5} fill="#34d399" stroke="#111b2e" strokeWidth="2"/><circle cx={x(i)} cy={y(v.expense)} r={i===active?6:3.5} fill="#60a5fa" stroke="#111b2e" strokeWidth="2"/><text x={x(i)} y={height-14} fill={i===active?'#f8fbff':'#9fb0cb'} textAnchor="middle" fontSize="16" fontWeight={i===active?700:500}>{monthLabel(v.month)}</text></g>)}
  </svg></div>
  <div className="wave-months" aria-label="Selecionar mês do gráfico">{values.map((v,i)=><button key={v.month} type="button" aria-pressed={active===i} className={active===i?'wave-month active':'wave-month'} onClick={()=>setActive(i)}>{monthLabel(v.month)}</button>)}</div>
  <div className="wave-summary"><div><small>Receitas · {monthLabel(selected.month)}</small><strong className="green">{money(selected.income)}</strong></div><div><small>Gastos · {monthLabel(selected.month)}</small><strong className="wave-blue">{money(selected.expense)}</strong></div></div>
  {validBase&&<div className="wave-overview"><span>Saldo acumulado estimado · {monthLabel(selected.month)}</span><strong className={balances[active]>=0?"green":"wave-negative"}>{money(balances[active])}</strong></div>}
  <div className="wave-result" aria-live="polite"><div><small>Resultado previsto · {monthLabel(selected.month)}</small><strong className={selected.income-selected.expense>=0?'green':'wave-negative'}>{selected.income-selected.expense>=0?'+ ':'− '}{money(Math.abs(selected.income-selected.expense))}</strong></div><small>{selected.income>=selected.expense?'Receitas previstas superiores aos gastos.':'Gastos previstos superiores às receitas.'}</small></div>
  <div className="wave-overview" aria-label="Resultado previsto dos próximos seis meses"><span>Resultado total dos 6 meses</span><strong className={values.reduce((sum,v)=>sum+v.income-v.expense,0)>=0?'green':'wave-negative'}>{values.reduce((sum,v)=>sum+v.income-v.expense,0)>=0?'+ ':'− '}{money(Math.abs(values.reduce((sum,v)=>sum+v.income-v.expense,0)))}</strong></div>
  
 </section>;
}
