<template>
  <span>
    <v-speed-dial
      v-if="$slots.default.length > 1"
      v-model="active"
      bottom
      right
      direction="top"
      open-on-hover="false"
      :transition="transition"
    >
      <template v-slot:activator>
        <slot></slot>
      </template>
    </v-speed-dial>
    <template v-else>
      <slot></slot>
    </template>
  </span>
</template>

<script lang="ts">
  export default {
    name: 'actions',
    props: {
      color: String,
      hidden: {
        type: Boolean,
        default: false,
      },
    },
    data: () => ({
      active: false,
    })
  };
</script>
