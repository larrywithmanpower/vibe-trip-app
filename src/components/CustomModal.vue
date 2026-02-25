<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-overlay" @click.self="cancel">
      <div class="modal-content glass-card">
        <div class="modal-header">
          <h3>{{ title }}</h3>
        </div>
        <div class="modal-body">
          <p v-if="message" class="modal-message">{{ message }}</p>
          <input 
            v-if="type === 'prompt'" 
            v-model="inputValue" 
            class="modal-input"
            ref="inputRef"
            @keyup.enter="confirm"
          >
        </div>
        <div class="modal-footer">
          <button v-if="type !== 'alert'" @click="cancel" class="modal-btn secondary">取消</button>
          <button @click="confirm" class="modal-btn primary">確定</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';

const props = defineProps({
  show: Boolean,
  title: { type: String, default: '通知' },
  message: String,
  type: { type: String, default: 'alert' }, // alert, confirm, prompt
  initialValue: { type: String, default: '' }
});

const emit = defineEmits(['confirm', 'cancel']);

const inputValue = ref(props.initialValue);
const inputRef = ref(null);

watch(() => props.show, (newVal) => {
  if (newVal) {
    inputValue.value = props.initialValue;
    if (props.type === 'prompt') {
      nextTick(() => {
        inputRef.value?.focus();
      });
    }
  }
});

const confirm = () => {
  emit('confirm', props.type === 'prompt' ? inputValue.value : true);
};

const cancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  padding: 1.5rem;
}

.modal-content {
  width: 100%;
  max-width: 400px;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  border-radius: 16px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
}

.modal-header h3 {
  margin-top: 0;
  font-size: 1.25rem;
  color: var(--text-primary);
}

.modal-body {
  margin: 1.5rem 0;
}

.modal-message {
  color: var(--text-secondary);
  line-height: 1.6;
}

.modal-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.75rem;
  color: white;
  margin-top: 0.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.modal-btn {
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  border: 1px solid transparent;
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

.modal-btn:hover {
  transform: translateY(-1px);
  opacity: 0.9;
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
