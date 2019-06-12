<template>
  <div>
    <h1>{{ $page.frontmatter.title }}</h1>
    <Content />
  </div>
</template>

<style>
  :root {
    --color-primary: #004B63;
  }

  html {
    font-family: Roboto, sans-serif !important;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-size: 15px;
    font-weight: 200;
    color: inherit;
  }

  .content__default a.header-anchor {
    font-size: 0.85em;
    float: left;
    margin-left: -0.87em;
    padding-right: 0.23em;
    margin-top: 0.125em;
    opacity: 0;
  }

  .content__default a.header-anchor:hover {
    text-decoration: none;
  }

  .content__default ul, ul li {
    margin: 0;
    padding: 0;
  }

  .content__default li {
    display: inline;
  }

  .content__default li::before {
    content: ' - ';
  }

  .content__default li:first-child::before {
    content: none;
  }

  .content__default h1, h2, h3, h4, h5, h6 {
    font-size: 1rem;
  }

  .content__default h1 {
    color: var(--color-primary);
    text-transform: uppercase;
  }

  .content__default h2 {
    font-weight: 200;
  }

  .content__default h3 {
    font-weight: 500;
  }
</style>

<script>
    export default {};
</script>
