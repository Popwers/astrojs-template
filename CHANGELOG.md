# 1.0.0 (2026-09-23)


### Bug Fixes

* **build:** stop csso from stripping Tailwind 4 responsive media queries ([b273744](https://github.com/Popwers/astrojs-template/commit/b273744a96b966bc86d597a0832080294a173e80))
* **docker:** keep build-only deps out of the runtime image ([5159d1b](https://github.com/Popwers/astrojs-template/commit/5159d1bc392b4831128c17d162094d541605a584))
* fix typo ([3d3333c](https://github.com/Popwers/astrojs-template/commit/3d3333cf87da47f81c67f255d1c68af02c65e1b6))
* harden auth cookies and Docker secrets ([#2](https://github.com/Popwers/astrojs-template/issues/2)) ([9d49a2c](https://github.com/Popwers/astrojs-template/commit/9d49a2cdf682e0915b0e4a5809bc7e8b508604c6))
* **lint:** gate @shadcn/lint on install ([573a36f](https://github.com/Popwers/astrojs-template/commit/573a36f7fcdc04d71bcfa1691cfdcb082acb16f1))
* **lint:** type JS plugin rules for DummyRuleMap ([117969e](https://github.com/Popwers/astrojs-template/commit/117969eba83c2ea414411d44da818c44e040eea1))
* **release:** run semantic-release on master and read Sentry DSN from env ([9f8bb1f](https://github.com/Popwers/astrojs-template/commit/9f8bb1f2762768bf3d66506c7dba185916e5b396))
* **test:** assert JSON body type with a Vitest matcher anti-slop accepts ([10e63e6](https://github.com/Popwers/astrojs-template/commit/10e63e64f83d0706a614dff371b08e9db3ed4a1b))


### Features

* add typescript, husky and semantic release ([779606c](https://github.com/Popwers/astrojs-template/commit/779606c252fdd33c32aba5adf864fbfae13a1ded))
* **avatar:** client-side compression + derive Action body limit from upload constants ([43300a1](https://github.com/Popwers/astrojs-template/commit/43300a1d32b8ce1e4de4d3379606f298c47f6709))
* **avatar:** spinner pendant la préparation de l'image de profil ([2e70564](https://github.com/Popwers/astrojs-template/commit/2e7056406dc7083b04a65f855aecb55970605352))
* enable React Compiler (vite plugin-react) ([#6](https://github.com/Popwers/astrojs-template/issues/6)) ([8cc8647](https://github.com/Popwers/astrojs-template/commit/8cc86479fc5cd110b2f764efdd9e87428612b105))
* introduce strapi and auth actions on the base. Plus add some great tool for SEO, Schema.org ([068fbba](https://github.com/Popwers/astrojs-template/commit/068fbbaa6f740ef2d970f87824ae7ea8895d1184))


### Performance Improvements

* **build:** enable experimental Rust compiler for .astro files ([a6eb10f](https://github.com/Popwers/astrojs-template/commit/a6eb10f7b6f73d8b6a4c418859e6b81309f88be5))
* **docker:** move build-only deps to devDependencies for lean prod image ([582d98e](https://github.com/Popwers/astrojs-template/commit/582d98e016646e722cdefad0980dddfa30e226a8))
* **front:** hydrate password islands with client:idle ([48ee47e](https://github.com/Popwers/astrojs-template/commit/48ee47e3fd399502f9a094fd02308b4ce4cf5afe))
* self-host fonts, per-package chunks (excl astro), prerender legal pages, optimistic avatar ([bb8a6e8](https://github.com/Popwers/astrojs-template/commit/bb8a6e8f51f231404e9738040547577985536bc9))


### Reverts

* Revert "feat: enable React Compiler (vite plugin-react) ([#6](https://github.com/Popwers/astrojs-template/issues/6))" ([#9](https://github.com/Popwers/astrojs-template/issues/9)) ([a3e46f1](https://github.com/Popwers/astrojs-template/commit/a3e46f15515dd8ebb6e4ddf1a12dcc2df0d9b795))
