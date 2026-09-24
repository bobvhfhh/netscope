# NetScope

NetScope 是一个可自托管的浏览器网络诊断台，界面参考常见的 IP/分流测试工具，但代码、品牌和资源均为独立实现。它适合部署在自己的 VPS 上，用来观察当前公网出口、验证分流规则，并检查浏览器侧的网络隐私信号。

> 项目不包含 AI 资讯和 IP 卡片模块，也不会收集或建立用户画像。

## 项目能做什么

- **当前 IP 查询**：显示浏览器当前公网出口 IP，并展示 Cloudflare 边缘位置。
- **网站分流测试**：按国内、Social、AI、Crypto、Tools、Static、Dev 等类别列出常用站点；当前版本的完整逐站出口 IP 探测仍在建设中。
- **网络连通性测试**：从用户自己的浏览器直接请求多个目标，测量当前网络的实际访问延迟。
- **IP 隐藏显示**：隐藏页面上的 IPv4 后两段，适合截图或分享检测结果。隐藏只改变显示，不改变真实请求。
- **WebRTC 检测**：建立 STUN 探测；完整候选 IP 提取、归属判断和泄漏结论仍在建设中。
- **主题切换**：支持浅色和暗色界面。
- **安全响应头**：自带 Node 服务设置禁止 MIME 嗅探、禁止 iframe 嵌入、严格来源策略和权限策略。

## 项目优点

- **完全自托管**：网页和服务运行在你自己的 VPS，不依赖第三方 SaaS。
- **无构建依赖**：原生 HTML、CSS、JavaScript 和 Node 内置 HTTP 模块，不需要安装 npm 依赖。
- **部署简单**：可以直接用 `IP:端口` 访问，也可以通过域名和 Caddy/Nginx 反向代理访问。
- **资源占用低**：Node 静态服务配合 Alpine Linux 镜像，适合小型 VPS。
- **隐私边界清楚**：网络探测主要从访问者浏览器发出；项目不设置统计脚本、不写入用户数据库。
- **容器权限收敛**：Docker 使用非 root 用户、只读文件系统、临时 `/tmp`，不挂载宿主机目录或 Docker socket。
- **功能建设状态**：目前实现的是页面结构、当前出口、浏览器连通性和基础 WebRTC 探测；GeoIP 风险、WHOIS/RDAP、全球多节点 Ping 和权威 DNS 检测尚未实现。

## 最快部署：VPS + Docker

### 1. 安装 Docker

在 VPS 安装 Docker Engine 和 Docker Compose plugin。

### 2. 拉取项目并启动

```bash
git clone https://github.com/bobvhfhh/netscope.git
cd netscope
cp .env.example .env
docker compose up -d --build
```

### 3. 通过 IP 和端口访问

默认端口是 `8080`。在 VPS 防火墙和云厂商安全组开放 TCP `8080` 后访问：

```text
http://你的VPS公网IP:8080
```

修改端口：编辑 `.env`：

```env
HOST_PORT=9000
BIND_ADDRESS=0.0.0.0
```

然后运行 `docker compose up -d`，访问 `http://你的VPS公网IP:9000`。

## 推荐部署：域名 + HTTPS

域名部署时，建议不要把应用端口直接暴露到公网。把域名的 A/AAAA 记录指向 VPS，并将 `.env` 设置为：

```env
HOST_PORT=8080
BIND_ADDRESS=127.0.0.1
```

启动容器：

```bash
docker compose up -d --build
```

### Caddy

```caddyfile
your-domain.example {
    reverse_proxy 127.0.0.1:8080
}
```

Caddy 会自动申请和续期 HTTPS 证书。公网只开放 TCP `80` 和 `443`，不要开放 `8080`。

### Nginx

```nginx
server {
    listen 80;
    server_name your-domain.example;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

再使用 Certbot 或已有证书配置 HTTPS。

## DNS 泄漏检测部署（需要你自己的域名）`n`nDNS 检测不是普通 HTTP 请求。要得到真实结果，需要一个域名子域和权威 DNS 服务。`n`n1. 准备一个域名，例如 `example.com`。`n2. 选择一个子域，例如 `dns.example.com`，把它的 NS 记录委派到这台 VPS；同时确保该子域的 glue/NS 配置能找到 VPS 的公网 IP。`n3. 在 `.env` 中设置：`n`n```env`nDNS_ZONE=dns.example.com`n``` `n`n4. VPS 防火墙和云安全组开放 UDP/TCP `53`，然后重启：`n`n```bash`ndocker compose up -d --build`n``` `n`n5. 打开网站的 `/dns/` 页面开始测试。`n`n如果页面提示未配置或超时，优先检查 NS 委派、DNS_ZONE、UDP 53 和运营商是否拦截自建 DNS。`n`n## 更新项目

```bash
cd netscope
git pull
docker compose up -d --build
```

查看状态和日志：

```bash
docker compose ps
docker compose logs -f
```

## 健康检查和安全说明

服务提供 `GET /healthz`，只返回：

```json
{"ok":true}
```

它只代表网页服务进程正在运行，不会读取或展示 VPS/Docker 内部内容，也不会返回容器列表、镜像列表、VPS 文件、环境变量、SSH 信息、Docker socket、数据库或密钥。

容器使用非 root 用户 `node`、只读文件系统和临时 `/tmp`，不挂载 Docker socket、宿主机目录、密钥或数据库。域名模式使用 `BIND_ADDRESS=127.0.0.1`，由 Caddy/Nginx 作为唯一公网入口。

## 技术边界

- 浏览器直连测试受 CORS、目标网站策略、代理和浏览器权限影响，超时不一定代表网站宕机。
- 纯前端不能可靠读取系统 DNS；严谨的 DNS 泄漏检测需要自建权威 DNS token 服务。
- 当前版本没有伪造 GeoIP、WHOIS 或全球节点 Ping 数据，后续可以作为独立后端模块加入。

## 本地运行

需要 Node.js 20+：

```bash
npm start
```

打开 `http://127.0.0.1:8080`。语法检查：

```bash
npm run check
```

## 文件结构

```text
index.html       页面结构
styles.css       工具站布局样式
app.js           IP、连通性、分流和 WebRTC 交互
server.js        零依赖 Node 静态服务
Dockerfile       Node Alpine 镜像
compose.yaml     Docker Compose 部署配置
.env.example     端口和监听地址示例
```

## License

MIT


