<template>
  <li class="skill" :class="[skillTypeClassname]">
    <v-tooltip top open-delay="100" nudge-right="75%" nudge-top="-5px">
      <template v-slot:activator="{ on }">
        <div v-on="on" class="skill__contents">
          <span v-for="index in 3"
          :key="index"
          class="skill__category"
          :class="{
            'skill__category--active': index <= level,
            'skill__category--inactive': index > level,
          }"></span>
          <span class="skill__label">
            <slot></slot>
          </span>
        </div>
      </template>
      <span>
        {{ title }} — {{ $localeConfig.i18n['SKILL__LABEL--CATEGORY'] }}
        <span class="skill__tooltip-category">
          {{ category }}
        </span>
      </span>
    </v-tooltip>
  </li>
</template>

<script>
export default {
  name: 'skill',
  props: ['level', 'category'],
  computed: {
    skillTypeClassname() { return `skill__category--${this.category}`; },
    title() {
      return this.$slots.default[0].text;
    },
  },
};
</script>

<style lang="scss">

  :root {
    --skill__category--color--frontend: #8BDAE0;
    --skill__category--color--tools: #5A5A5A;
    --skill__category--color--backend: #FFB96E;
    --skill__category--color--other: #FC6C73;

    --skill__category--size: 1rem;
  }
</style>

<style lang="scss" scoped>
  @import '../../../styles/styles.scss';

  $categories: frontend, tools, backend, other;

  .skill {
    list-style: none;
    padding: 0;
    margin: 0;

    margin-top: rem-size(20px);
    width: 100%;

    cursor: default;
  }

  .skill__contents {
    display: flex;

  }

  .skill__category {
    display: inline-flex;
    flex: 0 0 auto;
    width: var(--skill__category--size);
    height: var(--skill__category--size);
    border: 2px solid var(--root__color--border);
    background: none;

    margin-right: 6px;
  }

  .skill__tooltip-category {
    text-transform: capitalize;
  }

  @each $category in $categories {
    .skill__category--#{$category} + .skill__category--#{$category} {
      margin-top: rem-size(8px);
    }

    .skill__category--#{$category} .skill__category--active {
      background: var(--skill__category--color--#{$category});
    }
  }

  .skill__label {
    display: inline;
    margin-left: rem-size(5px);
  }
</style>

