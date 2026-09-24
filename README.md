# NetScope

NetScope 是一个可自托管的网络诊断页面，提供当前公网 IP、网站分流矩阵、浏览器连通性测试和 WebRTC 检测。它独立实现，未复制第三方站点的品牌、资源或源码。

项目不包含 AI 资讯或 IP 卡片模块。

## 本地运行

需要 Node.js 20+：

```bash
npm start
```

打开 `http://127.0.0.1:8080`。

## Docker 与 VPS 部署

见 [DEPLOYMENT.md](DEPLOYMENT.md)。

## 安全说明

`/healthz` 只返回 `{"ok":true}`，不会返回 Docker、VPS、文件、环境变量或容器数据。服务没有 Docker socket、宿主机目录或管理接口挂载。

## License

MIT
