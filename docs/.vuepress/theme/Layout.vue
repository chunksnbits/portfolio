<template>
  <div class="page">
    <main class="page__main">
      <Content />
    </main>
    <aside class="page__sidebar">
      <outline :outline="$page.frontmatter"></outline>
    </aside>
  </div>
</template>

<script>
export default {}
</script>



<style lang="scss">
  :root {
    --color-primary: #004B63;
    --color-primary__border: #5A5A5A;
  }

  #app {
    display: flex;
    flex-direction: row;
    justify-content: center;
  }

  html {
    font-family: Roboto, sans-serif !important;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    font-size: 15px;
    font-weight: 200;
    color: inherit;
  }

  h1, h2, h3, h4, h5, h6 {
    font-size: 1rem;
  }

  h1 {
    color: var(--color-primary);
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
  }

  h3 {
    font-weight: 500;
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

  .page {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
    padding: 50px;
    box-sizing: border-box;
    max-width: 1024px;
  }

  .page__main {
    display: flex;
    flex-direction: columns;
    flex: 1 1 100%;

    padding: 76px 20px 100px;
    max-width: 700px;
  }

  .page__sidebar {
    display: flex;
    flex-direction: column;
    flex: 0 0 240px;
  }

  .content_default {

    ul, ul li {
      margin: 0;
      padding: 0;
    }

    li {
      display: inline;
    }

    li::before {
      content: ' - ';
    }

    li:first-child::before {
      content: none;
    }
  }
</style>
