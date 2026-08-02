import type { Config } from "tailwindcss";
import { themeConfig } from "@medsync/theme/tailwind.config";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "../../packages/ui/components/**/*.{ts,tsx}",
    "../../packages/ui/index.ts",
  ],
  ...themeConfig,
  plugins: [require("tailwindcss-animate")],
}

export default config;
