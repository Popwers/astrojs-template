# Astro Starter Kit
![just-the-basics](https://github.com/withastro/astro/assets/2244813/a0a5533c-a856-4198-8470-2d67b1d7c554)

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
│   ├── favicon.svg
│   ├── icon.png
│   └── site.webmanifest
├── src/
    ├── actions/
│   ├── assets/
│   ├── components/
│   ├── data/
    ├── interfaces/
│   ├── layouts/
│   ├── lib/
    ├── middleware/
│   ├── pages/
    ├── stores/
│   └── styles/
├── astro.config.mjs
├── package.json
├── tailwind.config.mjs
└── tsconfig.json
└── Other config files...
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `node --run dev`             | Starts local dev server at `localhost:4321`      |
| `node --run build`           | Build your production site to `./dist/`          |
| `bun run preview`         | Preview your build locally, before deploying     |
| `node --run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `node --run astro -- --help` | Get help using the Astro CLI                     |

## 🚀 Deployment

This project uses a Docker-based deployment. The `Dockerfile` is set up to build and run the application in a production environment.

## 🛠 Technologies Used

- [Astro](https://astro.build)
- [React](https://reactjs.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Bun](https://bun.sh)
- [Strapi](https://strapi.io) (for API)
