module.exports = {
  title: "Daniel Eissing",
  host: 'localhost',
  head: [
    ['link', {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css?family=Roboto:300,400,500,700,900&display=swap'
    }],
    // ['script', {
    //   src: 'https://cdn.jsdelivr.net/gh/chunksnbits/technology-radar@latest/dist/webcomponent.js',
    //   async: true,
    // }],
  ],
  locales: {
    // The key is the path for the locale to be nested under.
    // As a special case, the default locale can use '/' as its path.
    '/': {
      lang: 'de-DE', // this will be set as the lang attribute on <html>
      description: 'Vue-powered Static Site Generator'
    },
    '/en/': {
      lang: 'en-EN',
      description: 'Vue 驱动的静态网站生成器'
    }
  },
  plugins: [
    ['container', {
      type: 'period',
      before: (timeframe) => `<period>
          <template v-slot:timeframe>
            <period-timeframe>
              ${timeframe}
            </period-timeframe>
          </template>
        <div>
      `,
      after: '</div></period>',
    }],
    ['container', {
      type: 'spacer',
      before: () => '<div class="spacer"></div>',
      after: '',
    }],
  ],
  markdown: {
    extendMarkdown: md => {
      md.use(require('markdown-it-link-attributes'), {
        pattern: /^\/docs\/.*/,
        attrs: {
          target: '_blank',
          rel: 'alternate',
          class: 'link link--document',
        }
      });
    },
  },
  //     md.use(require('markdown-it-container'), 'section', {
  //       validate: function (params) {
  //         return params.trim().match(/^ ?section\w*$/);
  //       },

  //       render: function (tokens, idx) {
  //         var m = tokens[idx].info.trim().match(/^ ?section\w*$/);

  //         if (tokens[idx].nesting === 0) {
  //           return `<portfolio-section>
  //             ${md.utils.escapeHtml(m[1])}
  //           </portfolio-section>`;
  //         } else {
  //           return '</div>\n';
  //         }
  //       }
  //     })
  //   },
  // },
  // chainWebpack: config => {
  //   config.module
  //     .rule('svg')
  //     .test(/\.svg$/)
  //     .use('raw-loader')
  //       .loader('raw-loader')
  //       .end();
  // },
}
