import {
  helloVoid,
  helloError,
  helloStr,
  helloNum,
  helloArrayStr,
  helloObj,
} from "../utils/samples";
export { helloError, helloStr, helloNum, helloArrayStr, helloVoid };
import { dispatchTS } from "../utils/utils";

// 导出音频到 WAV 文件
export const exportAudioToWav = function() {
  try {
    // 获取用户文档目录
    var homePath = "";
    if ($.os.indexOf("Windows") !== -1) {
      homePath = Folder.userData.fsName.replace(/\\Roaming$/, "");
    } else {
      homePath = Folder("~/Documents").fsName;
    }

    var outputDir = homePath + "/haoone/plugin_data";
    var outputFolder = new Folder(outputDir);
    if (!outputFolder.exists) {
      outputFolder.create();
    }

    // 获取项目名和时间线名
    var projectName = app.project.name || "project";
    var activeSeq = app.project.activeSequence;
    if (!activeSeq) {
      return { success: false, error: "No active sequence" };
    }
    var seqName = activeSeq.name || "sequence";

    // 清理文件名中的非法字符（Windows）
    if ($.os.indexOf("Windows") !== -1) {
      projectName = projectName.replace(/[<>:"/\\|?*]/g, "_");
      seqName = seqName.replace(/[<>:"/\\|?*]/g, "_");
    }

    var outputFile = outputDir + "/" + projectName + "_" + seqName + ".wav";

    // 预设文件路径 - 使用固定路径
    var sep = $.os.indexOf("Windows") !== -1 ? "\\" : "/";
    // 尝试从用户文档目录查找
    var pluginRoot = homePath + "/haoone/haoone_extension";
    var presetPath = pluginRoot + sep + "haoone.epr";
    var presetFile = new File(presetPath);

    // 如果找不到，尝试扩展目录
    if (!presetFile.exists) {
      // @ts-ignore - 通过 BridgeTalk 获取扩展路径
      var extPath = null;
      try {
        // 尝试从 app 路径推断
        if (app && app.path) {
          // @ts-ignore
          var appPath = app.path.toString();
          // Premiere Pro 扩展路径通常在 Plug-Ins 中
          var parts = appPath.split(sep);
          for (var i = parts.length - 1; i >= 0; i--) {
            if (parts[i] === "Plug-Ins" || parts[i] === "PlugIns") {
              // 向上找 CEP 目录
              var cepPath = parts.slice(0, i).join(sep) + sep + "CEP" + sep + "com.haoone";
              if (new Folder(cepPath).exists) {
                pluginRoot = cepPath;
                break;
              }
            }
          }
        }
      } catch (e) {
        // 忽略错误
      }
      presetPath = pluginRoot + sep + "haoone.epr";
      presetFile = new File(presetPath);
    }

    // 如果还找不到，使用本地开发路径
    if (!presetFile.exists) {
      // 尝试从脚本路径查找（开发时有效）
      // @ts-ignore
      var scriptPath = $.fileName || "";
      if (scriptPath && scriptPath.indexOf("src") > -1) {
        var pathParts = scriptPath.split(sep);
        var srcIndex = -1;
        for (var i = 0; i < pathParts.length; i++) {
          if (pathParts[i] === "src") {
            srcIndex = i;
            break;
          }
        }
        if (srcIndex > 0) {
          pathParts = pathParts.slice(0, srcIndex);
          pluginRoot = pathParts.join(sep);
        }
      }
      presetPath = pluginRoot + sep + "haoone.epr";
      presetFile = new File(presetPath);
    }

    // 检查预设文件是否存在
    if (!presetFile.exists) {
      return { success: false, error: "Preset not found: " + presetPath + "\nhomePath: " + homePath + "\npluginRoot: " + pluginRoot };
    }

    // 执行导出
    var result = activeSeq.exportAsMediaDirect(outputFile, presetFile.fsName, 0);

    // @ts-ignore - result 在 ExtendScript 中是数字类型
    if (result === 0) {
      return { success: true, filePath: outputFile, timelineName: seqName };
    } else {
      return { success: false, error: "Export failed: " + result };
    }
  } catch (e) {
    // @ts-ignore - e 是 ExtendScript 异常对象
    return { success: false, error: e.toString() };
  }
};

export const testExtendScript = (): string => {
  alert("ExtendScript 测试成功！");
  return "测试完成";
};

export const qeDomFunction = () => {
  if (typeof qe === "undefined") {
    app.enableQE();
  }
  if (qe) {
    qe.name;
    qe.project.getVideoEffectByName("test");
  }
};

export const helloWorld = () => {
  alert("Hello from Premiere Pro.");
};
