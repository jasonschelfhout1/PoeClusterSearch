# PoeClusterSearch

(node:8156) [DEP_WEBPACK_DEV_SERVER_ON_BEFORE_SETUP_MIDDLEWARE] DeprecationWarning: 'onBeforeSetupMiddleware' option is deprecated. Please use the 'setupMiddlewares' option.
Starting the development server...
Failed to compile.

Error: It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin. The PostCSS plugin has moved to a separate package, so to continue using Tailwind CSS with PostCSS you'll need to install `@tailwindcss/postcss` and update your PostCSS configuration.
ERROR in ./src/App.css (./node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[1].oneOf[5].use[1]!./node_modules/postcss-loader/dist/cjs.js??ruleSet[1].rules[1].oneOf[5].use[2]!./node_modules/source-map-loader/dist/cjs.js!./src/App.css)
Module build failed (from ./node_modules/postcss-loader/dist/cjs.js):
Error: It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin. The PostCSS plugin has moved to a separate package, so to continue using Tailwind CSS with PostCSS you'll need to install `@tailwindcss/postcss` and update your PostCSS configuration.
at at (C:\Users\jason\repos\PoeClusterSearch\node_modules\tailwindcss\dist\lib.js:38:1643)
at LazyResult.runOnRoot (C:\Users\jason\repos\PoeClusterSearch\node_modules\postcss\lib\lazy-result.js:361:16)
at LazyResult.runAsync (C:\Users\jason\repos\PoeClusterSearch\node_modules\postcss\lib\lazy-result.js:290:26)
at LazyResult.async (C:\Users\jason\repos\PoeClusterSearch\node_modules\postcss\lib\lazy-result.js:192:30)
at LazyResult.then (C:\Users\jason\repos\PoeClusterSearch\node_modules\postcss\lib\lazy-result.js:436:17)
at async Object.loader (C:\Users\jason\repos\PoeClusterSearch\node_modules\postcss-loader\dist\index.js:97:14)

ERROR in ./src/index.css (./node_modules/css-loader/dist/cjs.js??ruleSet[1].rules[1].oneOf[5].use[1]!./node_modules/postcss-loader/dist/cjs.js??ruleSet[1].rules[1].oneOf[5].use[2]!./node_modules/source-map-loader/dist/cjs.js!./src/index.css)
Module build failed (from ./node_modules/postcss-loader/dist/cjs.js):
Error: It looks like you're trying to use `tailwindcss` directly as a PostCSS plugin. The PostCSS plugin has moved to a separate package, so to continue using Tailwind CSS with PostCSS you'll need to install `@tailwindcss/postcss` and update your PostCSS configuration.
at at (C:\Users\jason\repos\PoeClusterSearch\node_modules\tailwindcss\dist\lib.js:38:1643)
at LazyResult.runOnRoot (C:\Users\jason\repos\PoeClusterSearch\node_modules\postcss\lib\lazy-result.js:361:16)
at LazyResult.runAsync (C:\Users\jason\repos\PoeClusterSearch\node_modules\postcss\lib\lazy-result.js:290:26)
at LazyResult.async (C:\Users\jason\repos\PoeClusterSearch\node_modules\postcss\lib\lazy-result.js:192:30)
at LazyResult.then (C:\Users\jason\repos\PoeClusterSearch\node_modules\postcss\lib\lazy-result.js:436:17)
at async Object.loader (C:\Users\jason\repos\PoeClusterSearch\node_modules\postcss-loader\dist\index.js:97:14)
