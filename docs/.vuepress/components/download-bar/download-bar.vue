<template>
  <div class="download-bar__overlay" :class="{ 'download-bar__overlay--active': active }" @click="$emit('close')">
    <v-snackbar v-model="active"
      :timeout="0"
      bottom
      right
      absolute
      multi-line
      auto-height
      class="download-bar">
      <v-card flat width="100%" dark>
        <v-list>
          <v-list-tile
            v-for="download in downloads"
            :href="download.url"
            :download="download.url"
            target="_blank"
            role="button"
            @click="$event => emitDownloaded($event)">
            <icon name="file" class="download-bar__action--icon"></icon>
            {{ download.label }}
          </v-list-tile>
        </v-list>
      </v-card>
    </v-snackbar>
  </div>
</template>

<script lang="ts">
  import icons from '../../public/assets/icons';

  const TIMEOUT__DOWNLOAD__DELAY = 5000;

  export default {
    name: 'download-bar',
    data() {
      return {
        icons,
      };
    },
    props: {
      active: Boolean,
      downloads: Array,
    },
    methods: {
      emitDownloaded: function(event) {
        setTimeout(() => this.active && this.$emit('close'), TIMEOUT__DOWNLOAD__DELAY);
        event.stopPropagation();
      }
    },
  }
</script>


<style lang="scss">
  @import '../../styles/styles';

  .download-bar .v-snack__content {
    padding: 0;
  }

  .download-bar__overlay {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    z-index: $root__z-index__download-bar;
    pointer-events: none;
  }

  .download-bar__overlay--active {
    pointer-events: all;
  }

  .download-bar__content.v-card__text {
    padding-top: 0;
    padding-bottom: 0;
  }

  .download-bar__toolbar .v-toolbar__content {
    padding: 0 !important;
  }

  .download-bar__action--icon {
    margin: 0 rem-size(15px) 0 rem-size(5px);
  }

  @include breakpoint-greater-equals('sm') {
    .download-bar.download-bar {
      transform: translateY(-1 * rem-size(10px));
      margin-right: rem-size(10px) !important;
    }
  }
</style>
