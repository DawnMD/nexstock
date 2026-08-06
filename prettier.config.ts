import type { Config } from "prettier";
import type { PluginOptions } from "prettier-plugin-tailwindcss";

const config: Config & PluginOptions = {
  singleQuote: false,
  plugins: ["prettier-plugin-tailwindcss"],
};

export default config;
