<template>
  <image
    :src="src"
    :style="{ width: size + 'rpx', height: size + 'rpx', flexShrink: '0' }"
    mode="aspectFit"
  />
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { ALL_ICONS } from '../utils/icons'
import type { IconName } from '../utils/icons'

export default defineComponent({
  name: 'AppIcon',
  props: {
    name: { type: String as () => IconName, required: true },
    size: { type: Number, default: 40 }
  },
  setup(props) {
    const src = computed(() => ALL_ICONS[props.name as IconName] ?? '')
    return { src }
  }
})
</script>
