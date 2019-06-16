<template>
  <v-app light class="root" :class="{ 'root--drawer-active': tableOfContents }">

    <v-navigation-drawer app right :mobile-break-point="infinity"
      :value="tableOfContents"
      @input="setTableOfContents">

      <v-toolbar absolute flat dense class="root__page-toolbar-drawer">
        <v-spacer></v-spacer>
        <v-toolbar-items>
          <v-btn flat icon @click="tableOfContents = false">
            <icon name="clear" width="15px" height="15px"></icon>
          </v-btn>
        </v-toolbar-items>

      </v-toolbar>
      <table-of-contents class="root__page-table-of-contents">
        <h2>
          Table of Contents
        </h2>

        <Content slot-key="table-of-contents" />
      </table-of-contents>
    </v-navigation-drawer>

    <v-toolbar app flat fixed dense
      scroll-off-screen
      class="root__page-toolbar">
      <v-toolbar-title class="root__page-toolbar-title">
        <h1 class="root__page-title">
          {{ $page.frontmatter.title }} | {{ $page.frontmatter.subtitle }}
        </h1>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-toolbar-items class="root__page-toolbar-items">
        <v-btn flat icon @click="tableOfContents = true">
          <icon name="list" width="20px" height="20px"></icon>
        </v-btn>
      </v-toolbar-items>
    </v-toolbar>
    <div class="root__page">
      <div class="root__page-body">
        <main class="root__page-main">
          <Content />
        </main>
        <aside class="root__page-sidebar">
          <outline :outline="$page.frontmatter"></outline>
        </aside>
      </div>
    </div>
  </v-app>
</template>

<script>
export default {
  data() {
    console.log('+++ data', Number.POSITIVE_INFINITY);

    return {
      tableOfContents: false,

      // Disables mobile breakpoint for
      // application drawer, i.e.,
      // all layouts are handled the same.
      infinity: Number.MAX_SAFE_INTEGER,
    };
  },
  methods: {
    setTableOfContents(value) {
      console.log('+++ value', value);
      this.tableOfContents = value;
    },
  },
}
</script>


<style lang="scss">
  @import '../styles/styles.scss';

  :root {
    --root__color--text: rgba(0, 0, 0, 0.85);
    --root__color--primary: #004B63;
    --root__color--border: #5A5A5A;
    --root__color--link: #00618E;
  }

  .root {
    display: flex;
    flex-direction: row;
    justify-content: center;
    width: 100%;
    transition: padding-right .2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .root .application--wrap {
    align-items: center;
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
    scroll-behavior: smooth;
    scroll-padding-top: rem-size(15px);
  }

  h1, h2, h3, h4, h5, h6 {
    font-size: 1rem;
  }

  .root__page-title {
    font-size: 20px;
    font-weight: 500;
    letter-spacing: .02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  h2 {
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

  h3 {
    font-weight: 200;
    margin-bottom: rem-size(5px);

    strong {
      font-weight: 900;
    }
  }

  h4, h5 {
    font-weight: 400;
    margin-bottom: rem-size(5px);
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

  a.link--document::after {
    content: '';
    display: inline-block;
    position: relative;
    font-size: 0.7rem;
    width: rem-size(8px);
    height: rem-size(8px);
    vertical-align: baseline;
    margin-left: rem-size(4px);
    top: rem-size(-2px);
    background-image: $root__icons--launch;
    background-size: contain;
  }

  .root__page-toolbar-drawer.root__page-toolbar-drawer {
    background: none;
  }

  .root__page-toolbar.root__page-toolbar {
    background: white;
  }

  .root__page-toolbar-drawer .v-toolbar__content,
  .root__page-toolbar .v-toolbar__content {
    justify-content: center;
    align-items: flex-end;
    padding: 0;
  }

  .root__page-toolbar {
    justify-content: center;
    align-content: center;
    display: flex;
    flex-direction: row;
    justify-content: center;
  }

  .root__page-toolbar .v-toolbar__content {
    display: flex;
    width: 100%;
    max-width: $root__page-max-width;
    padding: 0;
  }

  .root__page-toolbar-title {
    padding: 0 rem-size(20px) rem-size(5px);
  }

  .root__page-title {
    color: var(--root__color--primary);
    border-bottom: 2px solid var(--root__color--border);
  }

  .root__page {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: rem-size(50px) rem-size(20px) rem-size(10px);
    max-width: $root__page-max-width;
    box-sizing: border-box;
  }

  .root__page-body {
    display: flex;
    flex-direction: column;
    flex: 1 1 100%;
  }

  .root__page-main {
    display: flex;
    flex: 1 1 100%;
    flex-direction: column;
    order: 1;
  }

  .root__page-main h2:not(:first-child) {
    margin-top: $root__section--margin-bottom;
  }

  .root__page-sidebar {
    display: flex;
    flex-direction: column;
    flex: 1 1 100%;
    overflow: hidden;
    order: 0;
    margin-bottom: rem-size(40px);
    padding-top: rem-size(50px);
  }

  .table-of-contents {
    margin-bottom: $root__section--margin-bottom;
  }

  .root__page-table-of-contents {
    padding: rem-size(14px) rem-size(20px) !important;
  }

  @mixin root-desktop-layout {
    .root__page {
      flex-direction: column;
    }

    .root__page-body {
      flex-direction: row;
      justify-content: space-between;
      order: 0;
    }

    .root__page-toolbar .v-toolbar__content {
      padding: 0 rem-size(20px);
    }

    .root__page-toolbar-title {
      padding-left: rem-size(30px);
      padding-right: rem-size(30px);
    }

    .root__page-main {
      padding: rem-size(57px) rem-size(30px) rem-size(100px);
      max-width: $root__main-content-max-width;
    }

    .root__page-sidebar {
      order: 1;
      flex-grow: 0;
      flex-shrink: 0;
      flex-basis: $root__sidebar-width;
      max-width: $root__sidebar-width;
      margin-bottom: 0;
      padding-top: rem-size(57px);
    }
  }

  p {
    margin-bottom: 0.5rem;
  }

  @include breakpoint-greater('sm') {
    @include root-desktop-layout;
  }

  @page {
    margin: 2cm 0.75cm;
  }

  @page:first {
    margin-top: 1cm;
  }

  @media print {
    @include root-desktop-layout;

    body {
      display: table;
      table-layout: fixed;
      padding-top: 2.5pt;
      height: auto;
    }

    html,
    .application.theme--light {
      font-size: $root__base-size--print;
    }

    .root__page-sidebar {
      flex-basis: $root__sidebar-width--print;
      max-width: $root__sidebar-width--print;
      padding-top: rem-size(54px);
    }

    .root__page-main {
      max-width: calc(100vw - #{$root__sidebar-width--print + 0.75 * $root__main-max-space});
      padding-top: rem-size(54px);
      padding-bottom: 0;
    }

    .root__page-toolbar {
      display: none !important;
    }

    a,
    a.link {
      color: var(--root__color--text) !important;
    }
  }
</style>

