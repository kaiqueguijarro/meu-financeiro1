import { useState } from 'react';
import type { ReactNode } from 'react';
import { CircleHelp, AlertCircle, X } from 'lucide-react';
type Props={title:string;children:ReactNode;warning?:boolean};
export function InfoHelp({title,children,warning=false}:Props){
 const [open,setOpen]=useState(false);
 return <span className="info-help">
  <button type="button" className={'info-help-trigger'+(warning?' is-warning':'')} aria-label={'Entenda: '+title} aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}>{warning?<AlertCircle size={17}/>:<CircleHelp size={17}/>}</button>
  {open&&<div className="info-help-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
   <section className="info-help-dialog" role="dialog" aria-modal="true" aria-label={title} onKeyDown={e=>{if(e.key==='Escape')setOpen(false)}}>
    <div className="info-help-header"><h3>{title}</h3><button type="button" aria-label="Fechar explicação" onClick={()=>setOpen(false)}><X size={20}/></button></div>
    <div className="info-help-content">{children}</div>
    <button type="button" className="info-help-done" onClick={()=>setOpen(false)}>Entendi</button>
   </section>
  </div>}
 </span>;
}
