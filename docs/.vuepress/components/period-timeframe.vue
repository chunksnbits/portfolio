<template>
  <div class="period-timeframe">
    <span class="period-timeframe__label">
      <slot></slot>
    </span>
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
    width: rem-size(30px);
    top: rem-size(5px);
    bottom: 0;
    left: 0;
    font-size: rem-size(12px);
    line-height: 1rem;

    text-align: center;
  }

  .period-timeframe::after {
    content: '';
    position: absolute;
    top: rem-size(24px);
    bottom: 0;
    left: calc(50% - 1px);
    display: block;
    background: var(--root__color--border);
    width: rem-size(1.5px);
  }

  .period-timeframe__label {
    display: inline-block;
    background: white;
    position: relative;
    z-index: 100;
    padding-bottom: 0.5rem;
  }

  @mixin period-timeframe__layout--desktop {
    .period-timeframe {
      position: absolute;
      width: rem-size(70px);
      top: 0;
      left: 0;
      font-size: rem-size(12px);
      line-height: 1;
      padding-top: rem-size(6px);

      text-align: center;
      white-space: nowrap;
    }
  }

  @include breakpoint-greater('sm') {
    @include period-timeframe__layout--desktop;
  }

  @media print {
    @include period-timeframe__layout--desktop;

    .period-timeframe {
      width: rem-size(70px);
    }
  }
</style>

