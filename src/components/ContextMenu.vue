<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

export interface MenuAction {
  label: string
  emoji?: string
  shortcut?: string
  action: () => void
  disabled?: boolean
  children?: MenuAction[]
}

const props = defineProps<{
  x: number
  y: number
  items: MenuAction[]
}>()

const emit = defineEmits<{
  close: []
}>()

const menuRef = ref<HTMLElement | null>(null)
const openSubmenu = ref<number | null>(null)
const submenuFlip = ref(false)

function onItemClick(item: MenuAction) {
  if (item.disabled) return
  if (item.children) return // submenu handles separately
  item.action()
  emit('close')
}

function onSubmenuEnter(idx: number) {
  openSubmenu.value = idx
  // Check if submenu overflows right edge, flip left if so
  queueMicrotask(() => {
    const el = menuRef.value
    if (!el) return
    const sub = el.querySelector('.ctx-submenu') as HTMLElement | null
    if (!sub) return
    const subRect = sub.getBoundingClientRect()
    submenuFlip.value = subRect.right > window.innerWidth
  })
}

function onSubmenuLeave() {
  openSubmenu.value = null
}

function onClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    emit('close')
  }
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (openSubmenu.value !== null) {
      openSubmenu.value = null
    } else {
      emit('close')
    }
  }
}

onMounted(() => {
  // Reposition if off-screen
  const el = menuRef.value
  if (el) {
    const rect = el.getBoundingClientRect()
    if (rect.right > window.innerWidth) {
      el.style.left = `${Math.max(8, window.innerWidth - rect.width - 8)}px`
    }
    if (rect.bottom > window.innerHeight) {
      el.style.top = `${Math.max(8, window.innerHeight - rect.height - 8)}px`
    }
    if (rect.left < 0) {
      el.style.left = '8px'
    }
    if (rect.top < 0) {
      el.style.top = '8px'
    }
  }
  setTimeout(() => document.addEventListener('click', onClickOutside), 0)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
})
</script>

<template>
  <div
    ref="menuRef"
    class="ctx-menu"
    :style="{ left: x + 'px', top: y + 'px' }"
    @keydown="onKeyDown"
    tabindex="0"
  >
    <div
      v-for="(item, idx) in items"
      :key="idx"
      class="ctx-item"
      :class="{ disabled: item.disabled, hasChildren: !!item.children }"
      @click="onItemClick(item)"
      @mouseenter="onSubmenuEnter(idx)"
      @mouseleave="onSubmenuLeave"
    >
      <span class="ctx-item-icon">{{ item.emoji }}</span>
      <span class="ctx-item-label">{{ item.label }}</span>
      <span v-if="item.shortcut" class="ctx-item-shortcut">{{ item.shortcut }}</span>
      <span v-if="item.children" class="ctx-item-arrow">▶</span>

      <!-- Submenu -->
      <div
        v-if="item.children && openSubmenu === idx"
        class="ctx-submenu"
        :class="{ 'flip-left': submenuFlip }"
      >
        <div
          v-for="(child, ci) in item.children"
          :key="ci"
          class="ctx-item"
          :class="{ disabled: child.disabled }"
          @click.stop="onItemClick(child)"
        >
          <span class="ctx-item-icon">{{ child.emoji }}</span>
          <span class="ctx-item-label">{{ child.label }}</span>
          <span v-if="child.shortcut" class="ctx-item-shortcut">{{ child.shortcut }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ctx-menu {
  position: fixed;
  z-index: 9999;
  min-width: 180px;
  background: rgba(30, 30, 45, 0.96);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  font-family: sans-serif;
  font-size: 13px;
  outline: none;
  pointer-events: auto;
}
.ctx-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
  color: #ddd;
  position: relative;
  transition: background 0.1s;
  user-select: none;
}
.ctx-item:hover:not(.disabled) {
  background: rgba(99, 102, 241, 0.25);
  color: #fff;
}
.ctx-item.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.ctx-item-icon {
  width: 22px;
  text-align: center;
  font-size: 15px;
}
.ctx-item-label {
  flex: 1;
}
.ctx-item-shortcut {
  color: #666;
  font-size: 11px;
  margin-left: 12px;
}
.ctx-item-arrow {
  color: #888;
  font-size: 10px;
  margin-left: 4px;
}
.ctx-submenu {
  position: absolute;
  left: 100%;
  top: -4px;
  min-width: 160px;
  background: rgba(30, 30, 45, 0.96);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  padding: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  margin-left: 4px;
}
.ctx-submenu.flip-left {
  left: auto;
  right: 100%;
  margin-left: 0;
  margin-right: 4px;
}
</style>
