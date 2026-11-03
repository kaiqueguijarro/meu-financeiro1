import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ArrowDownLeft, ArrowUpRight, CreditCard, Landmark, LogOut, Plus, Wallet } from 'lucide-react';
import { configured, supabase } from './supabase';
import { CashFlow } from './CashFlow';
import { addMonths, currentMonth, forecastForCard, money as forecastMoney } from './forecast';
import type { ForecastPurchase, ForecastInstallment, ForecastRule } from './forecast';

type Account = { id:string; name:string; opening_balance_cents:number; opening_balance_date:string };
type Card = { id:string; name:string; closing_day:number; due_day:number };
type Tx = { id:string; description:string; amount_cents:number; direction:'income'|'expense'; payment_method:string; transaction_date:string; status:string; account_id:string|null; card_id:string|null };
type Statement = { id:string; card_id:string; statement_month:string; confirmed_total_cents:number|null; status:string };
const money=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n/100);
const today=()=>new Date().toLocaleDateString('en-CA');
const month=()=>new Date().toISOString().slice(0,7)+'-01';
const methodLabels:Record<string,string>={pix:'Pix',debit:'Débito',cash:'Dinheiro',credit:'Crédito',transfer:'Transferência'};

export function App(){
 const [session,setSession]=useState<Session|null>(null),[ready,setReady]=useState(false);
 const [email,setEmail]=useState(''),[linkSent,setLinkSent]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const [accounts,setAccounts]=useState<Account[]>([]),[cards,setCards]=useState<Card[]>([]),[txs,setTxs]=useState<Tx[]>([]),[statements,setStatements]=useState<Statement[]>([]);
 const [purchases,setPurchases]=useState<ForecastPurchase[]>([]),[installments,setInstallments]=useState<ForecastInstallment[]>([]),[rules,setRules]=useState<ForecastRule[]>([]);
 const [forecastMonth,setForecastMonth]=useState(currentMonth());
 const [tab,setTab]=useState<'home'|'forecast'|'cards'|'account'|'manage'>('home');
 const [installmentCount,setInstallmentCount]=useState(1),[isRecurring,setIsRecurring]=useState(false);
 const [showForm,setShowForm]=useState(false),[description,setDescription]=useState(''),[amount,setAmount]=useState(''),[date,setDate]=useState(today()),[direction,setDirection]=useState<'expense'|'income'>('expense'),[method,setMethod]=useState('pix'),[accountId,setAccountId]=useState(''),[cardId,setCardId]=useState('');
 useEffect(()=>{if(!supabase){setReady(true);return;}const client=supabase;client.auth.getSession().then(({data})=>{setSession(data.session);setReady(true)});const {data:{subscription}}=client.auth.onAuthStateChange((_event,s)=>setSession(s));return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{if(session)void load();else{setAccounts([]);setCards([]);setTxs([]);setStatements([]);setPurchases([]);setInstallments([]);setRules([])}},[session]);
 async function load(){if(!supabase)return;const [a,c,t,s,i,r,p]=await Promise.all([supabase.from('accounts').select('*').order('created_at'),supabase.from('cards').select('*').order('created_at'),supabase.from('transactions').select('*').order('transaction_date',{ascending:false}).limit(100),supabase.from('statements').select('*').order('statement_month',{ascending:false}),supabase.from('installments').select('*').limit(5000),supabase.from('recurring_rules').select('*').limit(1000),supabase.from('transactions').select('id,description,card_id,transaction_date,amount_cents,installments').eq('payment_method','credit').eq('direction','expense').neq('status','cancelled').limit(5000)]);if(a.error||c.error||t.error||s.error||i.error||r.error||p.error){setMessage([a.error,c.error,t.error,s.error,i.error,r.error,p.error].filter(Boolean).map(e=>e!.message).join(' | '));return;}setAccounts(a.data||[]);setCards(c.data||[]);setTxs(t.data||[]);setStatements(s.data||[]);setInstallments(i.data||[]);setRules(r.data||[]);setPurchases((p.data||[]) as ForecastPurchase[])}
 async function sendMagicLink(){
  if(!supabase||busy)return;
  const address=email.trim().toLowerCase();
  if(!address){setMessage('Informe seu e-mail.');return;}
  setBusy(true);setMessage('');
  try {
   const redirectTo=window.location.origin+window.location.pathname;
   const {error}=await supabase.auth.signInWithOtp({email:address,options:{shouldCreateUser:true,emailRedirectTo:redirectTo}});
   if(error)throw error;
   setEmail(address);setLinkSent(true);
   setMessage('Confira seu e-mail e toque em Sign in para entrar. Se não encontrar, verifique o spam.');
  }catch(error){setMessage(error instanceof Error?error.message:'Não foi possível enviar o link.');}
  finally{setBusy(false);}
 }
 async function addAccount(){if(!supabase||!session)return;const name=prompt('Nome da conta (ex.: Conta Itaú)');if(!name)return;const balance=prompt('Saldo inicial em reais (ex.: 1525,61)','0');if(balance===null)return;const cents=parseAmount(balance);if(cents===null){setMessage('Saldo inválido');return;}const {error}=await supabase.from('accounts').insert({user_id:session.user.id,name,kind:'checking',opening_balance_cents:cents,opening_balance_date:today()});if(error)setMessage(error.message);else void load()}
 async function addCard(){if(!supabase||!session)return;const name=prompt('Nome do cartão');if(!name)return;const {error}=await supabase.from('cards').insert({user_id:session.user.id,name,closing_day:24,due_day:1});if(error)setMessage(error.message);else void load()}
 async function saveTx(e:React.FormEvent){
  e.preventDefault();if(!supabase||!session)return;
  const cents=parseAmount(amount);
  if(cents===null||cents<=0){setMessage('Informe um valor positivo válido.');return;}
  if(method==='credit'&&!cardId){setMessage('Selecione um cartão.');return;}
  if(method!=='credit'&&!accountId){setMessage('Selecione uma conta.');return;}
  if(isRecurring&&Number(date.slice(8,10))>28){setMessage('Para recorrências, selecione um dia entre 1 e 28.');return;}
  if(isRecurring&&installmentCount!==1){setMessage('Escolha recorrência ou parcelamento, não ambos.');return;}
  if(!Number.isInteger(installmentCount)||installmentCount<1||installmentCount>120){setMessage('Quantidade de parcelas inválida.');return;}
  setBusy(true);setMessage('');
  const common={user_id:session.user.id,description,amount_cents:cents,direction,payment_method:method,account_id:method==='credit'?null:accountId,card_id:method==='credit'?cardId:null};
  const result=isRecurring
   ?await supabase.from('recurring_rules').insert({...common,day_of_month:Number(date.slice(8,10)),start_date:date,active:true})
   :await supabase.from('transactions').insert({...common,transaction_date:date,status:'posted',installments:method==='credit'?installmentCount:1});
  setBusy(false);
  if(result.error){setMessage(result.error.message);return;}
  setShowForm(false);setDescription('');setAmount('');setInstallmentCount(1);setIsRecurring(false);
  setMessage(isRecurring?'Recorrência cadastrada.':'Lançamento salvo.');void load();
 }
 const balance=accounts.reduce((sum,a)=>sum+a.opening_balance_cents,0)+txs.filter(t=>t.status!=='cancelled'&&t.status!=='planned'&&t.payment_method!=='credit').reduce((sum,t)=>sum+(t.direction==='income'?t.amount_cents:-t.amount_cents),0);
 const selectedMonth=month();const billed=statements.filter(s=>s.statement_month===selectedMonth).reduce((sum,s)=>sum+(s.confirmed_total_cents||0),0);
 if(!ready)return <main className="center">Carregando...</main>;
 if(!configured)return <main className="center"><section className="panel"><h1>Meu Financeiro</h1><p>O aplicativo está pronto para conectar ao Supabase.</p><p>Configure as variáveis <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> no ambiente de hospedagem.</p><small>Nunca use a chave service_role no navegador.</small></section></main>;
 if(!session)return <main className="center"><section className="panel auth"><div className="logo"><Wallet size={27}/></div><h1>Meu Financeiro</h1><p>Entre com segurança usando um link enviado ao seu e-mail. Você não precisa criar uma senha.</p><form onSubmit={e=>{e.preventDefault();void sendMagicLink()}}><label>E-mail<input type="email" autoComplete="email" required disabled={busy} value={email} onChange={e=>{setEmail(e.target.value);setLinkSent(false)}} placeholder="seu@email.com"/></label><button disabled={busy} type="submit">{busy?'Enviando...':linkSent?'Reenviar link de acesso':'Enviar link de acesso'}</button></form>{linkSent&&<p className="notice">Abra o e-mail no mesmo iPhone e toque em <b>Sign in</b>. O link retornará para este aplicativo.</p>}{message&&<p role="status" className="notice">{message}</p>}<small>Nunca compartilhe links de acesso. Se o link não abrir o aplicativo, verifique os endereços de redirecionamento no Supabase.</small></section></main>;
 return <main className="app"><header><div><div className="eyebrow">PAINEL FINANCEIRO</div><h1>Meu Financeiro</h1></div><button className="iconbutton" title="Sair" onClick={()=>void supabase?.auth.signOut()}><LogOut size={19}/></button></header>
 <nav aria-label="Navegação principal" style={{display:'flex',gap:6,overflowX:'auto',padding:'8px 0 14px'}}>{([{id:'home',label:'Início'},{id:'forecast',label:'Previsão'},{id:'cards',label:'Cartões'},{id:'account',label:'Conta'},{id:'manage',label:'Gestão'}] as const).map(t=><button key={t.id} type="button" aria-current={tab===t.id?'page':undefined} onClick={()=>setTab(t.id)} className={tab===t.id?'month-choice active':'month-choice'} style={{flexShrink:0}}>{t.label}</button>)}</nav>
 {tab==='home'&&<><section className="balance"><div className="eyebrow">Saldo estimado das contas</div><strong>{money(balance)}</strong><p>Baseado nos saldos iniciais e lançamentos registrados.</p><div className="balance-bottom"><span><Landmark size={17}/> {accounts.length} conta(s)</span><span><CreditCard size={17}/> {cards.length} cartão(ões)</span></div></section>
 <div className="stats"><div className="panel"><div className="eyebrow">Faturas confirmadas · mês atual</div><strong>{money(billed)}</strong></div><div className="panel"><div className="eyebrow">Lançamentos registrados</div><strong>{txs.length}</strong></div></div>
 </>}
 {tab==='forecast'&&<CashFlow accounts={accounts} cards={cards} transactions={txs} purchases={purchases} installments={installments} rules={rules} statements={statements}/>}
 {tab==='account'&&<><section className="panel"><div className="section-title"><h2>Contas</h2><button className="textbutton" onClick={()=>void addAccount()}><Plus size={16}/> Adicionar</button></div>{accounts.length?accounts.map(a=><div className="item" key={a.id}><div className="avatar"><Landmark size={18}/></div><div className="item-main"><b>{a.name}</b><small>Saldo inicial {money(a.opening_balance_cents)}</small></div></div>):<p className="empty">Cadastre sua primeira conta para começar.</p>}</section>
 </>}
 {tab==='manage'&&<section className="panel"><div className="section-title"><h2>Cartões</h2><button className="textbutton" onClick={()=>void addCard()}><Plus size={16}/> Adicionar</button></div>{cards.length?cards.map(c=><div className="item" key={c.id}><div className="avatar"><CreditCard size={18}/></div><div className="item-main"><b>{c.name}</b><small>Fecha dia {c.closing_day} · Vence dia {c.due_day}</small></div></div>):<p className="empty">Cadastre seus cartões para acompanhar as faturas.</p>}</section>
 {tab==='cards'&&<section className="panel forecast-panel"><div className="section-title"><h2>Previsão das faturas</h2><span className="forecast-subtitle">Parcelas + recorrências</span></div>
 <div className="month-strip">{Array.from({length:12},(_,i)=>addMonths(currentMonth(),i)).map(m=><button key={m} type="button" className={forecastMonth===m?'month-choice active':'month-choice'} onClick={()=>setForecastMonth(m)}>{new Date(m+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'short',year:'2-digit'})}</button>)}</div>
 <div className="forecast-total"><small>Comprometido em {new Date(forecastMonth+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</small><strong>{forecastMoney(cards.reduce((sum,c)=>sum+forecastForCard(c,forecastMonth,purchases,installments,rules,statements).total,0))}</strong></div>
 {cards.length?cards.map(c=>{const f=forecastForCard(c,forecastMonth,purchases,installments,rules,statements);return <div className="forecast-card" key={c.id}><div className="forecast-card-head"><div><b>{c.name}</b><small>Fecha {c.closing_day} · Vence {c.due_day}</small></div><strong>{forecastMoney(f.total)}</strong></div>{f.confirmed&&<p className="confirmed-note">Fatura confirmada — detalhamento abaixo pode não incluir todas as compras</p>}{f.lines.length?f.lines.map(l=><div className="forecast-line" key={l.id}><span>{l.label} {l.detail&&<small>({l.detail})</small>} {l.kind==='recurring'&&<small>· Recorrente</small>}</span><b>{forecastMoney(l.amount_cents)}</b></div>):<p className="empty">Nenhuma parcela ou recorrência cadastrada para este mês.</p>}</div>}):<p className="empty">Cadastre os cartões para visualizar as previsões.</p>}
 <p className="forecast-footnote">Previsões calculadas a partir dos lançamentos, parcelas e regras recorrentes cadastrados no Supabase. Não incluem compras futuras ainda desconhecidas. Faturas confirmadas prevalecem sobre estimativas.</p></section>
 {tab==='account'&&<section className="panel"><div className="section-title"><h2>Últimos lançamentos</h2><button className="textbutton" onClick={()=>setShowForm(true)}><Plus size={16}/> Novo</button></div>{txs.length?txs.slice(0,12).map(t=><div className="item" key={t.id}><div className={'avatar '+(t.direction==='income'?'positive':'')} >{t.direction==='income'?<ArrowDownLeft size={18}/>:<ArrowUpRight size={18}/>}</div><div className="item-main"><b>{t.description}</b><small>{new Date(t.transaction_date+'T12:00:00').toLocaleDateString('pt-BR')} · {methodLabels[t.payment_method]||t.payment_method}</small></div><strong className={t.direction==='income'?'green':''}>{t.direction==='income'?'+':'−'} {money(t.amount_cents)}</strong></div>):<p className="empty">Ainda não há lançamentos.</p>}</section>
 {message&&<p className="notice" role="status">{message}</p>}
 <button className="floating" onClick={()=>setShowForm(true)}><Plus size={20}/> Novo lançamento</button>
 {showForm&&<div className="overlay"><form className="panel modal" onSubmit={e=>void saveTx(e)}><div className="section-title"><h2>Novo lançamento</h2><button type="button" className="textbutton" onClick={()=>setShowForm(false)}>Fechar</button></div><label>Descrição<input required value={description} onChange={e=>setDescription(e.target.value)} placeholder="Ex.: Mercado"/></label><label>Valor (R$)<input required inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0,00"/></label><label>Data<input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></label><label>Tipo<select value={direction} onChange={e=>{const d=e.target.value as 'income'|'expense';setDirection(d);if(d==='income'&&method==='credit')setMethod('pix')}}><option value="expense">Despesa</option><option value="income">Receita</option></select></label><label>Pagamento<select value={method} onChange={e=>setMethod(e.target.value)}><option value="pix">Pix</option><option value="debit">Débito</option><option value="cash">Dinheiro</option><option value="transfer">Transferência</option>{direction==='expense'&&<option value="credit">Cartão de crédito</option>}</select></label>{method==='credit'&&<label>Quantidade de parcelas<input type="number" min="1" max="120" step="1" disabled={isRecurring} value={installmentCount} onChange={e=>setInstallmentCount(Number(e.target.value))}/><small>Informe o valor total da compra; a previsão dividirá pelas parcelas.</small></label>}<label className="recurring-toggle"><input type="checkbox" checked={isRecurring} onChange={e=>{setIsRecurring(e.target.checked);if(e.target.checked)setInstallmentCount(1)}}/> Repetir todos os meses</label>{method==='credit'?<label>Cartão<select required value={cardId} onChange={e=>setCardId(e.target.value)}><option value="">Selecione</option>{cards.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>:<label>Conta<select required value={accountId} onChange={e=>setAccountId(e.target.value)}><option value="">Selecione</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}<button disabled={busy} type="submit">Salvar lançamento</button></form></div>}
 </main>
}
function parseAmount(value:string){const normalized=value.trim().replace(/\s/g,'').replace(/^R\$/,'');if(!normalized)return null;const decimal=normalized.includes(',')?normalized.replace(/\./g,'').replace(',','.'):normalized;const n=Number(decimal);return Number.isFinite(n)?Math.round(n*100):null}
