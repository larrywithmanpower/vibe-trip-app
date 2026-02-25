<script setup>
import { ref, watch } from 'vue';
import { parseMarkdownTable } from '../utils/mdParser';

const props = defineProps(['show', 'loading']);
const emit = defineEmits(['close', 'save']);
const jsonText = ref('');

const handleSubmit = () => {
    let rawContent = jsonText.value.trim();
    if (!rawContent) return;

    let data;
    // 優先嘗試 JSON
    if (rawContent.startsWith('[') || rawContent.startsWith('{')) {
        try {
            data = JSON.parse(rawContent);
        } catch (e) {
            console.log('Not valid JSON, trying Markdown...');
        }
    }

    // 如果 JSON 失敗，嘗試 Markdown 表格
    if (!data) {
        data = parseMarkdownTable(rawContent);
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
        return alert('無法解析內容，請確保格式為 JSON 或 Markdown 表格');
    }

    emit('save', data);
    jsonText.value = '';
};

watch(() => props.show, (newVal) => {
    if (newVal) jsonText.value = '';
});
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-overlay" @click.self="emit('close')">
      <div class="modal-content glass-card">
        <div class="modal-header">
          <h3>📥 匯入行程資料</h3>
          <p>貼上 Markdown 表格或 JSON 格式</p>
        </div>
        <div class="modal-body">
          <textarea 
            v-model="jsonText"
            placeholder="| 景點名稱 | 地址 | 建議停留 | 費用 | 介紹 |"
          ></textarea>
        </div>
        <div class="modal-footer">
          <button @click="emit('close')" class="modal-btn secondary">取消</button>
          <button 
              @click="handleSubmit" 
              class="modal-btn primary"
              :disabled="loading || !jsonText.trim()"
          >
              {{ loading ? '同步中...' : '匯入並更新' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

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
  margin: 0 0 0.5rem;
  font-size: 1.3rem;
  color: var(--text-primary);
}

.modal-header p {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
}

textarea {
    width: 100%;
    height: 200px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    color: #fff;
    padding: 1rem;
    font-family: monospace;
    resize: none;
    font-size: 0.9rem;
}

textarea:focus {
    outline: none;
    border-color: var(--accent-color);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1.5rem;
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
