<template>
  <v-btn class="action"
    @click="(args) => $emit('click', args)"
    v-show="!hidden"
    :color="color"
    fixed
    dark
    bottom
    right
    fab>
    <slot></slot>
  </v-btn>
</template>

<script lang="ts">
  export default {
    name: 'action',
    props: {
      color: {
        type: String,
        default: '#000',
      },
      hidden: {
        type: Boolean,
        default: false,
      },
    },
  };
</script>

<style lang="scss">
  .action .v-btn__content {
    position: relative;
    top: -2px;
  }
</style>

