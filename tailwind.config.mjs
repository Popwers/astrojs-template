/** @type {import('tailwindcss').Config} */
export default {
	darkMode: ['class'],
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px',
			},
		},
		fontSize: {
			sm: 'var(--small)',
			base: 'var(--base)',
			lg: 'var(--medium)',
			xl: 'var(--large)',
			'2xl': 'var(--extraLarge)',
			'3xl': 'var(--display)',
		},
		extend: {
			colors: {
				'blue-light': 'var(--blue_light)',
				'blue-saturated': 'var(--blue_saturated)',
				blue: 'var(--blue)',
				'blue-dark': 'var(--blue_dark)',
				'gradient-dark-blue': 'var(--gradient_dark_blue)',
				'gradient-saturated-blue': 'var(--gradient_saturated_blue)',
				'gradient-blue': 'var(--gradient_blue)',
			},
		},
	},
	plugins: [require('tailwindcss-animate')],
};
