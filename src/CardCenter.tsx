import { InfoHelp } from './InfoHelp';
import { useState } from 'react';
import { addMonths, cardClosingDate, cardStatementLabel, currentMonth, forecastForCard, money, shortCardName } from './forecast';
import type { ForecastCard, ForecastPurchase, ForecastInstallment, ForecastRule, ForecastStatement } from './forecast';
type Props={cards:ForecastCard[];purchases:ForecastPurchase[];installments:ForecastInstallment[];rules:ForecastRule[];statements:ForecastStatement[]};
const dateText=(value:string)=>new Date(value+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
const monthText=(value:string)=>new Date(value+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'short',year:'2-digit'});
const dateIn=(month:string,day:number)=>{const [y,m]=month.split('-').map(Number);return month+'-'+String(Math.min(day,new Date(y,m,0).getDate())).padStart(2,'0')};
export function CardCenter({cards,purchases,installments,rules,statements}:Props){
 const [selected,setSelected]=useState<string>('all');
 const today=new Date().toLocaleDateString('sv-SE');
 const activeCards=selected==='all'?cards:cards.filter(c=>c.id===selected);
 return <section className="panel card-center">
  <div className="section-title"><h2>Central de cartões</h2><div className="info-help-actions"><span className="forecast-subtitle">Próximas faturas</span><InfoHelp title="Sobre as faturas">O melhor dia é estimado com base no fechamento cadastrado. Valores futuros não são faturas oficialmente fechadas. Confira os valores com o banco.</InfoHelp></div></div>
  <div className="month-strip" aria-label="Selecionar cartão"><button type="button" className={selected==='all'?'month-choice active':'month-choice'} onClick={()=>setSelected('all')}>Todos</button>{cards.map(c=><button key={c.id} type="button" className={selected===c.id?'month-choice active':'month-choice'} onClick={()=>setSelected(c.id)}>{shortCardName(c.name)}</button>)}</div>
  {activeCards.map(card=>{
   const thisMonth=currentMonth();
   const closingThisMonth=dateIn(thisMonth,card.closing_day);
   const nextClosing=closingThisMonth>=today?closingThisMonth:dateIn(addMonths(thisMonth,1),card.closing_day);
   const bestDay=new Date(nextClosing+'T12:00:00');bestDay.setDate(bestDay.getDate()+1);
   const bestDate=bestDay.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'});
   const firstStatement=dateIn(thisMonth,card.due_day)>=today?thisMonth:addMonths(thisMonth,1);
   const upcoming=Array.from({length:4},(_,i)=>addMonths(firstStatement,i));
   const remaining=installments.filter(i=>i.status!=='cancelled'&&i.statement_month.slice(0,7)>=thisMonth&&purchases.some(p=>p.id===i.transaction_id&&p.card_id===card.id)).reduce((s,i)=>s+i.amount_cents,0);
   return <article className="card-center-item" key={card.id}>
    <div className="card-center-title"><strong>{shortCardName(card.name)}</strong><span>Melhor dia estimado: {bestDate}</span></div>
    <div className="card-center-dates"><div><small>Próximo fechamento</small><b>{dateText(nextClosing)}</b></div><div><small>Vencimento</small><b>Dia {card.due_day}</b></div><div><small>Parcelas futuras registradas</small><b>{money(remaining)}</b></div></div>
    <div className="card-center-months">{upcoming.map(month=>{const f=forecastForCard(card,month,purchases,installments,rules,statements);return <div key={month}><span>{monthText(month)}</span><strong>{money(f.total)}</strong><small>{cardStatementLabel(card,month,f.status,today)}</small><small>Fecha {dateText(cardClosingDate(card,month))}</small></div>})}</div>
   </article>;
  })}
  {!cards.length&&<p className="empty">Cadastre um cartão para visualizar os próximos vencimentos.</p>}
  
 </section>;
}
