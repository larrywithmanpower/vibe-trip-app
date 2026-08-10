<script setup>
import { computed } from 'vue';
import BaseIcon from './BaseIcon.vue';

const props = defineProps({
  item: { type: Object, required: true },
  index: { type: Number, default: 0 }
});
const emit = defineEmits(['delete', 'edit']);

const rawAddress = computed(() => (props.item['地址'] || '').trim());
const isLink = computed(() => /^https?:\/\//i.test(rawAddress.value));

// 地址欄若已經是地圖連結就直接用，不要再包一層 search query
const mapsLink = computed(() => {
  if (isLink.value) return rawAddress.value;
  const q = rawAddress.value || props.item['景點名稱'] || '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
});

// 顯示文字：連結型地址改抓 q / query 參數，抓不到才退回通用字樣
const addressText = computed(() => {
  if (!rawAddress.value) return '點擊查看地圖';
  if (!isLink.value) return rawAddress.value;
  try {
    const url = new URL(rawAddress.value);
    const q = url.searchParams.get('q') || url.searchParams.get('query');
    if (q) return q;
  } catch (err) {
    // 網址解析失敗就走預設文字
  }
  return '在 Google 地圖開啟';
});
</script>

<template>
  <article class="station">
    <!-- 站點序號與連接線，讓拖曳後的順序一眼可讀 -->
    <div class="rail">
      <span class="rail-dot">{{ index }}</span>
      <span class="rail-line"></span>
    </div>

    <div class="card">
      <div class="card-head">
        <h3 class="card-title">{{ item['景點名稱'] || '未命名景點' }}</h3>
        <div class="card-tools">
          <button class="tool drag-handle" title="長按拖曳排序" aria-label="拖曳排序">
            <BaseIcon name="grip" :size="16" />
          </button>
          <button class="tool" @click.stop="emit('edit', item)" title="編輯此景點" aria-label="編輯">
            <BaseIcon name="pencil" :size="15" />
          </button>
          <button class="tool tool-danger" @click.stop="emit('delete', item)" title="刪除此景點" aria-label="刪除">
            <BaseIcon name="x" :size="15" />
          </button>
        </div>
      </div>

      <ul class="chips">
        <li v-if="item['所在縣市']"><BaseIcon name="landmark" :size="13" />{{ item['所在縣市'] }}</li>
        <li><BaseIcon name="clock" :size="13" />{{ item['建議停留'] || '未提供時數' }}</li>
        <li><BaseIcon name="ticket" :size="13" />{{ item['費用'] || '免費或未註明' }}</li>
      </ul>

      <p v-if="item['介紹']" class="card-desc">{{ item['介紹'] }}</p>

      <a :href="mapsLink" target="_blank" rel="noopener" class="card-map">
        <BaseIcon name="pin" :size="15" />
        <span class="card-map-text">{{ addressText }}</span>
        <BaseIcon name="external" :size="13" class="card-map-ext" />
      </a>
    </div>
  </article>
</template>

<style scoped>
.station {
  display: flex;
  align-items: stretch;
  gap: 0.9rem;
}

/* 左側時間軸 */
.rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 0 0 30px;
  padding-top: 0.55rem;
}

.rail-dot {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(140deg, var(--brand-fill), #8b5cf6);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  box-shadow: 0 4px 12px -6px var(--brand-fill);
}

.rail-line {
  flex: 1;
  width: 2px;
  margin: 0.4rem 0 0;
  border-radius: 2px;
  background: linear-gradient(180deg, var(--border-strong), var(--border));
}

/* 最後一站不需要往下延伸的連接線 */
.station:last-child .rail-line {
  display: none;
}

/* 卡片本體 */
.card {
  flex: 1;
  min-width: 0;
  margin-bottom: 1rem;
  padding: 1.1rem 1.25rem 0.9rem;
  background: var(--surface-1);
  border: 1px solid var(--border);
  border-radius: var(--r-lg);
  transition: border-color 0.25s var(--ease), background 0.25s var(--ease),
    transform 0.25s var(--ease);
}

.card:hover {
  background: var(--surface-2);
  border-color: var(--border-strong);
}

.card-head {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  margin-bottom: 0.7rem;
}

.card-title {
  flex: 1;
  min-width: 0;
  font-size: 1.05rem;
  font-weight: 700;
  padding-top: 0.1rem;
  word-break: break-word;
}

.card-tools {
  display: flex;
  gap: 0.15rem;
  flex: 0 0 auto;
}

.tool {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: var(--r-sm);
  color: var(--text-3);
  transition: background 0.18s var(--ease), color 0.18s var(--ease),
    opacity 0.18s var(--ease);
}

.tool:hover {
  background: var(--surface-2);
  color: var(--text-1);
}

.tool-danger:hover {
  background: var(--danger-soft);
  color: var(--danger);
}

.drag-handle {
  cursor: grab;
  touch-action: none;
}

.drag-handle:active {
  cursor: grabbing;
}

/* 資訊標籤 */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  list-style: none;
  margin-bottom: 0.85rem;
}

.chips li {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
  padding: 0.2rem 0.6rem;
  border-radius: var(--r-full);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-2);
  font-size: 0.76rem;
  white-space: nowrap;
}

.chips li:first-child {
  background: var(--brand-soft);
  color: var(--brand);
}

.card-desc {
  font-size: 0.88rem;
  color: var(--text-2);
  line-height: 1.7;
  margin-bottom: 0.9rem;
  word-break: break-word;
}

/* 地圖連結 */
.card-map {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0 -1.25rem -0.9rem;
  padding: 0.7rem 1.25rem;
  border-top: 1px solid var(--border);
  color: var(--text-2);
  font-size: 0.82rem;
  transition: color 0.2s var(--ease), background 0.2s var(--ease);
}

.card-map:hover {
  color: var(--brand);
  background: var(--brand-soft);
}

.card-map-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-map-ext {
  opacity: 0.5;
}

@media (max-width: 560px) {
  .station {
    gap: 0.65rem;
  }

  .rail {
    flex-basis: 26px;
  }

  .rail-dot {
    width: 24px;
    height: 24px;
    font-size: 0.72rem;
  }

  .card {
    padding: 1rem 1.05rem 0.8rem;
  }

  .card-map {
    margin: 0 -1.05rem -0.8rem;
    padding: 0.7rem 1.05rem;
  }

  .card-title {
    font-size: 1rem;
  }
}
</style>
