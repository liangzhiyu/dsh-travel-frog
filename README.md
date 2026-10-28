# 蛙旅 · DSH Travel Frog

DeepSeek Harness 里的旅行收藏伙伴。你忙你的，小蛙去看看世界。

![蛙旅在真实 DeepSeek Harness 中的界面](docs/images/home.png)

- 选择三种行囊，前往六个原创地点；优先发现尚未收藏的风景。
- 一分钟体验、25分钟或60分钟旅行。关闭 DSH 后再回来，按时间结算一次。
- 每次都有本地明信片与纪念物；无需模型、网络或 API key 即可完成玩法。
- 可主动请宿主模型写信，只发送该卡的虚构旅行信息和你填写的主题。
- 当前浏览器存档、导入/导出、跨标签锁，无签到惩罚、无后台模型请求。

## 安装

需要 Node.js ≥24.9，兼容性验证目标为 DeepSeek Harness **0.2.1-rc.2 Web**。浏览器需支持 Web Locks，使用 localhost 或 HTTPS。

从本仓库目录打包安装：

```sh
pnpm install --frozen-lockfile
pnpm pack --pack-destination artifacts
dsh plugin --profile web add ./artifacts/dsh-travel-frog-0.1.0.tgz
dsh web
```

重启宿主后从侧栏打开 **蛙旅**。已启动的实例需重启加载插件。官方 Electron 桌面端尚未实机验证。

## 模型与存档

默认仅使用本地文案。点击「请模型写一封信」才会使用宿主默认模型并消耗其额度；不会另存 API key，不读会话或工作文件，不注册 Agent 工具。可在 profile 的 patch 中为 `travel-frog` 配置 `provider` 和 `model` 固定路由。没有可用模型时保留本地文案。成功后同卡不重复生成；失败需手动重试。辅助请求的用量可能不显示在会话统计中。

存档位于当前浏览器、当前 DSH 地址的 `localStorage`，键为 `dsh-travel-frog.state.v1`，不跨设备或端口同步。清理站点数据会丢失存档，请使用导出备份。最多保存最近200张卡；导入和重置均需界面确认。关闭页面不运行后台任务，重新打开旅舍时结算。本地时间可被用户修改，游戏不提供反作弊或交易功能。

## 开发

```sh
pnpm check
pnpm pack --pack-destination artifacts
```

`core.js` 为纯逻辑，`index.js` 为宿主接口，`client-source.js` 为界面。`tools/build.mjs` 将纯逻辑嵌入 DSH 原生浏览器模块 `client.js`；无需生产依赖。提交修改前重新 build。测试模型仅用于隔离集成验证，不进入发布包。

[玩法调研与对抗评审](docs/design-review.md) · [验证记录](docs/verification.md)

## 卸载

```sh
dsh plugin --profile web remove dsh-travel-frog
```

重启宿主。浏览器存档保留，如需删除请先在插件中重置或清除上述存储键。

MIT。借鉴旅行收藏玩法，使用原创场景、文案与 SVG；与《旅行青蛙》及 DeepSeek 官方无隶属关系。
