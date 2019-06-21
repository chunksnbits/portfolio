const glob = require('glob');
const path = require('path');

function registerComponents(pattern) {

  const filepaths = glob.sync(path.join(__dirname, 'components/**/*.vue'));

  const components = filepaths.map(filepath => ({
    name: filepath.split('/').pop().replace(/.vue$/, ''),
    path: filepath,
  }))

  return components;
}

module.exports = {
  title: "Portfolio",
  base: '/portfolio/',
  head: [
    ['link', {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css?family=Roboto:300,400,500,700,900&display=swap'
    }],
  ],
  locales: {
    // The key is the path for the locale to be nested under.
    // As a special case, the default locale can use '/' as its path.
    '/': {
      lang: 'de-DE', // this will be set as the lang attribute on <html>
      description: 'Portfolio | Daniel Eissing',
      i18n: require('./i18n/de-DE.json'),
    },
    '/en/': {
      lang: 'en-EN',
      description: 'Portfolio | Daniel Eissing',
      i18n: require('./i18n/en-EN.json'),
    }
  },
  plugins: [
    ['@vuepress/register-components' , {
      components: registerComponents('components/**/*.vue'),
    }],
    ['container', {
      type: 'period',
      before: (args) => {
        args = args.split(':');

        const timeframe = args[0].trim();
        const type = args[1] ? args[1].trim() : null;

        const className = type ? `period--${ type }` : '';

        return `
          <period class="${ className }">
            <template v-slot:timeframe>
              <period-timeframe>
                ${ timeframe }
              </period-timeframe>
            </template>
          <div>
        `;
      },
      after: '</div></period>',
    }],
    ['container', {
      type: 'spacer',
      before: (height) => height ?
        `<div class="spacer" style="height: ${height}"></div>` :
        '<div class="spacer"></div>',
      after: '',
    }],
    ['container', {
      type: 'section',
      before: () => '<div class="section">',
      after: '</div>',
    }],
  ],
  markdown: {
    extendMarkdown: md => {
      md.use(require('markdown-it-link-attributes'), {
        pattern: /^\.\/docs\/.*/,
        attrs: {
          target: '_blank',
          rel: 'alternate',
          class: 'link link--document',
        }
      });
    },
    toc: {
      includeLevel: [2, 3],
    },

  },
}
