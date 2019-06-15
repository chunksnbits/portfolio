<template>
  <div class="period-timeframe">
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'period-timeframe',
};
</script>

<style lang="scss" scoped>
  @import '../styles/functions';

  .period-timeframe {
    position: absolute;
    width: 70px;
    top: 0;
    bottom: 45px;
    left: 0;
    font-size: rem-size(12px);
    line-height: 1.8rem;

    text-align: center;
    white-space: nowrap;
  }

  .period-timeframe::after {
    content: '';
    position: relative;
    left: calc(50% - 1px);
    display: block;
    top: rem-size(10px);
    background: var(--root__color--border);
    width: 1.5px;
    height: 100%;
  }
</style>

