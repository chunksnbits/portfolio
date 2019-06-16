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
  @import '../styles/styles.scss';

  .period-timeframe {
    position: absolute;
    width: 30px;
    top: 5px;
    bottom: 45px;
    left: 0;
    font-size: rem-size(12px);
    line-height: 1rem;

    text-align: center;
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

  @include breakpoint-greater('sm') {

    .period-timeframe {
      position: absolute;
      width: 70px;
      top: 0;
      bottom: 25px;
      left: 0;
      font-size: rem-size(12px);
      line-height: 1;
      padding-top: rem-size(6px);

      text-align: center;
      white-space: nowrap;
    }
  }
</style>

