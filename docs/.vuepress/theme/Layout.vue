<template>
  <v-app light class="root" :class="{ 'root--drawer-active': tableOfContents }">

    <v-navigation-drawer app right :mobile-break-point="infinity"
      :value="tableOfContents"
      @input="setTableOfContents"
      class="root__application-drawer">

      <v-toolbar fixed flat dense class="root__drawer-navigation-bar">
        <language-select
          class="root__language-select--navigation-drawer"
          :languages="languages"
          @select="setActiveLanguage">
        </language-select>
        <v-spacer></v-spacer>
        <v-toolbar-items>
          <v-btn flat icon @click="tableOfContents = false">
            <icon name="clear" width="15px" height="15px"></icon>
          </v-btn>
        </v-toolbar-items>
      </v-toolbar>

      <div class="root__drawer-content">
        <table-of-contents class="root__page-table-of-contents">
          <h2>
            {{ $localeConfig.i18n['ROOT__LABEL--TABLE_OF_CONTENTS'] }}
          </h2>

          <Content slot-key="table-of-contents" />
        </table-of-contents>
      </div>
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
        <language-select
          class="root__language-select--application-bar"
          :languages="languages"
          compact
          @select="setActiveLanguageBreakpointAware">
        </language-select>

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
    <actions class="root__actions">
      <action @click="openDownloadBar()">
        <icon name="download"></icon>
      </action>
    </actions>
    <download-bar
      :active="downloads"
      :downloads="$page.frontmatter.downloads"
      @close="downloads = false"
      class="root__download-bar">
    </download-bar>
    <v-footer app light absolute height="auto" class="root__footer">
      <v-card class="root__footer-main" flat tile>
        <v-card-title class="root__footer-title">
          <span class="root__footer-copyright">
            <span>&copy;</span>
            {{ copyright.year }}
            —
            <strong>{{ copyright.author }}</strong>
          </span>
          <span class="root__footer-meta">
            {{ $localeConfig.i18n['ROOT__LABEL--FOOTER_VERSION'] }}: {{ packageVersion }}
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
  async mounted() {
    this.$breakpoints = await import('../styles/breakpoints');
  },
  data() {
    return {
      tableOfContents: false,

      // Disables mobile breakpoint for
      // application drawer, i.e.,
      // all layouts are handled the same.
      infinity: Number.MAX_SAFE_INTEGER,
      languages: [{
        label: 'EN',
        locale: 'en-EN',
        path: '/en',
      }, {
        label: 'DE',
        locale: 'de-DE',
        path: '/',
      }],
      downloads: false,
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
    openDownloadBar() {
      this.downloads = true;
    },
    setTableOfContents(value) {
      this.tableOfContents = value;
    },
    setActiveLanguageBreakpointAware(language) {
      if (this.$breakpoints.isBreakpointGreaterEquals('md')) {
        return this.setActiveLanguage(language);
      }
      this.tableOfContents = true;
    },
    setActiveLanguage(language) {
      return this.$router.push(language.path);
    }
  },
}
</script>

