const byId=id=>document.getElementById(id);
let csv='',concepts=[],mappings={},accounts=[];
function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
function setStatus(message,error=false){byId('status').textContent=message;byId('status').className=error?'error':'muted';}
function parsePreview(text){const lines=text.replace(/\r/g,'').trim().split('\n');return lines.slice(1).filter(Boolean).map(l=>{const cols=l.split(',');return {code:cols[0],name:cols[1]};});}
function renderMappings(){
 const area=byId('mapping-area');area.replaceChildren();accounts=parsePreview(csv);
 for(const acc of accounts){
   const wrap=el('div',undefined,'mapping-row');
   const label=el('div',undefined,'mapping-label');label.append(el('strong',acc.code),el('span',acc.name));
   const select=el('select');select.setAttribute('aria-label','Mapping for '+acc.code);
   select.append(new Option('Choose a category',''));
   for(const [id,name] of concepts)select.append(new Option(name,id));
   select.value=mappings[acc.code]||'';
   select.addEventListener('change',()=>{mappings[acc.code]=select.value;});
   wrap.append(label,select);area.append(wrap);
 }
 byId('import-status').textContent=accounts.length+' source rows detected. Review categories before generating.';
 byId('compile').disabled=!accounts.length;
}
byId('sample').addEventListener('click',async()=>{
 try{setStatus('Loading sample…');const r=await fetch('/api/sample');const data=await r.json();
 csv=data.csv;mappings=data.mappings;concepts=data.concepts;renderMappings();setStatus('Synthetic sample loaded.');}
 catch(err){setStatus(err.message,true);}
});
byId('file').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 if(!file.name.toLowerCase().endsWith('.csv')||file.size>2000000){setStatus('Only CSV files up to 2 MB are available in this demo.',true);return;}
 csv=await file.text();if(!concepts.length){const data=await(await fetch('/api/sample')).json();concepts=data.concepts;}
 mappings={};renderMappings();setStatus('CSV loaded for review.');
});
byId('compile').addEventListener('click',async()=>{
 setStatus('Compiling…');byId('results').replaceChildren();
 try{
 const result=await fetch('/api/compile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({csv,mappings,entityName:byId('entity').value,framework:byId('framework').value})});
 const data=await result.json();if(!result.ok)throw new Error(data.error||'Compilation failed');renderResult(data);setStatus('Illustrative draft generated.');
 }catch(err){setStatus(err.message,true);byId('results').append(el('p',err.message,'error'));}
});
function renderResult(data){
 const out=byId('results');out.replaceChildren();
 out.append(el('h3',data.entityName),el('p',data.framework+' · Draft only','muted'));
 const checks=el('div',undefined,'checks');for(const c of data.checks)checks.append(el('span','✓ '+c.name,'check'));out.append(checks);
 for(const section of data.statements){
   const block=el('section',undefined,'statement');block.append(el('h3',section.title));
   const table=el('table');const body=el('tbody');
   for(const line of section.rows){const tr=el('tr');const a=el('td',line.label);const b=el('td','R '+Number(line.amount).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2}));
      const detail=el('details');detail.append(el('summary','Source accounts ('+line.sources.length+')'));
      detail.append(el('p',line.sources.map(x=>x.code+' — '+x.name+' (CSV row '+x.row+')').join(' · ')||'Derived from preceding totals','source-text'));
      a.append(detail);tr.append(a,b);body.append(tr);}
   table.append(body);block.append(table);out.append(block);
 }
 const incomplete=el('div',undefined,'incomplete');incomplete.append(el('h3','Still required before statutory financial statements'));
 for(const item of data.incomplete)incomplete.append(el('p','• '+item));out.append(incomplete);
 out.append(el('p','Source fingerprint: '+data.sourceHash.slice(0,20)+'…','hash'));
 const download=el('button','Export draft JSON','secondary');download.addEventListener('click',()=>{
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download='financials-research-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });out.append(download);
}
