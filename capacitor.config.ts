import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lannkyaung.app",
  appName: "Lann Kyaing",
  webDir: "dist",
  server: {
    androidScheme: "https"
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: false, // Pure boolean, 100% safe for the build runner
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
