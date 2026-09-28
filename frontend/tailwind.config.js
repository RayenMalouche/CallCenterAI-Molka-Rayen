/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // One palette, strict roles — see README "The design".
      colors: {
        cream: "#EDE4CF", // page ground, enamel wall
        faceplate: "#F7F1E3", // card and panel surfaces
        bakelite: "#2A1C13", // primary type and the switchboard mass
        walnut: "#4A3426", // cabinet wood, secondary mass
        graphite: "#6E6052", // secondary text
        brass: "#A8833A", // hardware: jack rims, rules, borders
        lamp: "#F0A73A", // a lit lamp — live and active states only
        cord: "#9A3324", // the patch cord, and faults. Nothing else
      },
      fontFamily: {
        display: ['"Big Shoulders Display"', "Impact", "sans-serif"],
        sans: ['"Public Sans"', "system-ui", "sans-serif"],
        type: ['"Courier Prime"', '"Courier New"', "monospace"],
      },
      keyframes: {
        ring: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0.15" },
        },
      },
      animation: {
        ring: "ring 0.9s steps(1) infinite",
      },
    },
  },
  plugins: [],
};
