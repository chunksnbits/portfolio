module.exports = {
  title: "My VuePress Site",
  head: [
    [
      'link', {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css?family=Roboto:300,400,500,700,900&display=swap'
      }
    ]
  ],
  locales: {
    // The key is the path for the locale to be nested under.
    // As a special case, the default locale can use '/' as its path.
    '/': {
      lang: 'de-DE', // this will be set as the lang attribute on <html>
      title: 'VuePress',
      description: 'Vue-powered Static Site Generator'
    },
    '/en/': {
      lang: 'en-EN',
      title: 'VuePress',
      description: 'Vue 驱动的静态网站生成器'
    }
  },
  // chainWebpack: config => {
  //   config.module
  //     .rule('svg')
  //     .test(/\.svg$/)
  //     .use('raw-loader')
  //       .loader('raw-loader')
  //       .end();
  // },
}
