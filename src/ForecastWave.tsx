import { useState } from 'react';
import { addMonths, currentMonth, forecastForCard, money } from './forecast';
import type { ForecastCard, ForecastPurchase, ForecastInstallment, ForecastRule, ForecastStatement } from './forecast';

type Transaction = { id:string; amount_cents:number; direction:'income'|'expense'; payment_method:string; transaction_date:string; status:string };
type Props = { cards:ForecastCard[]; transactions:Transaction[]; purchases:ForecastPurchase[]; installments:ForecastInstallment[]; rules:ForecastRule[]; statements:ForecastStatement[] };
const monthLabel=(key:string)=>new Date(key+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'short'});
const dateFor=(month:string,day:number)=>month+'-'+String(Math.min(Math.max(day,1),new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate())).padStart(2,'0');
function curve(points:{x:number;y:number}[]){return points.map((p,i)=>{if(!i)return 'M '+p.x+' '+p.y;const prev=points[i-1];const mid=(prev.x+p.x)/2;return 'C '+mid+' '+prev.y+', '+mid+' '+p.y+', '+p.x+' '+p.y}).join(' ')}
export function ForecastWave({cards,transactions,purchases,installments,rules,statements}:Props){
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
   if(transactions.some(t=>t.payment_method!=='credit'&&t.transaction_date===date&&t.amount_cents===r.amount_cents&&t.direction===r.direction&&t.status!=='cancelled'))continue;
   if(r.direction==='income')income+=r.amount_cents;else expense+=r.amount_cents;
  }
  for(const card of cards){
   const saved=statements.find(s=>s.card_id===card.id&&s.statement_month.slice(0,7)===month);
   if(saved?.status==='paid')continue;
   expense+=forecastForCard(card,month,purchases,installments,rules,statements).total;
  }
  return {month,income,expense};
 });
 const width=620,height=226,left=22,right=18,top=20,bottom=42;
 const max=Math.max(100,...values.flatMap(v=>[v.income,v.expense]))*1.15;
 const x=(i:number)=>left+i*(width-left-right)/5;
 const y=(v:number)=>top+(height-top-bottom)*(1-v/max);
 const revenue=values.map((v,i)=>({x:x(i),y:y(v.income)}));
 const spending=values.map((v,i)=>({x:x(i),y:y(v.expense)}));
 const selected=values[active];
 return <section className="panel wave-panel" aria-label="Gráfico de previsão de receitas e despesas para seis meses">
  <div className="section-title wave-heading"><div><div className="eyebrow">Visão dos próximos 6 meses</div><h2>Entradas e saídas</h2></div><span className="wave-live">Projeção dinâmica</span></div>
  <div className="wave-legend"><span><i className="wave-dot income-dot"/>Receitas</span><span><i className="wave-dot expense-dot"/>Gastos + cartões</span></div>
  <div className="wave-chart"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Linhas de receitas em verde e despesas em azul, atualizadas conforme os lançamentos" preserveAspectRatio="xMidYMid meet">
   <defs><linearGradient id="incomeWaveFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#34d399" stopOpacity=".18"/><stop offset="100%" stopColor="#34d399" stopOpacity="0"/></linearGradient></defs>
   {[0,.5,1].map(t=><line key={t} x1={left} x2={width-right} y1={y(max*t)} y2={y(max*t)} stroke="#35435d" strokeDasharray="4 8" strokeWidth="1"/>)}
   <path d={curve(revenue)+` L ${x(5)} ${height-bottom} L ${x(0)} ${height-bottom} Z`} fill="url(#incomeWaveFill)"/>
   <path d={curve(revenue)} fill="none" stroke="#34d399" strokeWidth="3.5" strokeLinecap="round"/>
   <path d={curve(spending)} fill="none" stroke="#60a5fa" strokeWidth="3.5" strokeLinecap="round"/>
   <line x1={x(active)} x2={x(active)} y1={top} y2={height-bottom} stroke="#ffffff" strokeOpacity=".25" strokeDasharray="3 6"/>
   {values.map((v,i)=><g key={v.month}><circle cx={x(i)} cy={y(v.income)} r={i===active?6:3.5} fill="#34d399" stroke="#111b2e" strokeWidth="2"/><circle cx={x(i)} cy={y(v.expense)} r={i===active?6:3.5} fill="#60a5fa" stroke="#111b2e" strokeWidth="2"/><text x={x(i)} y={height-14} fill={i===active?'#f8fbff':'#9fb0cb'} textAnchor="middle" fontSize="16" fontWeight={i===active?700:500}>{monthLabel(v.month)}</text></g>)}
  </svg></div>
  <div className="wave-months" aria-label="Selecionar mês do gráfico">{values.map((v,i)=><button key={v.month} type="button" aria-pressed={active===i} className={active===i?'wave-month active':'wave-month'} onClick={()=>setActive(i)}>{monthLabel(v.month)}</button>)}</div>
  <div className="wave-summary"><div><small>Receitas · {monthLabel(selected.month)}</small><strong className="green">{money(selected.income)}</strong></div><div><small>Gastos · {monthLabel(selected.month)}</small><strong className="wave-blue">{money(selected.expense)}</strong></div></div>
  <p className="forecast-footnote">Projeção com registros futuros, recorrências e faturas. Lançamentos já realizados não entram novamente no fluxo previsto; valores não cadastrados não são estimados.</p>
 </section>;
}
