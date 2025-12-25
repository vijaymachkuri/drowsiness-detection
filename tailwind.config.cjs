/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                'display': ['Orbitron', 'sans-serif'],
                'sans': ['Rajdhani', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
