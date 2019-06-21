<template>
  <v-app light class="root" :class="{ 'root--drawer-active': tableOfContents }">

    <v-navigation-drawer app right :mobile-break-point="infinity"
      :value="tableOfContents"
      @input="setTableOfContents"
      class="root__application-drawer">

      <v-toolbar fixed flat dense class="root__application-bar-drawer">
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

    <v-toolbar flat fixed dense
      scroll-off-screen
      class="root__application-bar">
      <div class="root__application-bar-content">
      </div>
      <v-toolbar-title class="root__application-bar-title">
        <h1 class="root__page-title">
          {{ $page.frontmatter.title }} | {{ $page.frontmatter.subtitle }}
        </h1>
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <v-toolbar-items class="root__application-bar-items">
        <span class="root__language-select">
          <v-btn flat small to="/"
            class="root__application-bar-btn root__application-bar-btn--small root__language-select-action"
            active-class="root__language-select-action--active">
            DE
          </v-btn>
          |
          <v-btn flat small to="/en"
            class="root__application-bar-btn root__application-bar-btn--small root__language-select-action"
            active-class="root__language-select-action--active">
            EN
          </v-btn>
        </span>

        <v-btn flat small @click="tableOfContents = true" class="root__application-bar-btn root__application-bar-btn--small">
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
    <v-footer app light absolute height="auto" class="root__footer">
      <v-card class="root__footer-main" flat tile>
        <v-card-title class="root__footer-title">
          <span class="root__footer-copyright">
            &copy;{{ copyright.year }}
            — <strong>{{ copyright.author }}</strong>
          </span>
          <span class="root__footer-meta">
            Version: {{ packageVersion }}
          </span>
        </v-card-title>
      </v-card>
    </v-footer>
  </v-app>
</template>

<script>
import { version as packageVersion } from '../../../package.json';
import './Layout.styles.scss';

export default {
  data() {
    return {
      tableOfContents: false,

      // Disables mobile breakpoint for
      // application drawer, i.e.,
      // all layouts are handled the same.
      infinity: Number.MAX_SAFE_INTEGER,
    };
  },
  computed: {
    copyright() {
      return {
        year: new Date().getFullYear(),
        author: this.$page.frontmatter.author,
      };
    },
    packageVersion() {
      return packageVersion;
    }
  },
  methods: {
    setTableOfContents(value) {
      this.tableOfContents = value;
    },
  },
}
</script>

