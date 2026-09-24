const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const dns = require('node:dns').promises;
const crypto = require('node:crypto');

const host = process.env.HOST || '0.0.0.0';
const port = Number(process.env.PORT || 8080);
const root = __dirname;
const pages = ['claude', 'gpt', 'ip', 'link', 'dns', 'webrtc', 'cloudflare', 'ping', 'status', 'whois'];
const files = { '/': ['index.html', 'text/html; charset=utf-8'], '/index.html': ['index.html', 'text/html; charset=utf-8'], '/styles.css': ['styles.css', 'text/css; charset=utf-8'], '/app.js': ['app.js', 'application/javascript; charset=utf-8'], '/pages.js': ['pages.js', 'application/javascript; charset=utf-8'] };
pages.forEach((page) => { files['/' + page + '/'] = [page + '.html', 'text/html; charset=utf-8']; });
const cache = new Map();
const probeNodes = (() => { try { return JSON.parse(process.env.PING_PROBES || '[]'); } catch { return []; } })();
const dnsZone = (process.env.DNS_ZONE || '').toLowerCase().replace(/\.$/, '');
const dnsLog = process.env.DNS_LOG_FILE || '/tmp/netscope-dns.json';
function readDns(){try{return JSON.parse(fs.readFileSync(dnsLog,'utf8'))}catch{return {}}}

function headers(type) { return { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' }; }
function json(response, status, body) { response.writeHead(status, headers('application/json; charset=utf-8')); response.end(JSON.stringify(body)); }
function validIp(value) { return /^[0-9a-fA-F:.]+$/.test(value) && value.length <= 45; }
function validDomain(value) { return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(value); }
function publicAddress(address) { return address && !(/^(127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address) || address === '::1' || address.startsWith('fc') || address.startsWith('fe80:')); }
function requestJsonWithHeaders(url, extraHeaders = {}, timeout = 7000) { return new Promise((resolve,reject)=>{ const req=https.get(url,{headers:{'User-Agent':'NetScope/1.0',...extraHeaders},timeout},res=>{ let body=''; res.setEncoding('utf8'); res.on('data',c=>body+=c); res.on('end',()=>{ if(res.statusCode<200||res.statusCode>=300)return reject(Error('Probe returned '+res.statusCode)); try{resolve(JSON.parse(body))}catch{reject(Error('Invalid probe JSON'))} })}); req.on('timeout',()=>req.destroy(Error('Timed out'))); req.on('error',reject) }) }
function requestJson(url, timeout = 7000) { return new Promise((resolve, reject) => { const req = https.get(url, { headers: { 'User-Agent': 'NetScope/1.0' }, timeout }, (res) => { let body = ''; res.setEncoding('utf8'); res.on('data', (chunk) => body += chunk); res.on('end', () => { if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) { req.destroy(); return requestJson(new URL(res.headers.location, url).toString(), timeout).then(resolve, reject); } if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error('Upstream returned ' + res.statusCode)); try { resolve(JSON.parse(body)); } catch { reject(new Error('Invalid upstream JSON')); } }); }); req.on('timeout', () => req.destroy(new Error('Timed out'))); req.on('error', reject); }); }
async function geo(ip) { const key = 'geo:' + ip; const hit = cache.get(key); if (hit && hit.until > Date.now()) return hit.value; const data = await requestJson('https://ipwho.is/' + encodeURIComponent(ip)); if (!data.success) throw new Error(data.message || 'Geo lookup failed'); const value = { ip, country: data.country || '', countryCode: data.country_code || '', region: data.region || '', city: data.city || '', isp: data.connection?.isp || '', org: data.connection?.org || '', asn: data.connection?.asn || '', latitude: data.latitude, longitude: data.longitude, type: data.type || '' }; cache.set(key, { value, until: Date.now() + 3600000 }); return value; }
function riskScore(info) { const text = (info.isp + ' ' + info.org).toLowerCase(); const signals = []; const hosting = /(amazon|google|microsoft|digitalocean|oracle|vultr|linode|cloud|hosting|datacenter|leaseweb|ovh|hetzner)/.test(text); let score = 82; if (hosting) { score -= 27; signals.push('组织名称匹配公开云/机房特征'); } else { signals.push('未匹配公开云/机房关键词'); } if (!info.asn) { score -= 8; signals.push('ASN 数据缺失'); } else { signals.push('已获取 ASN 数据'); } if (!info.countryCode) { score -= 5; signals.push('国家地区数据缺失'); } return { score: Math.max(0, score), level: score >= 75 ? '较好' : score >= 50 ? '中等风险' : '较高风险', companyType: hosting ? 'hosting' : 'isp', isDatacenter: hosting, signals, checks: { vpn: '未接入情报源', proxy: '未接入情报源', tor: '未接入情报源', crawler: '未接入情报源' } }; }
async function rdap(query) { const normalized = query.replace(/^AS/i, ''); let resource; if (/^\d+$/.test(normalized)) resource = 'autnum/' + normalized; else if (validIp(query)) resource = 'ip/' + encodeURIComponent(query); else if (validDomain(query)) resource = 'domain/' + encodeURIComponent(query.toLowerCase()); else throw new Error('请输入有效域名、IP 或 ASN'); const data = await requestJson('https://rdap.org/' + resource); return { query, raw: data, handle: data.handle || '', name: data.name || data.ldhName || data.unicodeName || '', type: /^\d+$/.test(normalized) ? 'asn' : validIp(query) ? 'ip' : 'domain', status: data.status || [], entities: (data.entities || []).map((e) => e.handle).filter(Boolean), events: data.events || [], nameservers: (data.nameservers || []).map((n) => n.ldhName).filter(Boolean), startAddress: data.startAddress, endAddress: data.endAddress, country: data.country || '' }; }
async function safeProbe(target) { if (!validDomain(target)) throw new Error('目标格式无效'); const addresses = await dns.lookup(target, { all: true }); if (!addresses.length || addresses.some((entry) => !publicAddress(entry.address))) throw new Error('目标地址不允许'); const started = performance.now(); await new Promise((resolve, reject) => { const req = https.request({ hostname: target, method: 'HEAD', path: '/', timeout: 5000, headers: { 'User-Agent': 'NetScope/1.0' } }, (res) => { res.resume(); resolve(res.statusCode); }); req.on('timeout', () => req.destroy(new Error('Timed out'))); req.on('error', reject); req.end(); }); return Math.round(performance.now() - started); }
const statusTargets = ['github.com', 'www.cloudflare.com', 'chatgpt.com', 'claude.ai', 'registry.npmjs.org'];

http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', 'http://localhost');
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, headers('text/plain; charset=utf-8')); response.end('Method Not Allowed'); return; }
  try {
    if (url.pathname === '/healthz') return json(response, 200, { ok: true });
    if (url.pathname === '/api/public-ip') return json(response, 200, { ip: request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.socket.remoteAddress || null });
    if (url.pathname === '/api/dns/start') { if (!dnsZone) return json(response, 200, { configured:false }); const token=crypto.randomBytes(12).toString('hex'); return json(response, 200, { configured:true, token, name: token+'.'+dnsZone }); }
    if (url.pathname.startsWith('/api/dns/result/')) { const token=url.pathname.slice('/api/dns/result/'.length); const item=readDns()[token]; return json(response, 200, { configured:Boolean(dnsZone), found:Boolean(item), result:item||null }); }
    if (url.pathname.startsWith('/api/geoip/')) { const ip = decodeURIComponent(url.pathname.slice(11)); if (!validIp(ip)) return json(response, 400, { error: 'Invalid IP' }); return json(response, 200, await geo(ip)); }
    if (url.pathname.startsWith('/api/iprisk/')) { const ip = decodeURIComponent(url.pathname.slice(12)); if (!validIp(ip)) return json(response, 400, { error: 'Invalid IP' }); const info = await geo(ip); let allocation = null; try { const r = await rdap(ip); allocation = { handle:r.handle, name:r.name, country:r.country, startAddress:r.startAddress, endAddress:r.endAddress, status:r.status, entities:r.entities, events:r.events }; } catch {} return json(response, 200, { ...riskScore(info), geo: info, allocation }); }
    if (url.pathname === '/api/whois') return json(response, 200, await rdap(url.searchParams.get('query') || ''));
    if (url.pathname === '/api/probe') return json(response, 200, { target: url.searchParams.get('target'), latency: await safeProbe(url.searchParams.get('target') || '') });
    if (url.pathname === '/api/status') { const results = await Promise.all(statusTargets.map(async (target) => { try { return { target, ok: true, latency: await safeProbe(target) }; } catch { return { target, ok: false }; } })); return json(response, 200, { generatedAt: new Date().toISOString(), results }); }
    if (url.pathname === '/api/ping') { const target=url.searchParams.get('target') || ''; const count=Math.min(5, Math.max(1, Number(url.searchParams.get('count') || 3))); const local=(async()=>{const values=[];for(let i=0;i<count;i++){try{values.push(await safeProbe(target))}catch{}}return values.length?{node:process.env.PING_NODE_NAME||'本机 VPS',samples:values,min:Math.min(...values),avg:Math.round(values.reduce((a,b)=>a+b,0)/values.length),max:Math.max(...values),ok:true}:{node:process.env.PING_NODE_NAME||'本机 VPS',ok:false,error:'目标不可达或探测失败'}})(); const remote=probeNodes.map(async(node)=>{try{const u=new URL(node.url);if(u.protocol!=='https:')throw Error('probe must use https');const d=await requestJsonWithHeaders(node.url.replace(/\/$/,'')+'/probe?target='+encodeURIComponent(target),{'Authorization':'Bearer '+node.key});return {...d,node:node.name,ok:true}}catch(error){return {node:node.name,ok:false,error:error.message}}}); return json(response,200,{target,nodes:await Promise.all([local,...remote])}); }
    if (url.pathname === '/api/ping/nodes') return json(response, 200, { nodes:[{ name:process.env.PING_NODE_NAME || '本机 VPS', url:'local' }, ...probeNodes.map(x=>({name:x.name,url:x.url}))] });
  } catch (error) { return json(response, 502, { error: error.message || 'Upstream request failed' }); }
  const entry = files[url.pathname];
  if (!entry) { response.writeHead(404, headers('text/plain; charset=utf-8')); response.end('Not Found'); return; }
  fs.readFile(path.join(root, entry[0]), (error, content) => { if (error) { response.writeHead(500, headers('text/plain; charset=utf-8')); response.end('Internal Server Error'); return; } response.writeHead(200, headers(entry[1])); response.end(request.method === 'HEAD' ? undefined : content); });
}).listen(port, host, () => console.log(`NetScope listening on http://${host}:${port}`));







