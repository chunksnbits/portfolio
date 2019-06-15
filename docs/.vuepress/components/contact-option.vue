<template>
  <li class="contact-option">
    <icon class="contact-option__icon" color="rgba(0,0,0,1.0)" :name="contact.icon"></icon>
    <a :href="contact.url" target="_blank" class="contact-option__link">{{ contact.label }}</a>
  </li>
</template>

<script>

export default {
  name: 'contact-option',
  props: ['contact'],
};
</script>

<style lang="scss">
  @import '../styles/functions.scss';

  .contact-option {
    display: flex;
    flex-direction: row;
    list-style: none;
    padding: rem-size(4px) 0;
    margin: 0;
  }

  .contact-option__icon {
    display: flex;
    flex: 0 0 rem-size(18px);
    display: inline-block;
    vertical-align: middle;
    margin-right: rem-size(10px);
  }

  .contact-option__link {
    display: flex;
    flex: 1 1 100%;
    color: var(--color-primary);
    text-decoration: none;
  }
</style>

