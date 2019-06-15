<template>
  <v-app none>
    <div class="page">
    <main class="page__main">
      <Content />

    </main>
    <aside class="page__sidebar">
      <outline :outline="$page.frontmatter"></outline>
    </aside>
  </div>
</v-app>
</template>

<script>
export default {}
</script>


<style lang="scss">
  @import '../styles/variables.scss';
  @import '../styles/functions.scss';

  :root {
    --root__color--text: rgba(0, 0, 0, 0.85);
    --root__color--primary: #004B63;
    --root__color--border: #5A5A5A;
    --root__color--link: #00618E;
  }

  #app {
    display: flex;
    flex-direction: row;
    justify-content: center;
  }

  html,
  .application.theme--light {
    background: none;
    color: var(--root__color--text);
    font-family: Roboto, sans-serif !important;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-size: $root__base-size;
    font-weight: 200;
  }

  h1, h2, h3, h4, h5, h6 {
    font-size: 1rem;
  }

  h1 {
    color: var(--root__color--primary);
    text-transform: uppercase;
    display: inline-block;
    margin-bottom: 10px;

    &:after {
      content: '';
      display: block;
      border: 1px solid black;
      margin-top: 5px;
    }
  }

  h2 {
    font-weight: 200;
    margin-bottom: rem-size(10px);

    strong {
      font-weight: 900;
    }
  }

  h3 {
    font-weight: 400;
    margin-bottom: rem-size(0);
  }

  a.header-anchor {
    font-size: 0.85em;
    float: left;
    margin-left: -0.87em;
    padding-right: 0.23em;
    margin-top: 0.125em;
    opacity: 0;
  }

  a.header-anchor:hover {
    text-decoration: none;
  }

  a.link {
    color: var(--root__color--link);
  }

  .page {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
    padding: rem-size(50px);
    box-sizing: border-box;
    max-width: $root__page-max-width;
  }

  .page__main {
    display: flex;
    flex-direction: columns;
    flex: 1 1 100%;

    padding: rem-size(76px) rem-size(20px) rem-size(100px);
    max-width: $root__main-content-max-width;
  }

  .page__sidebar {
    display: flex;
    flex-direction: column;
    flex-grow: 0;
    flex-shrink: 0;
    flex-basis: $root__sidebar-width;
    max-width: $root__sidebar-width;
    overflow: hidden;
  }

  .content_default {

    ul, ul li {
      margin: 0;
      padding: 0;
    }

    li {
      display: inline;
  @media print {
    html {
      font-size: $root__base-size--print;
    }

    .page__sidebar {
      flex-basis: $root__sidebar-width--print;
      max-width: $root__sidebar-width--print;
    }
  }
</style>

