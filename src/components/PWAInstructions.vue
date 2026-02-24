<script setup>
import { ref } from 'vue';

const show = ref(false);
const platform = ref(navigator.userAgent.match(/iPhone|iPad|iPod/i) ? 'ios' : 'android');

const toggle = () => show.value = !show.value;
</script>

<template>
  <div class="pwa-container">
    <button @click="toggle" class="install-trigger-btn">
      📲 安裝至手機桌布教學
    </button>

    <div v-if="show" class="instruction-modal" @click.self="toggle">
      <div class="glass-card instruction-content">
        <header class="modal-header">
          <h3>如何安裝 VibeTrip？</h3>
          <button @click="toggle" class="close-btn">&times;</button>
        </header>

        <div class="platform-tabs">
          <button @click="platform = 'ios'" :class="{ active: platform === 'ios' }">iOS (Safari)</button>
          <button @click="platform = 'android'" :class="{ active: platform === 'android' }">Android (Chrome)</button>
        </div>

        <div v-if="platform === 'ios'" class="steps">
          <p>1. 點擊瀏覽器底部的 <strong>「分享」</strong> 按鈕 <i class="icon">⎋</i></p>
          <p>2. 向下滑動並選擇 <strong>「加入主畫面」</strong> <i class="icon">＋</i></p>
          <p>3. 點擊右上角的 <strong>「新增」</strong> 即可完成！</p>
        </div>

        <div v-else class="steps">
          <p>1. 點擊瀏覽器右上角的 <strong>「更多選項」</strong> (三點圖示) <i class="icon">⋮</i></p>
          <p>2. 選擇 <strong>「安裝應用程式」</strong> 或 <strong>「新增至主畫面」</strong></p>
          <p>3. 根據彈窗提示點擊 <strong>「安裝」</strong> 即可完成！</p>
        </div>

        <p class="premium-tip">🌟 安裝後將具備獨立 App 視窗，體驗更流暢！</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pwa-container {
    margin-top: 1rem;
    display: flex;
    justify-content: center;
}

.install-trigger-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: 0.6rem 1.2rem;
    border-radius: 99px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.3s ease;
}

.install-trigger-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
    border-color: var(--text-primary);
}

.instruction-modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem;
    z-index: 2000;
}

.instruction-content {
    max-width: 400px;
    width: 100%;
    padding: 2rem;
    position: relative;
    border-color: rgba(99, 102, 241, 0.5);
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}

.close-btn {
    background: none;
    border: none;
    color: var(--text-secondary);
    font-size: 2rem;
    cursor: pointer;
    line-height: 1;
}

.platform-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    background: rgba(0,0,0,0.3);
    padding: 0.3rem;
    border-radius: 8px;
}

.platform-tabs button {
    flex: 1;
    background: none;
    border: none;
    color: var(--text-secondary);
    padding: 0.5rem;
    cursor: pointer;
    border-radius: 6px;
    font-size: 0.85rem;
    transition: all 0.2s;
}

.platform-tabs button.active {
    background: var(--text-primary);
    color: var(--bg-color);
    font-weight: 600;
}

.steps {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    margin-bottom: 2rem;
}

.steps p {
    color: var(--text-primary);
    font-size: 0.95rem;
    line-height: 1.5;
}

.icon {
    display: inline-block;
    background: rgba(255,255,255,0.1);
    padding: 0 0.4rem;
    border-radius: 4px;
    margin-left: 0.2rem;
    font-style: normal;
}

.premium-tip {
    text-align: center;
    color: var(--accent-color);
    font-size: 0.85rem;
    font-weight: 600;
}
</style>
