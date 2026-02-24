<script setup>
defineProps(['item']);

const getMapsLink = (item) => {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item['地址'] || item['景點名稱'])}`;
};
</script>

<template>
  <div class="glass-card itinerary-card">
    <img v-if="item['照片URL']" :src="item['照片URL']" :alt="item['景點名稱']">
    <div v-else class="img-placeholder"></div>
    
    <h4>{{ item['景點名稱'] || '未命名景點' }}</h4>
    
    <div class="meta">
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
}

.glass-card:hover {
    transform: translateY(-4px);
    border-color: rgba(255, 255, 255, 0.2);
}

.itinerary-card img {
    width: 100%;
    height: 180px;
    object-fit: cover;
    border-radius: 12px;
    margin-bottom: 1rem;
    background: #1e293b;
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
}

.address {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: var(--accent-color);
    cursor: pointer;
    text-decoration: none;
}
</style>
