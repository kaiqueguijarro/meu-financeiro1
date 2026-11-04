import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp, AlertCircle, X } from 'lucide-react';

type Props={title:string;children:ReactNode;warning?:boolean};
export function InfoHelp({title,children,warning=false}:Props){
 const [open,setOpen]=useState(false);
 const trigger=useRef<HTMLButtonElement>(null);
 const close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  if(!open)return;
  close.current?.focus();
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};
  document.addEventListener('keydown',key);
  return ()=>{document.removeEventListener('keydown',key);trigger.current?.focus()};
 },[open]);
 return <>
  <button ref={trigger} type="button" className={'info-help-trigger'+(warning?' is-warning':'')} aria-label={'Entenda: '+title} aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}>{warning?<AlertCircle size={17}/>:<CircleHelp size={17}/>}</button>
  {open&&createPortal(<div className="info-help-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
   <section className="info-help-dialog" role="dialog" aria-modal="true" aria-label={title}>
    <div className="info-help-header"><h3>{title}</h3><button ref={close} type="button" aria-label="Fechar explicação" onClick={()=>setOpen(false)}><X size={20}/></button></div>
    <div className="info-help-content">{children}</div>
    <button type="button" className="info-help-done" onClick={()=>setOpen(false)}>Entendi</button>
   </section>
  </div>,document.body)}
 </>;
}
