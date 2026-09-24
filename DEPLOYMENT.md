# VPS Deployment

## 方式一：直接通过 IP 和端口访问

在 VPS 安装 Docker Engine 和 Docker Compose plugin 后：

```bash
git clone https://github.com/YOUR_ACCOUNT/netscope.git
cd netscope
cp .env.example .env
docker compose up -d --build
```

开放防火墙 TCP `8080` 后，访问：

```text
http://YOUR_SERVER_IP:8080
```

修改端口：编辑 `.env` 的 `HOST_PORT`，例如 `HOST_PORT=9000`，随后运行：

```bash
docker compose up -d
```

## 方式二：域名 + HTTPS（推荐）

1. 将域名 A/AAAA 记录指向 VPS。
2. 编辑 `.env`，设置 `BIND_ADDRESS=127.0.0.1`，不把应用端口直接公开到互联网。
3. 运行 `docker compose up -d --build`。
4. 安装 Caddy，并使用下面的 `Caddyfile`。Caddy 会自动申请和续期 HTTPS 证书。

```caddyfile
your-domain.example {
  reverse_proxy 127.0.0.1:8080
}
```

只开放 VPS 的 TCP `80` 和 `443`；不要开放 `8080`。

## Nginx 替代方案

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

用 Certbot 或自己的证书配置 HTTPS。

## 更新

```bash
docker compose ps
docker compose logs -f
git pull
docker compose up -d --build
```

应用提供 `GET /healthz`，唯一返回 `{"ok":true}`，不能列出 Docker 或 VPS 的任何内容。

## 安全边界

- 镜像使用非 root 用户 `node` 运行。
- 文件系统为只读，只有 `/tmp` 是临时内存文件系统。
- 不挂载 Docker socket、宿主机目录、密钥或数据库。
- 直接端口访问时，仅公开页面与 `/healthz`。
- 域名部署时使用 `BIND_ADDRESS=127.0.0.1`，让 Caddy/Nginx 成为唯一公网入口。
