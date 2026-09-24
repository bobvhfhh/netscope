# NetScope

一个受网络诊断工具启发的开源、无构建依赖前端，提供公网出口观察、浏览器直连连通性测试和 WebRTC 隐私信号检查。项目独立实现，不复制第三方站点的品牌资源或源代码。

## 运行

```bash
python -m http.server 4173
```

访问 http://localhost:4173/net-coffee-open/。也可以直接打开 `index.html`，但浏览器安全策略可能限制跨域探测。

DNS 泄漏的严谨检测需要服务端权威 DNS token；当前版本明确展示这一能力边界。IP 归属、WHOIS、全球多节点 Ping 可以作为后续 API 模块加入。

License: MIT
