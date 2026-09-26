import base from './vite.config';
import fs from 'node:fs';
import path from 'node:path';
export default {...base, plugins:[...base.plugins,{
 name:'local-acceptance-evidence',configureServer(server:any){
 server.middlewares.use('/__acceptance/report',(req:any,res:any,next:any)=>{
  if(req.method!=='POST'||req.headers.origin!=='http://127.0.0.1:5177')return next();
  let body='';req.on('data',(chunk:any)=>{body+=chunk;if(body.length>2000000)req.destroy();});
  req.on('end',()=>{try{const data=JSON.parse(body);if(!Array.isArray(data))throw Error();
   fs.mkdirSync(path.resolve('../evidence'),{recursive:true});fs.writeFileSync(path.resolve('../evidence/live-cases.json'),JSON.stringify(data,null,2));res.end('saved');
  }catch{res.statusCode=400;res.end('invalid');}});
 });}
}]};
