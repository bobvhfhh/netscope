function nav(active) {
  const items = [['/','IP查询'],['/claude/','Claude AI IP 检测'],['/ip/','IP评分'],['/gpt/','GPT 检测'],['/link/','网络连通'],['/dns/','DNS泄露'],['/webrtc/','WebRTC'],['/cloudflare/','Cloudflare'],['/ping/','全球Ping'],['/status/','服务状态'],['/whois/','Whois查询']];
  return '<nav class="nav"><div class="nav-scroll">' + items.map(([href,name]) => '<a class="' + (active === href ? 'active' : '') + '" href="' + href + '">' + name + '</a>').join('') + '</div><button class="theme-button" id="themeButton">◐</button></nav>';
}
function shell(title, subtitle, active, body) {
  return '<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + ' - NetScope</title><link rel="stylesheet" href="/styles.css"></head><body><div class="container">' + nav(active) + '<main><section class="page-heading"><h1>' + title + '</h1><p>' + subtitle + '</p></section>' + body + '</main><footer>© 2026 NetScope · 自托管网络诊断工具</footer></div><script src="/pages.js"></script></body></html>';
}
