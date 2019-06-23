<template>
  <div class="period" v-if="initialized">
    <slot name="timeframe"></slot>
    <div class="period__content">
      <slot></slot>
    </div>
  </div>
</template>

<script>
export default {
  name: 'period',
  // Fixes an issue for production build of unclear
  // origin (@todo: recheck with upcoming vuepress updates).
  //
  // reference: https://github.com/nuxt/nuxt.js/issues/1552
  mounted() {
    setTimeout(() => {
      this.initialized = true;
    })
  },
  data() {
    return {
      initialized: false,
    };
  }
};
</script>

<style lang="scss" scoped>
  @import '../../styles/styles.scss';

  .period {
    margin-bottom: $root__section--margin-bottom;
    padding-left: rem-size(44px);
    position: relative;

    ul, ul li {
      margin: 0;
      padding: 0;
    }

    a, a:link {
      text-decoration: none;
    }

    ul {
      margin-bottom: rem-size(10px);
    }

    ul + p {
      margin-bottom: 0.8rem;
    }

    li {
      display: flex;
      line-height: 1.667rem;
      justify-content: left;
    }

    li p {
      display: flex;
      flex: 1 1 100%;
      margin: 0;
    }

    li::before {
      content: '-';

      display: flex;
      flex-basis: rem-size(3px);
      flex-shrink: 0;
      flex-grow: 0;
      width: rem-size(3px);
      height: rem-size(1px);
      margin-right: rem-size(7px);
      background: var(--color-primary);
    }
  }

  @mixin period__layout--desktop {
    .period {
      margin-bottom: rem-size(36px);
      padding-left: rem-size(90px);
    }
  }

  @include breakpoint-greater('sm') {
    @include period__layout--desktop;
  }

  @media print {
    @include period__layout--desktop;

    .period {
      margin-bottom: 0;
    }

    .period {
      h5, h4, ul {
        page-break-after: avoid;
        page-break-before: avoid;
        page-break-inside: avoid;
      }

      h4 {
        page-break-before: auto;
      }

      ul {
        page-break-after: auto;
      }

      li {
        display: inline;
        line-height: rem-size(19px);
      }

      li p {
        display: inline;
      }

      li::before {
        content: ' - ';
        display: inline;
      }

      li:first-child::before {
        content: none;
      }
    }
  }

</style>

