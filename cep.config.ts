import { CEP_Config } from "vite-cep-plugin";
import { version } from "./package.json";

const config: CEP_Config = {
  version,
  id: "com.haoone", 
  displayName: "haoone", 
  symlink: "local",
  port: 3000,
  servePort: 5000,
  startingDebugPort: 8860,
  extensionManifestVersion: 5.0,
  requiredRuntimeVersion: 5.0,
  hosts: [
    { name: "PPRO", version: "[0.0,99.9]" }, 
  ],

  type: "Panel",
  parameters: [
    "--v=0",
    "--enable-nodejs",
    "--mixed-context",
    "--allow-file-access-from-files",
    "--allow-file-access",
  ],
  width: 500,
  height: 450,

  panels: [
    {
      mainPath: "./main/index.html",
      name: "main",
      panelDisplayName: "haoone",
      autoVisible: true,
      width: 600,
      height: 500,
    },
  ],
  build: {
    jsxBin: "off",
    sourceMap: true,
  },
  zxp: {
    country: "US",
    province: "CA",
    org: "Company",
    password: "password",
    tsa: [
      "http://timestamp.digicert.com/", // Windows Only
      "http://timestamp.apple.com/ts01", // MacOS Only
    ],
    allowSkipTSA: true,
    sourceMap: false,
    jsxBin: "off",
  },
  installModules: [],
  copyAssets: [],
  copyZipAssets: [],
};
export default config;
