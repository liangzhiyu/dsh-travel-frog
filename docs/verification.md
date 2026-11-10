# 验证记录

## 0.2.0

在 macOS、Node 24.19.0、DeepSeek Harness Web 0.2.1-rc.2 与 Chrome 上验证。

- 19 项核心和宿主接口测试通过，覆盖旅行时间、旧版存档、会话备注和重复结算。
- 5 组浏览器检查通过。真实 DSH 会话入口可备便当并保存手写备注。推进测试时钟、重载后只结算一张明信片，可返回原会话。
- 相册可导出与导入存档。会话不可用时留在蛙旅并提示。
- 深色窄窗口无横向溢出。旅行与收信流程未调用游记模型，浏览器无页面异常。
- [设计校验](../design-qa.md)记录与定稿的视觉对照。

## 复测

```sh
pnpm install --frozen-lockfile
pnpm check
mkdir -p artifacts .verification
pnpm pack --pack-destination artifacts
pnpm --dir tools/fixtures/model pack --pack-destination ../../../artifacts
export DSH_HOME="$PWD/.verification/home"
dsh plugin --profile web add "$PWD/artifacts/dsh-travel-frog-0.2.0.tgz" "$PWD/artifacts/dsh-travel-frog-fixture-model-0.0.0.tgz"
dsh web --port 3088 --no-open > .verification/harness.log 2>&1
```

另开终端运行 `pnpm test:browser`。测试会话使用随仓库提供的本地模型 fixture，截图与结果保存在 `artifacts/`。
