# haoone-pr

`haoone-pr` 是一个易用且强大的面向 Adobe Premiere Pro 的 PR字幕插件。

haoone-pr PR字幕插件，中英日语言的识别准确度与音频对齐度吊打 PR 自带的语音识别，全流程在 PR 中就可执行完成，另外支持在 haoone 专业字幕编辑器中快速编辑字幕。

插件适合这类场景：

- 直接把 Premiere 当前序列转成字幕
- 在 `haoone` 软件里继续修改字幕后，再同步回 Premiere
- 在本地模型和远程转录之间切换
- 为不同项目保留最近一次字幕路径和转录参数

[视频教程](https://www.bilibili.com/video/BV1kG9cBrEaz/)

[PR 插件安装与使用教程](https://guide.haoai.pro/guide/haoone/3.2%20%E5%AE%89%E8%A3%85%E4%B8%8E%E4%BD%BF%E7%94%A8%20PR%20%E6%8F%92%E4%BB%B6)

[haoone 软件](https://www.haoai.pro/haoone)

[haoone-cli 介绍](https://github.com/minghe36/haoone-cli)



## 功能概览

- 从当前活动序列导出 `.wav`
- 优先调用 `haoone-cli` 新命令行工具
- 找不到 `haoone-cli` 时，回退到旧版 `haoone` 二进制调用链路
- 支持语言选择
- 支持本地模型和远程转录
- 支持 AI 校正与智能拆行
- 支持单行字幕最大长度设置
- 自动把 `.srt` 导入 Premiere 项目面板
- 支持再次同步 `haoone` 软件中的字幕修改

## 安装插件方法 1 

傻瓜式安装与更新插件

1. 打开 `haoone` 软件并登录。
2. 下载要使用的本地模型。
3. 在 `haoone` 设置中启用命令行工具。
4. 点击软件的`插件安装`，点击 `PR 插件下载与安装`
5. 再点击 `开启 adobe 调试模式`

## 安装插件方法 2

下载并复制插件的代码，手动将插件复制到 adobe 的插件目录中。

mac 的插件目录：

- 用户目录：`~/Library/Application Support/Adobe/CEP/extensions/com.haoone`
- 系统目录：`/Library/Application Support/Adobe/CEP/extensions/com.haoone`

windows 的插件目录：

- 当前用户目录：`%APPDATA%\Adobe\CEP\extensions\com.haoone`
- 系统目录：`C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\com.haoone`

## 插件界面说明

面板主要包含以下选项：

- `启用远程转录`
  - 勾选后使用远程转录
  - 不勾选时使用本地模型
- `本地转录模型`
  - 仅在关闭远程转录时显示
  - 当前内置模型选项：
    - `中英-v2-2026`
    - `多语种-增强-2026`
    - `日语-2026`
- `语言`
  - 当前支持：`中文`、`英文`
- `AI 校正与智能拆行`
  - 启用后会将热词、拆行优化等能力交给 `haoone`
- `单行字幕最大长度`
  - 默认 `25`
  - 数值越小，单行越短，拆分越积极

操作按钮：

- `生成字幕`
  - 导出当前序列音频并调用 `haoone` 转录
- `同步 haoone 软件的字幕修改`
  - 将最近一次记录的 `.srt` 再次导入 Premiere 项目面板
- `打开目录`
  - 打开当前字幕文件所在目录

## 标准使用流程

### 生成字幕

1. 在 Premiere 中打开项目，并切到要转录的序列。
2. 打开 `haoone-pr` 面板。
3. 根据需要选择：
   - 是否启用远程转录
   - 转录语言
   - 本地模型
   - 是否启用 AI 校正
   - 单行字幕长度
4. 点击 `生成字幕`。
5. 等待状态栏从“导出音频中...”变为转录进度信息。
6. 转录成功后，插件会把 `.srt` 导入 Premiere 项目面板。

注意：

- 插件当前是导入到项目面板，不会自动把字幕条放到时间线。
- 导入成功后，需要你手动把字幕素材添加到时间线。

### 在 haoone 中修改后同步

适合这类场景：

- 你已经生成过字幕
- 后续在 `haoone` 软件里又对同一份字幕做了校正
- 希望重新导入 Premiere

操作方式：

1. 在 `haoone` 软件中修改并保存字幕。
2. 回到 Premiere 的 `haoone-pr` 面板。
3. 点击 `同步 haoone 软件的字幕修改`。
4. 插件会读取上次记录的字幕路径，并重新导入项目面板。

## 输出文件与配置文件

插件运行时会读写以下目录。

### 输出目录

- macOS: `~/Documents/haoone/plugin_data`
- Windows: `%USERPROFILE%\Documents\haoone\plugin_data`

目录中通常会出现：

- 导出的 `.wav`
- `haoone` 生成的 `.srt`
- 其他转录附属文件