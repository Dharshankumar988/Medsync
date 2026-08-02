import type { Config } from "tailwindcss";
import { themeConfig } from "@medsync/theme/tailwind.config";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "../../packages/ui/components/**/*.{ts,tsx}",
    "../../packages/ui/index.ts",
  ],
  presets: [require("nativewind/preset")],
  ...themeConfig,
}

export default config;
