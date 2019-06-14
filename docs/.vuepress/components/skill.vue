<template>
  <li class="skill" :class="[skillTypeClassname]">
    <span v-for="index in 3"
    class="skill__category"
    :class="{
      'skill__category--active': index <= level,
      'skill__category--inactive': index > level,
    }"></span>
    <span class="skill__label">
      <slot></slot>
    </span>
  </li>
</template>

<script>
export default {
  name: 'skill',
  props: ['level', 'category'],
  computed: {
    skillTypeClassname: function() { return `skill__category--${this.category}`; },
  }
};
</script>

<style lang="scss">

  :root {
    --skill__category--color--frontend: #8BDAE0;
    --skill__category--color--tools: #5A5A5A;
    --skill__category--color--backend: #FFB96E;
    --skill__category--color--ux: #FC6C73;
    --skill__category--size: 11px;
  }
</style>

<style lang="scss" scoped>

  .skill {
    list-style: none;
    padding: 0;
    margin: 0;

    margin-top: 20px;
  }

  .skill__category {
    display: inline-block;
    width: var(--skill__category--size);
    height: var(--skill__category--size);
    border: 2px solid var(--color-primary__border);
    background: none;

    margin-right: 6px;
  }

  .skill__category--frontend .skill__category--active {
    background: var(--skill__category--color--frontend);
  }

  .skill__category--frontend + .skill__category--frontend,
  .skill__category--tools + .skill__category--tools,
  .skill__category--backend + .skill__category--backend,
  .skill__category--ux + .skill__category--ux {
    margin-top: 8px;
  }

  .skill__category--tools .skill__category--active {
    background: var(--skill__category--color--tools);
  }

  .skill__category--backend .skill__category--active {
    background: var(--skill__category--color--backend);
  }

  .skill__category--ux .skill__category--active {
    background: var(--skill__category--color--ux);
  }

  .skill__label {
    display: inline;
    margin-left: 5px;
  }
</style>

