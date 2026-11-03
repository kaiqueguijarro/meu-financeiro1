import { addMonths, currentMonth, forecastForCard, money } from './forecast';
import type { ForecastCard, ForecastPurchase, ForecastInstallment, ForecastRule, ForecastStatement } from './forecast';

type Account={id:string;opening_balance_cents:number;opening_balance_date:string};
type Tx={id:string;description:string;amount_cents:number;direction:'income'|'expense';payment_method:string;transaction_date:string;status:string;account_id:string|null};
type Props={accounts:Account[];cards:ForecastCard[];transactions:Tx[];purchases:ForecastPurchase[];installments:ForecastInstallment[];rules:ForecastRule[];statements:ForecastStatement[]};
const dayInMonth=(month:string,day:number)=>month+'-'+String(Math.min(Math.max(1,day),new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate())).padStart(2,'0');
const normalize=(s:string)=>s.trim().toLocaleLowerCase('pt-BR').replace(/\\s+/g,' ');
export function BalanceProjection({accounts,cards,transactions,purchases,installments,rules,statements}:Props){
 const today=new Date().toLocaleDateString('sv-SE');
 const month=currentMonth();
 const end=dayInMonth(month,31);
 const accountIds=new Set(accounts.map(a=>a.id));
 // Snapshot balances are only meaningful from their recorded reference dates.
 const dated=accounts.length>0&&accounts.every(a=>Boolean(a.opening_balance_date)&&a.opening_balance_date<=today);
 const reference=accounts.reduce((sum,a)=>sum+a.opening_balance_cents,0);
 const posted=transactions.filter(t=>t.account_id&&accountIds.has(t.account_id)&&t.payment_method!=='credit'&&t.status!=='cancelled'&&['posted','paid'].includes(t.status)&&t.transaction_date<=today&&accounts.some(a=>a.id===t.account_id&&t.transaction_date>a.opening_balance_date));
 const postedNet=posted.reduce((sum,t)=>sum+(t.direction==='income'?t.amount_cents:-t.amount_cents),0);
 const available=reference+postedNet;
 const future=transactions.filter(t=>t.payment_method!=='credit'&&t.status!=='cancelled'&&t.transaction_date>today&&t.transaction_date<=end);
 const incomeTx=future.filter(t=>t.direction==='income').reduce((s,t)=>s+t.amount_cents,0);
 const expenseTx=future.filter(t=>t.direction==='expense').reduce((s,t)=>s+t.amount_cents,0);
 let incomeRules=0,expenseRules=0;
 for(const r of rules){
  if(!r.active||r.payment_method==='credit')continue;
  const date=dayInMonth(month,r.day_of_month);
  if(date<=today||date<r.start_date||(r.end_date&&date>r.end_date))continue;
  if(transactions.some(t=>t.status!=='cancelled'&&t.payment_method!=='credit'&&t.transaction_date===date&&t.direction===r.direction&&t.amount_cents===r.amount_cents&&normalize(t.description)===normalize(r.description)))continue;
  if(r.direction==='income')incomeRules+=r.amount_cents;else expenseRules+=r.amount_cents;
 }
 let cardExpenses=0;
 for(const card of cards){
  const saved=statements.find(s=>s.card_id===card.id&&s.statement_month.slice(0,7)===month);
  if(saved?.status==='paid')continue;
  const due=dayInMonth(month,card.due_day);
  if(due<=today)continue;
  const total=forecastForCard(card,month,purchases,installments,rules,statements).total;
  // A recorded checking-account payment may already cover the same statement.
  const hasPayment=transactions.some(t=>t.payment_method!=='credit'&&t.direction==='expense'&&t.status!=='cancelled'&&t.transaction_date.slice(0,7)===month&&t.amount_cents===total&&total>0&&/fatura|cart[aã]o/i.test(t.description));
  if(!hasPayment)cardExpenses+=total;
 }
 const incoming=incomeTx+incomeRules, outgoing=expenseTx+expenseRules+cardExpenses;
 const projected=available+incoming-outgoing;
 const trustworthy=dated&&accounts.length>0;
 return <section className="panel balance-projection" aria-label="Projeção de saldo até o fim do mês">
  <div className="section-title"><h2>Saldo projetado · fim do mês</h2><span className="projection-tag">Estimativa</span></div>
  {trustworthy?<><div className="projection-value">{money(projected)}</div><div className="projection-rows"><div><span>Saldo de referência ajustado</span><strong>{money(available)}</strong></div><div><span>Entradas futuras cadastradas</span><strong className="green">+ {money(incoming)}</strong></div><div><span>Pix, débito e contas futuras</span><strong>− {money(expenseTx+expenseRules)}</strong></div><div><span>Faturas a vencer</span><strong>− {money(cardExpenses)}</strong></div></div></>:<p className="forecast-footnote">Cadastre uma conta com saldo inicial e data-base válida para calcular a projeção.</p>}
  <p className="forecast-footnote">Estimativa até {new Date(end+'T12:00:00').toLocaleDateString('pt-BR')}. O saldo de referência considera movimentações realizadas após a data-base cadastrada. A projeção usa apenas valores registrados; pagamentos de faturas e recorrências precisam ser conferidos para evitar duplicidade. Não é saldo bancário confirmado.</p>
 </section>;
}
