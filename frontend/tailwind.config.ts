import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        // ---- "Study Desk" palette ----
        // A warm paper backdrop with punchy sticky-note accent colors,
        // used to color-code flashcard sets and review states.
        paper: "#FBF6EC",
        ink: "#241F1A",
        coral: {
          DEFAULT: "#FF6B5B",
          dark: "#E2483A",
          light: "#FFE3DE",
        },
        mint: {
          DEFAULT: "#2FBF8F",
          dark: "#1E9A72",
          light: "#DBF6EA",
        },
        sunshine: {
          DEFAULT: "#FFC23C",
          dark: "#E8A100",
          light: "#FFF3D6",
        },
        sky: {
          DEFAULT: "#3DA9FC",
          dark: "#2186DA",
          light: "#DDEEFF",
        },
        grape: {
          DEFAULT: "#9B6BFF",
          dark: "#7A45E8",
          light: "#EDE3FF",
        },
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      boxShadow: {
        card: "0 6px 0 0 rgba(36,31,26,0.12)",
        "card-hover": "0 10px 0 0 rgba(36,31,26,0.14)",
        pop: "0 4px 14px rgba(36,31,26,0.18)",
      },
      borderRadius: {
        blob: "2rem",
      },
    },
  },
  plugins: [],
};
export default config;
