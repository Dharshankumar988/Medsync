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
    "../../packages/ui/buttons/**/*.{ts,tsx}",
    "../../packages/ui/cards/**/*.{ts,tsx}",
    "../../packages/ui/charts/**/*.{ts,tsx}",
    "../../packages/ui/dialogs/**/*.{ts,tsx}",
    "../../packages/ui/forms/**/*.{ts,tsx}",
    "../../packages/ui/icons/**/*.{ts,tsx}",
    "../../packages/ui/inputs/**/*.{ts,tsx}",
    "../../packages/ui/layouts/**/*.{ts,tsx}",
    "../../packages/ui/loaders/**/*.{ts,tsx}",
    "../../packages/ui/tables/**/*.{ts,tsx}"
  ],
  ...themeConfig,
  plugins: [require("tailwindcss-animate")],
}

export default config;
