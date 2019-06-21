<template>
  <svg xmlns="http://www.w3.org/2000/svg"
    :width="width"
    :height="height"
    viewBox="0 0 18 18"
    :aria-labelledby="'icon--' + name"
    role="presentation"
  >
    <title
      :id="'icon--' + name"
      lang="en"
    >{{ name }} icon</title>
    <g :fill="iconColor" v-html="icons[name]"></g>
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
  props: {
    name: {
      type: String,
      default: 'box'
    },
    width: {
      type: [Number, String],
      default: 18
    },
    height: {
      type: [Number, String],
      default: 18
    },
    iconColor: {
      type: String,
      default: 'currentColor'
    }
  }
};
</script>

<style lang="scss">

</style>

