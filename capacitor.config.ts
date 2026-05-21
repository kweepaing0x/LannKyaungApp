import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lannkyaung.app",
  appName: "Lann Kyaing",
  webDir: "dist",
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0d0d0d",
      showSpinner: false,
    },
    StatusBar: {
      style: "Dark",
      backgroundColor: "#0d0d0d",
    },
  },
};

export default config;
