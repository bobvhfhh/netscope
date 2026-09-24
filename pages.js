function theme(){document.getElementById('themeButton')?.addEventListener('click',()=>document.body.classList.toggle('dark'));}
async function trace(){try{const r=await fetch('https://1.1.1.1/cdn-cgi/trace',{cache:'no-store',signal:AbortSignal.timeout(5000)});return Object.fromEntries((await r.text()).trim().split('\n').map(l=>l.split('=')))}catch{return null}}
function fillIp(){trace().then(d=>document.querySelectorAll('[data-ip]').forEach(e=>e.textContent=d?.ip||'获取失败'));}
function cards(){document.querySelectorAll('[data-card]').forEach(e=>{e.innerHTML='<span>'+e.dataset.card+'</span><strong data-ip>检测中…</strong><p>正在读取当前网络信号</p>'});fillIp()}
async function probe(btn){btn.disabled=true;btn.textContent='检测中…';const start=performance.now();try{await fetch(btn.dataset.url,{mode:'no-cors',cache:'no-store',signal:AbortSignal.timeout(5000)});btn.nextElementSibling.textContent='可访问 · '+Math.round(performance.now()-start)+'ms'}catch{btn.nextElementSibling.textContent='超时或被阻断'}btn.disabled=false;btn.textContent='刷新'}
function wireProbes(){document.querySelectorAll('[data-url]').forEach(b=>b.addEventListener('click',()=>probe(b)))}
theme();cards();wireProbes();
