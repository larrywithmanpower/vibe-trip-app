<script setup>
defineProps(['item']);

const getMapsLink = (item) => {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item['地址'] || item['景點名稱'])}`;
};
</script>

<template>
  <div class="glass-card itinerary-card">
    <div class="drag-handle" title="拖曳排序">⠿</div>
    
    <h4>{{ item['景點名稱'] || '未命名景點' }}</h4>
    
    <div class="meta">
      <p v-if="item['所在縣市']">🏛️ {{ item['所在縣市'] }}</p>
      <p>📍 {{ item['建議停留'] || '未提供時數' }}</p>
      <p>💰 {{ item['費用'] || '免費或未註明' }}</p>
    </div>
    
    <p class="description">{{ item['介紹'] || '' }}</p>
    
    <a :href="getMapsLink(item)" target="_blank" class="address">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
      </svg>
      {{ item['地址'] || '點擊查看地圖' }}
    </a>
  </div>
</template>

<style scoped>
.glass-card {
    background: var(--card-bg);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 1.5rem;
    transition: transform 0.3s ease, border-color 0.3s ease;
    position: relative; /* 為了讓 drag-handle 定位 */
}

.drag-handle {
    position: absolute;
    top: 0.8rem;
    right: 0.8rem;
    width: 32px;
    height: 32px;
    display: flex;
    justify-content: center;
    align-items: center;
    color: var(--text-secondary);
    cursor: grab;
    font-size: 1.2rem;
    opacity: 0.5;
    transition: all 0.2s;
    user-select: none;
    z-index: 10;
    background: rgba(255,255,255,0.05);
    border-radius: 6px;
}

.itinerary-card:hover .drag-handle {
    opacity: 1;
    background: rgba(255,255,255,0.1);
}

.drag-handle:active {
    cursor: grabbing;
}

@media (max-width: 768px) {
    .glass-card {
        padding: 1.2rem;
    }
}


.glass-card:hover {
    transform: translateY(-4px);
    border-color: rgba(255, 255, 255, 0.2);
}

.itinerary-card h4 {
    margin-bottom: 0.5rem;
    font-size: 1.25rem;
}

.meta {
    font-size: 0.85rem;
    color: var(--text-secondary);
    margin-bottom: 1rem;
}

.description {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 1rem;
    word-break: break-word; /* 防止長文字撐開卡片 */
}

.address {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: var(--accent-color);
    cursor: pointer;
    text-decoration: none;
    word-break: break-all; /* 防止長網址撐開卡片 */
}
</style>
