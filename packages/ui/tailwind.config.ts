import type { Config } from "tailwindcss";
import { themeConfig } from "@medsync/theme/tailwind.config";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./**/*.{ts,tsx}",
  ],
  ...themeConfig,
  plugins: [require("tailwindcss-animate")],
}

export default config;
