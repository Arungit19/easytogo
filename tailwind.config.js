/** @type {import('tailwindcss').Config} */
module.exports = {
   
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",       // ✅ app directory
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",      // ✅ pages directory  
    "./components/**/*.{js,ts,jsx,tsx,mdx}", // ✅ components (Navbar!)
    "./src/**/*.{js,ts,jsx,tsx,mdx}",        // ✅ if using src/
  ],
  theme: { extend: {} },
  plugins: [],
}