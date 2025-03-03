/**
 * @description Menu for the header and footer
 */
export default {
	header: [
		{
			link: '/',
			name: 'Accueil',
		},
		{
			link: '/menu1',
			name: 'Menu 1',
		},
		{
			link: '/menu2',
			name: 'Menu 2 + Sous menu',
			submenus: [
				{
					link: '/menu2/sousmenu1',
					name: 'Sous menu 1',
				},
				{
					link: '/menu2/sousmenu2',
					name: 'Sous menu 2',
				},
				{
					link: '/menu2/sousmenu3',
					name: 'Sous menu 3',
				},
				{
					link: '/menu2/sousmenu4',
					name: 'Sous menu 4',
				},
			],
		},
	],
	footer: [
		{
			link: '/',
			name: 'Accueil',
		},
		{
			link: '/menu1',
			name: 'Menu 1',
		},
	],
};
