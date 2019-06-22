<template>
  <div class="language-select" :class="{ 'language-select--compact': compact }">
    <template v-for="(language, index) of languages">
      <v-btn flat small
        @click="propagateSelect(language)"
        class="language-select__action"
        :input-value="language.locale === $lang"
        active-class="language-select__action--active">
        {{ $localeConfig.i18n[`ROOT__LABEL--LANGUAGE_SELECT_${language.label}`] }}
      </v-btn>
      <span class="language-select__separator"
        v-if="index + 1 < languages.length">|</span>
    </template>
  </div>
</template>

<script>

export default {
  name: 'language-select',
  props: {
    languages: {
      type: Array,
      default: [],
    },
    compact: {
      type: Boolean,
      default: false,
    }
  },
  methods: {
    propagateSelect(language) {
      this.$emit('select', language);
    },
  },
};
</script>

<style lang="scss" scoped>
  @import '../../styles/styles.scss';

  .language-select {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-right: rem-size(10px);
  }

  .language-select--compact {
    .language-select__separator,
    .language-select__action {
      display: none;
    }

    .language-select__action--active {
      display: block;
    }
  }

  .language-select__action {
    padding: rem-size(10px) rem-size(12px);
    width: auto;
    min-width: 0;
    height: auto;
    min-height: 0;
    line-height: 1;
    font-weight: 100;
  }

  .language-select__action--active {
    font-weight: 900;
  }

  .language-select__action:last-child::after {
    content: none;
  }

  .language-select__action:not(:hover)::before {
    background: none;
  }

  @include breakpoint-greater('sm') {
  }
</style>
