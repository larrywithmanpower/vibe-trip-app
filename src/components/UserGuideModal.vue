<script setup>
import BaseIcon from './BaseIcon.vue';

const props = defineProps(['show']);
const emit = defineEmits(['close']);
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-overlay is-top" @click.self="emit('close')">
      <div class="modal-panel">
        <div class="modal-head">
          <h3><BaseIcon name="book" :size="18" />VibeTrip 使用教學</h3>
          <button @click="emit('close')" class="close-btn" aria-label="關閉">
            <BaseIcon name="x" :size="18" />
          </button>
        </div>

        <div class="modal-body">
          <section class="guide-section">
            <h4>安裝至手機桌面（PWA）</h4>
            <div class="platform-box">
              <p><strong>iOS Safari</strong>：分享 <i class="kbd">⎋</i> → 加入主畫面</p>
              <p><strong>Android Chrome</strong>：選單 <i class="kbd">⋮</i> → 安裝應用程式</p>
            </div>
          </section>

          <section class="guide-section">
            <h4>基本操作</h4>
            <ul>
              <li><strong>切換行程</strong>：點上方分頁標籤，最右側 <i class="kbd">＋</i> 新增行程。</li>
              <li><strong>編輯景點</strong>：點卡片右上角鉛筆圖示修改資料。</li>
              <li><strong>智能填入</strong>：新增時輸入名稱後按「智能填入」自動帶地址與縣市。</li>
              <li><strong>排序</strong>：長按卡片右上的六點圖示上下拖動，左側編號會跟著更新。</li>
            </ul>
          </section>

          <section class="guide-section">
            <h4>進階功能</h4>
            <ul>
              <li><strong>離線讀取</strong>：沒網路也能看已同步過的行程。</li>
              <li><strong>氣象預報</strong>：自動顯示行程縣市的氣溫與降雨機率。</li>
              <li><strong>自動同步</strong>：所有修改即時寫回 Google Sheets。</li>
            </ul>
          </section>
        </div>

        <div class="modal-foot">
          <button @click="emit('close')" class="btn btn-primary full">了解了</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.is-top {
  z-index: 4000;
}

.close-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  border-radius: var(--r-sm);
  color: var(--text-3);
  transition: background 0.2s var(--ease), color 0.2s var(--ease);
}

.close-btn:hover {
  background: var(--surface-2);
  color: var(--text-1);
}

.guide-section {
  margin-bottom: 1.4rem;
}

.guide-section h4 {
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--brand);
  margin-bottom: 0.7rem;
}

.platform-box {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  padding: 0.9rem 1rem;
  border-radius: var(--r-md);
}

.platform-box p {
  font-size: 0.86rem;
  color: var(--text-2);
}

.platform-box p + p {
  margin-top: 0.45rem;
}

ul {
  padding-left: 1.1rem;
  color: var(--text-2);
}

ul li {
  font-size: 0.86rem;
  margin-bottom: 0.55rem;
  line-height: 1.65;
}

strong {
  color: var(--text-1);
  font-weight: 600;
}

.kbd {
  display: inline-block;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid var(--border);
  padding: 0 0.35rem;
  border-radius: 5px;
  font-style: normal;
  font-size: 0.8em;
}

.full {
  width: 100%;
}
</style>
