<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { evalES, openLinkInBrowser, subscribeBackgroundColor } from "../lib/utils/bolt";
import { child_process, os, path } from "../lib/cep/node";
import "../index.scss";

const { spawn } = child_process;
const fs = require("fs");

const getUserDocsPath = (): string => {
  return path.join(os.homedir(), "Documents");
};

const findCommandPath = (commandName: string): string => {
  const isWindows = process.platform === "win32";
  const candidates: string[] = [];

  if (isWindows) {
    if (process.env.LOCALAPPDATA) {
      candidates.push(path.join(process.env.LOCALAPPDATA, `${commandName}.exe`));
    }
    if (process.env.APPDATA) {
      candidates.push(path.join(process.env.APPDATA, `${commandName}.exe`));
    }
    if (os.homedir()) {
      candidates.push(path.join(os.homedir(), "AppData", "Local", `${commandName}.exe`));
      candidates.push(path.join(os.homedir(), "AppData", "Roaming", `${commandName}.exe`));
    }
  } else {
    const homeDir = os.homedir();
    if (homeDir) {
      candidates.push(path.join(homeDir, ".local", "bin", commandName));
      candidates.push(path.join(homeDir, "bin", commandName));
    }
    candidates.push(
      path.join("/usr/local/bin", commandName),
      path.join("/opt/homebrew/bin", commandName),
      path.join("/usr/bin", commandName)
    );
  }

  const existingCandidate = candidates.find((candidate) => fs.existsSync(candidate));
  if (existingCandidate) return existingCandidate;

  try {
    const lookupCommand = isWindows ? "where" : "command -v";
    const result = child_process.execSync(`${lookupCommand} ${commandName}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      shell: isWindows ? true : "/bin/zsh"
    });
    const resolved = result
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .find(Boolean);

    return resolved || "";
  } catch {
    return "";
  }
};

const findHaoonePath = (): string => {
  const haooneCliPath = findCommandPath("haoone-cli");
  if (haooneCliPath) {
    return haooneCliPath;
  }

  return "";
};

const PLUGIN_NAME = "haoone AI 字幕";

const DEFAULT_LANGUAGE_OPTIONS = ["中文", "英语"];
const MULTILINGUAL_LANGUAGE_OPTIONS = ["中文", "英语", "日语", "韩语", "德语", "法语", "西班牙语", "意大利语", "葡萄牙语", "俄语"];
const JAPANESE_LANGUAGE_OPTIONS = ["日语"];

const MODEL_OPTIONS = [
  { name: "中英-v2-2026", id: "qwen3-asr-0.6b-q8_0" },
  { name: "多语种-增强-2026", id: "qwen3-asr-1.7b-q8_0" },
  { name: "中英-2026-已下线", id: "Qwen3-ASR-0.6B" },
  { name: "日语-2026", id: "parakeet-tdt-0.6b-ja" }
];

const languageMap: Record<string, string> = {
  中文: "zh",
  英语: "en",
  日语: "ja",
  韩语: "ko",
  德语: "de",
  法语: "fr",
  西班牙语: "es",
  意大利语: "it",
  葡萄牙语: "pt",
  俄语: "ru"
};

const modelMap: Record<string, string> = {
  "中英-v2-2026": "qwen3-asr-0.6b-q8_0",
  "多语种-增强-2026": "qwen3-asr-1.7b-q8_0",
  "中英-2026-已下线": "Qwen3-ASR-0.6B",
  "日语-2026": "parakeet-tdt-0.6b-ja"
};

const backgroundColor = ref("#282c34");
const enableOnlineTranscript = ref(false);
const selectedModel = ref(MODEL_OPTIONS[0].name);
const selectedLanguage = ref("中文");
const enableAICorrection = ref(false);
const maxLineLength = ref("25");
const statusMessage = ref("等待任务");
const errorDetails = ref("");
const srtPath = ref("");

const clearErrorDetails = () => {
  errorDetails.value = "";
};

const setErrorDetails = (message: string, extra?: string) => {
  const parts = [message.trim()];
  if (extra && extra.trim()) {
    parts.push(extra.trim());
  }
  errorDetails.value = parts.filter(Boolean).join("\n\n");
};

const showModelSelector = computed(() => !enableOnlineTranscript.value);
const currentLanguageOptions = computed(() => {
  if (selectedModel.value === "日语-2026") {
    return JAPANESE_LANGUAGE_OPTIONS;
  }
  if (selectedModel.value === "多语种-增强-2026") {
    return MULTILINGUAL_LANGUAGE_OPTIONS;
  }
  return DEFAULT_LANGUAGE_OPTIONS;
});

watch(
  currentLanguageOptions,
  (options) => {
    if (!options.includes(selectedLanguage.value)) {
      selectedLanguage.value = options[0];
    }
  },
  { immediate: true }
);

const handleVisitWebsite = () => {
  openLinkInBrowser("https://guide.haoai.pro/guide");
};

const handleOpenSrtDirectory = () => {
  if (!srtPath.value) return;
  const normalizedPath = srtPath.value.replace(/\\/g, "/");
  const lastSlash = normalizedPath.lastIndexOf("/");
  const srtDir = lastSlash >= 0 ? normalizedPath.substring(0, lastSlash) : normalizedPath;
  openLinkInBrowser("file://" + srtDir);
};

const handleRunSubtitle = async () => {
  clearErrorDetails();
  statusMessage.value = "导出音频中...";

  try {
    const homePath = getUserDocsPath();
    const pluginDataDir = path.join(homePath, "haoone", "plugin_data");
    const presetPath = path.join(pluginDataDir, "config", "haoone.epr");
    if (!fs.existsSync(presetPath)) {
      const message = "预设文件不存在: " + presetPath;
      statusMessage.value = message;
      setErrorDetails(message);
      return;
    }

    const activeSequenceName = await evalES('app.project.activeSequence ? app.project.activeSequence.name : ""', true);
    if (!activeSequenceName || activeSequenceName === "undefined" || activeSequenceName === "") {
      const message = "没有活动的序列";
      statusMessage.value = message;
      setErrorDetails(message);
      return;
    }

    const projectName = (await evalES('app.project.name || "project"', true))
      .replace(/\.prproj$/, "")
      .replace(/[<>:"/\\|?*]/g, "_");
    const seqName = (await evalES('app.project.activeSequence.name || "sequence"', true))
      .replace(/[<>:"/\\|?*]/g, "_");
    const outputFile = path.join(pluginDataDir, projectName + "_" + seqName + ".wav");
    const exportPresetPath = path.join(pluginDataDir, "config", "haoone.epr");

    if (!fs.existsSync(pluginDataDir)) {
      fs.mkdirSync(pluginDataDir, { recursive: true });
    }

    const isWindows = process.platform === "win32";
    const outputFileForES = isWindows ? outputFile.replace(/\\/g, "\\\\") : outputFile;
    const exportPresetPathForES = isWindows ? exportPresetPath.replace(/\\/g, "\\\\") : exportPresetPath;

    const exportResult = await evalES(
      'app.project.activeSequence.exportAsMediaDirect("' + outputFileForES + '", "' + exportPresetPathForES + '", 0)',
      true
    );

    if (exportResult !== "No Error" && exportResult !== 0) {
      statusMessage.value = "导出失败: " + exportResult;
      setErrorDetails("Premiere 导出失败", String(exportResult));
      return;
    }

    statusMessage.value = "音频导出完成";

    const haoonePath = findHaoonePath();
    if (!haoonePath) {
      const message = "未找到 haoone-cli 程序";
      statusMessage.value = message;
      setErrorDetails(message);
      return;
    }

    const language = languageMap[selectedLanguage.value] || "zh";
    const modelId = modelMap[selectedModel.value] || "qwen3-asr-0.6b-q8_0";
    const isAICorrection = enableAICorrection.value ? "true" : "false";
    const isOnline = enableOnlineTranscript.value ? "true" : "false";
    const timelineName = seqName;
    const audioFileName = outputFile.replace(/\\/g, "/").split("/").pop() || outputFile;
    const taskName = `${projectName}_${seqName}`;

    statusMessage.value = "运行转录命令...";

    const haooneArgs = [
      "transcribe",
      "--name", process.platform === "win32" ? audioFileName.replace(/\.[^.]+$/, "") : taskName,
      "--audio-file-path", outputFile,
      "--language", language,
      "--from", "pr",
      "--enable-ai-correction", isAICorrection,
      "--enable-online-transcript", isOnline,
      "--max-subtitle-length", maxLineLength.value,
      "--model", modelId
    ];

    await new Promise<void>((resolve) => {
      const proc = spawn(haoonePath, haooneArgs, {
        shell: false,
        windowsHide: true
      });

      let output = "";
      let stderrOutput = "";
      let runtimeErrorMessage = "";
      let lastProgress = "";

      const processOutput = (chunk: string) => {
        const errorMatch = chunk.match(/haoone_error=(.+?)(?:\r?\n|$)/);
        if (errorMatch?.[1]) {
          runtimeErrorMessage = errorMatch[1].trim();
          statusMessage.value = "错误: " + runtimeErrorMessage;
          setErrorDetails("haoone 运行错误", runtimeErrorMessage);
        }

        const msgMatch = chunk.match(/====([\s\S]*?)====/);
        if (msgMatch?.[1]) {
          const lines = msgMatch[1].split(/\r?\n/);
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && trimmed !== lastProgress) {
              lastProgress = trimmed;
              statusMessage.value = trimmed;
            }
          }
        }
      };

      proc.stdout.on("data", (data) => {
        const chunk = data.toString();
        output += chunk;
        processOutput(chunk);
      });

      proc.stderr.on("data", (data) => {
        const chunk = data.toString();
        output += chunk;
        stderrOutput += chunk;
        processOutput(chunk);
      });

      proc.on("close", async (code) => {
        const srtMatch = output.match(/srt_file_path=(.+?)(?:\r?\n|$)/);
        const srtFilePath = srtMatch?.[1]?.trim() || "";

        const errorMatch = output.match(/haoone_error=(.+?)(?:\r?\n|$)/);
        const finalErrorMessage = errorMatch?.[1]?.trim() || runtimeErrorMessage;

        if (finalErrorMessage) {
          statusMessage.value = "转录失败: " + finalErrorMessage;
          setErrorDetails("haoone 转录失败", finalErrorMessage);
          resolve();
          return;
        }

        if (code !== 0) {
          const extraParts = ["退出码: " + String(code)];
          if (stderrOutput.trim()) {
            extraParts.push(stderrOutput.trim());
          } else if (output.trim()) {
            extraParts.push(output.trim());
          }
          statusMessage.value = "转录失败: haoone 异常退出";
          setErrorDetails("haoone 异常退出", extraParts.join("\n\n"));
          resolve();
          return;
        }

        if (!srtFilePath) {
          statusMessage.value = "转录完成";
          resolve();
          return;
        }

        statusMessage.value = "正在导入字幕到项目面板...";
        srtPath.value = srtFilePath;

        try {
          const userDocsPath = getUserDocsPath();
          const configDir = path.join(userDocsPath, "haoone", "plugin_data", "config");
          const configPath = path.join(configDir, "pr-plugin.json");

          if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
          }

          let config: Record<string, any> = {};
          if (fs.existsSync(configPath)) {
            try {
              config = JSON.parse(fs.readFileSync(configPath, "utf8"));
            } catch {
              config = {};
            }
          }

          const key = projectName + "_" + seqName;
          config[key] = srtFilePath;
          config["enable-online-transcript"] = enableOnlineTranscript.value;
          config["max-subtitle-length"] = parseInt(maxLineLength.value, 10) || 25;
          config["enable-ai-correction"] = enableAICorrection.value;

          fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        } catch {
          // 忽略配置保存错误
        }

        const importResult = await evalES(
          'var f = new File("' + srtFilePath.replace(/\\/g, "\\\\") + '"); if (f.exists) { app.project.importFiles(["' + srtFilePath.replace(/\\/g, "\\\\") + '"], false, app.project.getInsertionBin(), false); "success"; } else { "file not found"; }',
          true
        );

        if (importResult === "success") {
          statusMessage.value = "字幕已导入项目面板，请手动添加到时间线";
        } else {
          statusMessage.value = "导入失败: " + importResult + "，但字幕文件已生成: " + srtFilePath;
          setErrorDetails("导入字幕失败", String(importResult));
        }

        resolve();
      });

      proc.on("error", (error) => {
        statusMessage.value = "转录失败: " + error.message;
        setErrorDetails("haoone 启动失败", error.message);
        resolve();
      });
    });
  } catch (error: any) {
    alert("JS错误: " + (error?.message || String(error)));
    statusMessage.value = "导出失败: " + (error?.message || String(error));
    setErrorDetails("JS 错误", error?.stack || error?.message || String(error));
  }
};

const handleSyncSubtitle = async () => {
  clearErrorDetails();

  if (!srtPath.value) {
    const message = "没有可同步的字幕文件";
    statusMessage.value = message;
    setErrorDetails(message);
    return;
  }

  statusMessage.value = "正在同步字幕...";

  try {
    const importResult = await evalES(
      'var f = new File("' + srtPath.value.replace(/\\/g, "\\\\") + '"); if (f.exists) { app.project.importFiles(["' + srtPath.value.replace(/\\/g, "\\\\") + '"], false, app.project.getInsertionBin(), false); "success"; } else { "file not found"; }',
      true
    );

    if (importResult === "success") {
      statusMessage.value = "字幕已同步到项目面板";
    } else {
      statusMessage.value = "同步失败: " + importResult;
      setErrorDetails("同步字幕失败", String(importResult));
    }
  } catch (error: any) {
    statusMessage.value = "同步失败: " + (error?.message || String(error));
    setErrorDetails("同步字幕失败", error?.stack || error?.message || String(error));
  }
};

onMounted(async () => {
  if (!window.cep) return;

  subscribeBackgroundColor((color: string) => {
    backgroundColor.value = color;
  });

  const userDocsPath = getUserDocsPath();
  const configPath = path.join(userDocsPath, "haoone", "plugin_data", "config", "pr-plugin.json");

  try {
    if (!fs.existsSync(configPath)) return;

    const content = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(content);

    const nameResult = await evalES(
      'var p = app.project; var s = app.project.activeSequence; (p ? p.name : "") + "|" + (s ? s.name : "")',
      true
    );

    const parts = nameResult.split("|");
    const projectName = (parts[0] || "").replace(/\.prproj$/, "").replace(/[<>:"/|?*]/g, "_");
    const seqName = (parts[1] || "").replace(/[<>:"/|?*]/g, "_");
    const key = projectName + "_" + seqName;

    if (config[key]) {
      srtPath.value = config[key];
    }

    if (config["enable-online-transcript"] !== undefined) {
      enableOnlineTranscript.value = config["enable-online-transcript"];
    }
    if (config["max-subtitle-length"] !== undefined) {
      maxLineLength.value = String(config["max-subtitle-length"]);
    }
    if (config["enable-ai-correction"] !== undefined) {
      enableAICorrection.value = config["enable-ai-correction"];
    }
  } catch {
    // 忽略配置读取错误
  }
});
</script>

<template>
  <div class="app" :style="{ backgroundColor }">
    <div class="haoone-container">
      <div class="haoone-header">
        <span class="plugin-name">{{ PLUGIN_NAME }} by 浩叔 haoai.pro</span>
        <button class="help-btn" @click="handleVisitWebsite">
          使用帮助
        </button>
      </div>

      <div class="notice-box">
        远程转录每分钟消耗一次 AI 调用，最长支持 45 分钟视频
      </div>

      <div class="form-row">
        <label class="form-label">启用远程转录</label>
        <input
          v-model="enableOnlineTranscript"
          type="checkbox"
          class="checkbox"
        />
        <template v-if="showModelSelector">
          <label class="form-label model-label">本地转录模型</label>
          <select v-model="selectedModel" class="select">
            <option v-for="model in MODEL_OPTIONS" :key="model.id" :value="model.name">
              {{ model.name }}
            </option>
          </select>
        </template>
      </div>

      <div class="form-row">
        <label class="form-label">语言</label>
        <select v-model="selectedLanguage" class="select">
          <option v-for="lang in currentLanguageOptions" :key="lang" :value="lang">
            {{ lang }}
          </option>
        </select>
      </div>

      <div class="form-row">
        <label class="form-label">AI 校正与智能拆行</label>
        <input
          v-model="enableAICorrection"
          type="checkbox"
          class="checkbox"
        />
      </div>

      <div class="form-row">
        <label class="form-label max-length-label">单行字幕最大长度</label>
        <input
          v-model="maxLineLength"
          type="text"
          class="input-small"
        />
      </div>

      <div class="status-box">
        {{ statusMessage }}
      </div>

      <div v-if="errorDetails" class="error-box">
        <pre>{{ errorDetails }}</pre>
      </div>

      <div class="button-group">
        <button class="btn btn-primary" @click="handleRunSubtitle">
          生成字幕
        </button>
        <button class="btn btn-info" @click="handleSyncSubtitle">
          同步 haoone 软件的字幕修改
        </button>
      </div>

      <div class="form-row srt-path-row">
        <label class="form-label">字幕文件路径</label>
        <div class="srt-path-display">{{ srtPath || "" }}</div>
        <button
          class="btn btn-small"
          :disabled="!srtPath"
          @click="handleOpenSrtDirectory"
        >
          打开目录
        </button>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@use "../variables.scss" as *;

.error-box {
  margin: 0 0 16px;
  padding: 10px 12px;
  border: 1px solid #d64545;
  border-radius: 4px;
  background-color: rgba(214, 69, 69, 0.12);

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 12px;
    line-height: 1.5;
    color: #ffb4b4;
    font-family: Consolas, "Courier New", monospace;
  }
}
</style>
