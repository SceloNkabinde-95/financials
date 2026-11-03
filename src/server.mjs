import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compile, concepts } from './core.mjs';

const root = fileURLToPath(new URL('../',import.meta.url));
const publicDir=join(root,'public');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.csv':'text/csv; charset=utf-8','.json':'application/json; charset=utf-8'};
function send(res,code,body,type='application/json; charset=utf-8'){
  res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; connect-src 'self'; style-src 'self'; script-src 'self'"});res.end(body);
}
const server=createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    if(req.method==='GET'&&url.pathname==='/api/sample'){
      const csv=await readFile(join(root,'fixtures/sample-trial-balance.csv'),'utf8');
      const mappings=JSON.parse(await readFile(join(root,'fixtures/sample-mappings.json'),'utf8'));
      return send(res,200,JSON.stringify({csv,mappings,concepts}));
    }
    if(req.method==='POST'&&url.pathname==='/api/compile'){
      let body='',size=0;
      for await(const part of req){size+=part.length;if(size>2300000){return send(res,413,JSON.stringify({error:'Request too large'}));}body+=part.toString();}
      const payload=JSON.parse(body);return send(res,200,JSON.stringify(compile(payload)));
    }
    if(req.method!=='GET')return send(res,405,JSON.stringify({error:'Method not allowed'}));
    let path=decodeURIComponent(url.pathname);
    if(path==='/')path='/index.html';
    const target=normalize(join(publicDir,path));
    if(!target.startsWith(publicDir+'/'))return send(res,403,'Forbidden','text/plain');
    if(!Object.hasOwn(types,extname(target)))return send(res,404,'Not found','text/plain');
    return send(res,200,await readFile(target),types[extname(target)]);
  }catch(error){if(error.code==='ENOENT')return send(res,404,JSON.stringify({error:'Not found'}));return send(res,400,JSON.stringify({error:error.message||'Invalid request'}));}
});
const port=Number(process.env.PORT||3000);
server.listen(port,'127.0.0.1',()=>console.log('Financials research demo: http://localhost:'+port));
