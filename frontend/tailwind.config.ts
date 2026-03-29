import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { 50: "#f0f9ff", 500: "#0ea5e9", 900: "#0c4a6e" },
        // AlphaFold confidence palette
        conf: {
          vhigh: "#0053d6",  // Very High - blue
          high: "#65cbf3",   // High - cyan
          medium: "#ffdb13", // Medium - yellow
          low: "#ff7d45",    // Low - orange
          vlow: "#ff0000",   // Very Low - red
        },
      },
    },
  },
  plugins: [],
};
export default config;
