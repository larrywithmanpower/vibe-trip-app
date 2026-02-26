<script setup>
import { ref } from 'vue';

const props = defineProps(['show']);
const emit = defineEmits(['close']);
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-overlay" @click.self="emit('close')">
      <div class="modal-content glass-card">
        <header class="modal-header">
          <h3>📖 VibeTrip 使用教學</h3>
          <button @click="emit('close')" class="close-btn">&times;</button>
        </header>

        <div class="guide-body">
          <section class="guide-section">
            <h4>📲 安裝至手機桌布 (PWA)</h4>
            <div class="platform-box">
              <p><strong>iOS (Safari):</strong> 分享按鈕 <i class="icon">⎋</i> → <strong>加入主畫面</strong></p>
              <p><strong>Android (Chrome):</strong> 選單 <i class="icon">⋮</i> → <strong>安裝程式</strong></p>
            </div>
          </section>

          <section class="guide-section">
            <h4>🎮 基本操作</h4>
            <ul>
              <li><strong>切換/新增行程</strong>：點擊上方分頁標籤切換，最右側 <strong>「+」</strong> 新增。</li>
              <li><strong>編輯景點</strong>：點擊卡片右上角 <strong>✏️</strong> 修改資料。</li>
              <li><strong>智能填入</strong>：新增時輸入名稱後按 <strong>「✨ 智能填入」</strong>。</li>
              <li><strong>排序</strong>：長按 <strong>⠿</strong> 圖示即可上下拖動。</li>
            </ul>
          </section>

          <section class="guide-section">
            <h4>🚀 進階功能</h4>
            <ul>
              <li><strong>離線讀取</strong>：即使沒網路，也能看已同步過的行程。</li>
              <li><strong>氣象預報</strong>：自動顯示行程縣市的降雨機率與氣溫。</li>
              <li><strong>自動同步</strong>：所有修改都會即時同步回 Google Sheets。</li>
            </ul>
          </section>
        </div>

        <div class="modal-footer">
          <button @click="emit('close')" class="modal-btn primary">了解了！</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 4000;
  padding: 1.5rem;
}

.modal-content {
  width: 100%;
  max-width: 450px;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  max-height: 85vh;
}

.modal-header {
  padding: 1.5rem 1.5rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 1.5rem;
  cursor: pointer;
}

.guide-body {
  padding: 0 1.5rem 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.guide-section {
  margin-bottom: 1.5rem;
}

.guide-section h4 {
  color: var(--accent-color);
  margin-bottom: 0.8rem;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.platform-box {
  background: rgba(255,255,255,0.03);
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.05);
}

.platform-box p {
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

ul {
  padding-left: 1.2rem;
  color: var(--text-secondary);
}

ul li {
  font-size: 0.9rem;
  margin-bottom: 0.6rem;
  line-height: 1.5;
}

strong {
  color: var(--text-primary);
}

.icon {
  display: inline-block;
  background: rgba(255,255,255,0.1);
  padding: 0 0.3rem;
  border-radius: 4px;
  font-style: normal;
}

.modal-footer {
  padding: 1rem 1.5rem 1.5rem;
  display: flex;
  justify-content: center;
}

.modal-btn {
  width: 100%;
  padding: 0.8rem;
  border-radius: 12px;
  border: none;
  background: var(--text-primary);
  color: var(--bg-color);
  font-weight: 600;
  cursor: pointer;
}

/* Animations */
.modal-fade-enter-active, .modal-fade-leave-active {
  transition: opacity 0.3s ease;
}
.modal-fade-enter-from, .modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-active .modal-content {
  animation: modal-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes modal-pop {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
