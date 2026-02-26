<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-overlay" @click.self="emit('close')">
      <div class="modal-content glass-card">
        <div class="modal-header">
          <h3>➕ 新增景點卡片</h3>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>景點名稱</label>
            <input v-model="form.景點名稱" placeholder="例如：新竹市立動物園" ref="initialFocus">
          </div>
          <div class="form-group">
            <label>地址 / Google 地圖連結</label>
            <input v-model="form.地址" placeholder="輸入地址或貼上地圖連結">
          </div>
          <div class="form-group">
            <label>所在縣市 (必填，影響天氣顯示)</label>
            <input v-model="form.所在縣市" placeholder="例如：雲林縣">
          </div>
          <div class="group-row">
            <div class="form-group">
              <label>建議停留</label>
              <input v-model="form.建議停留" placeholder="例如：2 小時">
            </div>
            <div class="form-group">
              <label>費用</label>
              <input v-model="form.費用" placeholder="例如：50元 / 免費">
            </div>
          </div>
          <div class="form-group">
            <label>景點介紹</label>
            <textarea v-model="form.介紹" placeholder="簡單描述一下這個地方..." rows="3"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="emit('close')" class="modal-btn secondary">取消</button>
          <button @click="submit" class="modal-btn primary" :disabled="!form.景點名稱">新增景點</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps(['show']);
const emit = defineEmits(['close', 'add']);

const initialFocus = ref(null);

const form = ref({
    ID: Date.now().toString(), // 暫時用時間戳當 ID
    "景點名稱": "",
    "所在縣市": "",
    "地址": "",
    "建議停留": "",
    "費用": "",
    "介紹": ""
});

watch(() => props.show, (newVal) => {
  if (newVal) {
    form.value = {
        ID: Date.now().toString(),
        "景點名稱": "",
        "所在縣市": "",
        "地址": "",
        "建議停留": "",
        "費用": "",
        "介紹": ""
    };
    nextTick(() => {
        initialFocus.value?.focus();
    });
  }
});

const submit = () => {
    emit('add', { ...form.value });
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  padding: 1rem;
}

.modal-content {
  width: 100%;
  max-width: 500px;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.modal-header h3 {
  margin: 0 0 1.5rem;
  font-size: 1.3rem;
  color: var(--text-primary);
}

.form-group {
  margin-bottom: 1.25rem;
}

.group-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

label {
  display: block;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

input, textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 0.8rem;
  color: white;
  font-size: 0.95rem;
  transition: border-color 0.2s;
}

input:focus, textarea:focus {
  outline: none;
  border-color: var(--accent-color);
}

textarea {
  resize: none;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.modal-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.modal-btn.primary {
  background: var(--text-primary);
  color: var(--bg-color);
}

.modal-btn.secondary {
  background: transparent;
  color: var(--text-secondary);
  border-color: var(--border-color);
}

.modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-btn:not(:disabled):hover {
  transform: translateY(-2px);
  filter: brightness(1.1);
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

@media (max-width: 480px) {
    .group-row {
        grid-template-columns: 1fr;
    }
}
</style>
