import {useEffect,useRef,type ReactNode} from "react";
export function AssignmentModalR401({title,children,onClose,busy=false}:{title:string;children:ReactNode;onClose:()=>void;busy?:boolean}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=ref.current;if(d&&!d.open)d.showModal();return()=>{if(d?.open)d.close();};},[]);
 return <dialog ref={ref} className="r401-modal" aria-label={title} onCancel={e=>{e.preventDefault();if(!busy)onClose();}}><div className="r401-modal-heading"><h2>{title}</h2><button type="button" aria-label="Kapat" disabled={busy} onClick={onClose}>×</button></div>{children}</dialog>;
}
