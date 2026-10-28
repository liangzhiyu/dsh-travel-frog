# 验证记录

验证日期：2026-10-29（Asia/Shanghai）。宿主 DeepSeek Harness 0.2.1-rc.2，macOS，Node.js 24.19.0，Playwright 1.62.1 + Google Chrome。

## 结果

17项单元/接口测试、11项真实宿主浏览器检查全部通过，浏览器无 pageerror。已检查浅色首页、明信片与深色窄窗口截图；生成入口与宿主安装后的运行时代码逐文件核对一致。

## 验证方法

纯逻辑和宿主接口共17项自动测试：行囊路线、未到访优先、离线时间跳跃、时间回拨、幂等结算、200卡片上限、严格导入验证、AI写回、owner认证、请求体大小与白名单、默认/指定模型路由、token限制、缓存、冷却、模型错误、超时、断连与卸载取消、过长输出。

真实 DSH 集成使用隔离的 DSH_HOME、真实侧栏和 main 插槽、真实 HTTP 认证与 ctx.llm。`tools/fixtures/model` 是确定性本地模型适配器，仅用于验证原生模型服务链路，不访问外部 API，不进入生产包。

浏览器脚本验证：原生面板；真实等待一分钟且离开面板后刷新归来；无自动模型调用；主动写信保存；无认证401；双窗口出发及归来去重；坏存档导入；延迟成功模型响应与另一窗口导入相同ID新卡片的竞态；模型失败保留模板；深色窄窗口；损坏原存档保留；无浏览器异常。

竞态测试没有伪造成功模型回复：代理真实 HTTP 响应，确认200和正文后暂缓交付，另一窗口导入并确认持久化后再交付。503降级场景明确使用注入响应；离线时间跳跃通过有效存档时间戳模拟。首次一分钟旅程使用真实时间等待。

真实 DeepSeek 云模型的生成质量、延迟、用量与官方 Electron 桌面端尚未实测。浏览器关闭后依靠时间戳恢复，不声称后台持续运行。故障模型的取消行为还取决于宿主适配器遵守 AbortSignal。

## 复现

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm pack --pack-destination artifacts
pnpm --dir tools/fixtures/model pack --pack-destination ../../../artifacts
```

使用独立测试目录启动（需要已安装 dsh 0.2.1-rc.2，Node≥24.9）：

```sh
mkdir -p .verification
export DSH_HOME="$PWD/.verification/home"
dsh plugin --profile web add "$PWD/artifacts/dsh-travel-frog-0.1.0.tgz" "$PWD/artifacts/dsh-travel-frog-fixture-model-0.0.0.tgz"
dsh web --port 3088 --no-open > .verification/harness.log 2>&1
```

另一终端在本项目运行 `pnpm test:browser`。脚本仅连接 loopback 3088，自动从隔离日志读取启动认证 URL，不打印凭据。输出结果与截图在 git 忽略的 `artifacts/`，所有浏览器存档属于脚本创建的独立 context。

注意重复安装同名本地 tgz 可能命中包管理器缓存。开发验证时使用新的包文件名，并确认安装后的 client.js/index.js/core.js 与待发布文件一致，然后重启宿主。
