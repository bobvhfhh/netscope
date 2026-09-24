# NetScope

NetScope 是一个可部署在 VPS 上的开源网络诊断面板，复刻 ip.net.coffee 的工具式布局和核心诊断思路。它只保留网络诊断相关内容，不包含 AI 资讯或 IP 卡片模块。

项目支持 VPS 的 IP:端口直接访问，也支持 Caddy、Nginx 等反向代理和自有域名。

## 已实现功能

- 当前出口 IP、请求头、Cloudflare Trace：IP、地区、机房、协议、TLS、WARP、Gateway、SNI。
- GeoIP 查询与缓存，显示国家、地区、城市、组织和 ASN。
- IP 风险评分，并通过 RDAP 补充分配详情：handle、网络名称、国家、地址范围、状态、实体和事件。
- WHOIS/RDAP 查询，支持域名、IPv4、IPv6 和 ASN，并跟随 RDAP 重定向。
- Cloudflare、网易、字节跳动等分站路由检测，包含可达性、出口 IP 与 GeoIP。
- Claude 与 GPT 出口检测。
- WebRTC 多 STUN 检测和 ICE 候选地址对比。
- Cloudflare 专项诊断与浏览器延迟测试。
- DNS 权威检测组件，使用一次性 token 记录查询，不读取 VPS/Docker 内容。
- 单 VPS Ping，以及受 Bearer 密钥保护的多节点 Ping 汇总。
- GitHub、Cloudflare、ChatGPT、Claude、npm Registry 等服务状态探测。
- /healthz 只返回应用存活状态，不暴露 Docker、进程、文件或环境变量。

## 能力边界

尚未包含商业 VPN/Proxy/Tor 情报数据库、官方完整 20 地区探针网络、Turnstile 服务端校验、完整 BGP/ASN 历史数据和 DNSBL 历史信誉库。多节点 Ping 需要你自行部署探针，DNS 检测需要完成域名 NS 委派。

## 快速运行

要求 Node.js 18 或更高版本。

~~~bash
git clone https://github.com/bobvhfhh/netscope.git
cd netscope
npm install
cp .env.example .env
npm start
~~~

默认监听 0.0.0.0:8080，访问 http://你的VPS_IP:8080。检查命令：

~~~bash
npm run check
~~~

## Docker 部署

~~~bash
cp .env.example .env
docker compose up -d --build
docker compose logs -f netscope
~~~

应用默认映射到 VPS 的 8080 端口。只使用 IP 加端口访问时，放行该端口即可。

## 域名 + Caddy

把域名 A/AAAA 记录指向 VPS，在 Caddyfile 写入：

~~~caddy
net.example.com {
    reverse_proxy 127.0.0.1:8080
}
~~~

重载 Caddy 后通过 https://net.example.com 访问。Caddy 会自动申请和续期 HTTPS 证书，Nginx 配置见 DEPLOYMENT.md。

## DNS 权威检测部署

DNS 检测不是 VPS/Docker 检查接口，不会读取 Docker socket 或列出容器、文件、端口和环境变量。它需要你拥有的域名或子域名，并完成 NS 委派。

1. 创建 ns1.example.com、ns2.example.com 的 glue/A/AAAA 记录，指向 VPS。
2. 将检测区域，例如 check.example.com，的 NS 委派到上述权威服务器。
3. 在 .env 中设置 DNS_ZONE=check.example.com 和 DNS_PORT=5353。
4. 放行宿主机 UDP/TCP 53。Compose 内部以非 root 用户监听 5353，并映射为 53:5353/udp 与 53:5353/tcp。
5. 执行 docker compose up -d --build 重启服务，然后打开 /dns/ 页面。

没有域名委派时，页面仍可打开，但 DNS 检测不会收到外部解析器的权威查询。

## 多节点 Ping 探针

多节点模式由你自行部署多个轻量探针后汇总结果，不会凭空生成全球节点。探针使用 Bearer 密钥认证，并拒绝明显的内网目标。

探针节点环境变量：

~~~env
PROBE_KEY=一段随机的长密钥
PROBE_NAME=香港节点
PROBE_HOST=0.0.0.0
PROBE_PORT=8790
~~~

运行 node ping-probe.js。远程使用时建议放在 HTTPS 反向代理后，例如 https://hk-probe.example.com。主应用 .env 配置：

~~~env
PING_PROBES=[{"name":"香港节点","url":"https://hk-probe.example.com","key":"一段随机的长密钥"}]
~~~

多个探针继续添加到 JSON 数组。不要把 PROBE_KEY 提交到 GitHub，也不要把探针暴露在没有认证的公网地址。

## 更新项目

~~~bash
cd netscope
git pull
docker compose up -d --build
~~~

查看状态和日志：

~~~bash
docker compose ps
docker compose logs -f
~~~

## 安全说明

- /healthz 仅返回类似 {"ok":true} 的存活结果，不会读取或展示 VPS/Docker 内部内容。
- DNS 查询记录只用于匹配一次性检测 token，服务不读取 Docker socket。
- Ping 探针使用 Bearer 密钥，主服务不会把探针密钥返回给浏览器。
- WHOIS、GeoIP 和外部状态探测会访问第三方公共服务，具体可用性受网络和上游限流影响。
- 生产环境请使用 HTTPS、强随机密钥、防火墙和定期更新。

## 目录说明

- server.js：主服务、API 和静态页面。
- pages.js：诊断页面交互逻辑。
- ping-probe.js：远程 Ping 探针。
- dns-server.js：DNS 权威检测服务。
- compose.yaml：Docker 编排。
- DEPLOYMENT.md：VPS、Caddy、Nginx 和 DNS 部署说明。

## License

MIT
