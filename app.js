const targets = [
  ['网易', '国内', '🇨🇳'], ['字节跳动', '国内', '🇨🇳'], ['Cloudflare中国', '国内', '🇨🇳'], ['高通中国', '国内', '🇨🇳'],
  ['discord.com', '国际 · Social', '🇺🇸'], ['x.com', '国际 · Social', '🇺🇸'], ['medium.com', '国际 · Social', '🇺🇸'], ['signal.org', '国际 · Social', '🇺🇸'],
  ['anthropic.com', '国际 · AI', '🇺🇸'], ['claude.ai', '国际 · AI', '🇺🇸'], ['chatgpt.com', '国际 · AI', '🇺🇸'], ['openai.com', '国际 · AI', '🇺🇸'], ['sora.com', '国际 · AI', '🇺🇸'], ['grok.com', '国际 · AI', '🇺🇸'], ['perplexity.ai', '国际 · AI', '🇺🇸'],
  ['coinbase.com', '国际 · Crypto', '🇺🇸'], ['www.okx.com', '国际 · Crypto', '🇺🇸'], ['binance.com', '国际 · Crypto', '🇺🇸'], ['crypto.com', '国际 · Crypto', '🇺🇸'],
  ['zoom.us', '国际 · Tools', '🇺🇸'], ['notion.so', '国际 · Tools', '🇺🇸'], ['shopify.com', '国际 · Tools', '🇺🇸'], ['npm registry', '国际 · Static', '🇺🇸'], ['nodejs.org', '国际 · Dev', '🇺🇸'], ['gitlab.com', '国际 · Dev', '🇺🇸']
];
const endpoints = { Cloudflare: 'https://1.1.1.1/cdn-cgi/trace', GitHub: 'https://github.com/generate_204', YouTube: 'https://www.youtube.com/generate_204', '淘宝': 'https://www.taobao.com/favicon.ico', '微信': 'https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico' };
const $ = (selector) => document.querySelector(selector);

function renderRows() {
  $('#routeBody').innerHTML = targets.map((target) => {
    return '<tr><td class="site-cell">' + target[0] + ' <span class="tag">' + target[1] + '</span></td><td class="flag">' + target[2] + '</td><td class="ip-cell" data-real="">等待检测</td><td class="geo-cell">等待检测</td></tr>';
  }).join('');
}

function renderMini() {
  $('#miniGrid').innerHTML = Object.keys(endpoints).map((name, index) => {
    return '<div class="mini-item"><strong>' + name + '</strong><div class="dots">' + '<i></i>'.repeat(8) + '</div><div class="mini-ms" id="m' + index + '">-- ms</div></div>';
  }).join('');
}

async function trace() {
  try {
    const response = await fetch('https://1.1.1.1/cdn-cgi/trace', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    return Object.fromEntries((await response.text()).trim().split('\n').map((line) => line.split('=')));
  } catch { return null; }
}

async function updateIp() {
  const data = await trace();
  if (!data) { $('#ipValue').textContent = '获取失败'; return; }
  $('#ipValue').textContent = data.ip || '未知';
  $('#geoValue').textContent = (data.loc || '--') + ' · Cloudflare 节点 ' + (data.colo || '--');
  $('#splitIp').textContent = data.ip || '--';
  $('#splitIp').dataset.real = data.ip || '';
}

async function runMini() {
  Object.values(endpoints).forEach(async (url, index) => {
    const start = performance.now();
    try {
      await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: AbortSignal.timeout(3500) });
      $('#m' + index).textContent = Math.round(performance.now() - start) + ' ms';
    } catch { $('#m' + index).textContent = '超时'; }
  });
}

async function runRoutes() {
  const data = await trace();
  const ip = data && data.ip ? data.ip : '未获取到 IP';
  document.querySelectorAll('#routeBody .ip-cell').forEach((cell) => { cell.textContent = ip; cell.dataset.real = ip; });
  document.querySelectorAll('#routeBody .geo-cell').forEach((cell) => { cell.textContent = data ? ((data.loc || '未知') + ' · ' + (data.colo || '未知') + ' edge') : '未知'; });
  runMini();
}

function maskIp(enabled) {
  document.querySelectorAll('[data-real]').forEach((element) => {
    const value = element.dataset.real || element.textContent;
    element.dataset.real = value;
    const isV4 = /^\d+\.\d+\.\d+\.\d+$/.test(value);
    element.textContent = enabled && isV4 ? value.split('.').slice(0, 2).join('.') + '.*.*' : value;
  });
}

async function checkWebRtc() {
  if (!window.RTCPeerConnection) { $('#rtcDetail').textContent = '当前浏览器不支持 WebRTC'; return; }
  try {
    const peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peer.createDataChannel('probe');
    await peer.setLocalDescription(await peer.createOffer());
    await new Promise((resolve) => setTimeout(resolve, 1000));
    peer.close();
    $('#rtcDetail').textContent = '已完成 STUN 候选地址检查';
  } catch { $('#rtcDetail').textContent = '浏览器拒绝了候选地址探测'; }
}

renderRows();
renderMini();
updateIp();
runRoutes();
$('#runAll').onclick = runRoutes;
$('#themeButton').onclick = () => document.body.classList.toggle('dark');
$('#maskToggle').onchange = (event) => maskIp(event.target.checked);
$('#rtcButton').onclick = checkWebRtc;
