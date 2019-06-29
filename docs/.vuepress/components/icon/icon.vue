<template>
  <svg xmlns="http://www.w3.org/2000/svg"
    :width="safeWidth"
    :height="safeHeight"
    viewBox="0 0 18 18"
    :aria-labelledby="'icon--' + name"
    role="presentation"
    class="icon"
  >
    <title
      :id="'icon--' + name"
      lang="en"
    >{{ name }} icon</title>
    <g :fill="iconColor" v-html="icons[name] || name"></g>
  </svg>
</template>

<script>

import icons from '../../public/assets/icons';

export default {
  name: 'icon',
  data() {
    return {
      icons
    };
  },
  computed: {
    safeWidth() {
       return this.width || this.size || 18;
    },
    safeHeight() {
       return this.width || this.size || 18;
    },
  },
  props: {
    name: {
      type: String,
      default: 'box'
    },
    width: {
      type: [Number, String],
      default: null
    },
    height: {
      type: [Number, String],
      default: null
    },
    size: {
      type: [Number, String],
      default: null
    },
    iconColor: {
      type: String,
      default: 'currentColor'
    }
  }
};
</script>

<style lang="scss" scoped>
  .icon {

  }
</style>

