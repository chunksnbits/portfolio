<template>
  <ul class="skills">
    <slot></slot>
  </ul>
</template>

<script>
export default {
  name: 'skills',
};
</script>

<style lang="scss" scoped>
  .skills {
    padding: 0;
    margin: 0;
  }
</style>

