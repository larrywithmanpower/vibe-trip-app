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
        inputRef.value?.select();
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

<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-overlay" @click.self="cancel">
      <div class="modal-panel is-compact">
        <div class="modal-head">
          <h3>{{ title }}</h3>
        </div>
        <div class="modal-body">
          <p v-if="message" class="message">{{ message }}</p>
          <input
            v-if="type === 'prompt'"
            v-model="inputValue"
            class="input prompt-input"
            ref="inputRef"
            @keyup.enter="confirm"
          >
        </div>
        <div class="modal-foot">
          <button v-if="type !== 'alert'" @click="cancel" class="btn btn-quiet">取消</button>
          <button @click="confirm" class="btn btn-primary">確定</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.is-compact {
  max-width: 400px;
}

.message {
  color: var(--text-2);
  font-size: 0.9rem;
  line-height: 1.65;
}

.prompt-input {
  margin-top: 0.9rem;
}
</style>
