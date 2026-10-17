// FIXOKU 020C: LOCAL owner legal editing only. Source and revisions remain private.
// Production persistence must be moved to a versioned DB-backed repository before deploying.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const sourcePath=path.resolve(process.cwd(),'src/platform/admin/legal-owner-documents-v3.json');
const statePath=path.resolve(process.cwd(),'private/owner-legal-editor/revisions.json');
const sha=(s)=>crypto.createHash('sha256').update(String(s),'utf8').digest('hex');
const readState=()=>{
  try {const value=JSON.parse(fs.readFileSync(statePath,'utf8'));return value && typeof value==='object'&&!Array.isArray(value)?value:{documents:{}};}
  catch(e){if(e.code==='ENOENT')return {documents:{}};throw e;}
};
export function readOwnerLegalDocuments(){
  const base=JSON.parse(fs.readFileSync(sourcePath,'utf8'));
  const saved=readState().documents||{};
  return base.map(d=>{
    const v=saved[String(d.id)];
    if(!v)return {...d,revision:0,editable:true};
    return {...d,markdown:v.markdown,originalSha256:sha(v.markdown),revision:v.revision,updatedAt:v.updatedAt,updatedBy:v.updatedBy,editable:true};
  });
}
export function ownerLegalDocumentById(id){return readOwnerLegalDocuments().find(d=>d.id===Number(id))||null;}
export function saveOwnerLegalDocument({id,markdown,expectedSha256,actorId}){
  const docs=readOwnerLegalDocuments();const doc=docs.find(d=>d.id===id);
  if(!doc)throw Object.assign(new Error('DOCUMENT_NOT_FOUND'),{status:404});
  if(sha(doc.markdown)!==expectedSha256)throw Object.assign(new Error('DOCUMENT_CHANGED_REFRESH_FIRST'),{status:409});
  if(typeof markdown!=='string'||markdown.trim().length<100||markdown.length>100000)throw Object.assign(new Error('LEGAL_TEXT_LENGTH_INVALID'),{status:400});
  if(markdown===doc.markdown)return doc;
  const state=readState();if(!state.documents)state.documents={};
  const revision=Number(doc.revision||0)+1;
  const entry={markdown,revision,updatedBy:actorId,updatedAt:new Date().toISOString(),previousSha256:sha(doc.markdown),sha256:sha(markdown)};
  const current=state.documents[String(id)];
  const history=Array.isArray(current?.history)?current.history.slice():[];
  if(current){history.push({revision:current.revision,sha256:current.sha256,markdown:current.markdown,updatedAt:current.updatedAt,updatedBy:current.updatedBy});}
  else{history.push({revision:0,sha256:sha(doc.markdown),markdown:doc.markdown,updatedAt:null,updatedBy:null});}
  state.documents[String(id)]={...entry,history};
  fs.mkdirSync(path.dirname(statePath),{recursive:true});
  const tmp=statePath+'.'+crypto.randomUUID()+'.tmp';
  try{fs.writeFileSync(tmp,JSON.stringify(state,null,2),'utf8');fs.renameSync(tmp,statePath);}finally{try{fs.unlinkSync(tmp);}catch{}}
  return readOwnerLegalDocuments().find(d=>d.id===id);
}
