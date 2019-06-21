<template>
  <ul class="contacts">
    <slot></slot>
  </ul>
</template>

<script>
export default {
  name: 'contacts',
};
</script>

<style lang="scss" scoped>
  .contacts {
    display: block;
    padding: 0;
    margin: 0;
  }
</style>

