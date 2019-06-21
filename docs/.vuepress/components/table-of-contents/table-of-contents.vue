<template>
  <div class="table-of-contents">
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'table-of-contents',
};
</script>

<style lang="scss">
  @import '../../styles/styles.scss';

  .table-of-contents {
    display: block;
    padding: 0;
    margin: 0;
  }

  .table-of-contents ul,
  .table-of-contents li {
    list-style: none;
    padding: 0;
    margin: 0;
    font-weight: 700;
    // text-transform: uppercase;
    color: var(--root__color--primary);
  }

  .table-of-contents ul ul li {
    display: flex;
    flex-direction: row;
    font-weight: 200;
    text-transform: none;
    color: var(--root__color--text);

    &::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 2px;
      border-radius: 4px;
      background: var(--root__color--primary);
      margin-right: rem-size(10px);
      margin-top: rem-size(10px);
    }
  }

  .table-of-contents > ul > li {
    margin-top: rem-size(10px);
  }

  .table-of-contents a {
    text-decoration: none;
    color: inherit;
  }
</style>

