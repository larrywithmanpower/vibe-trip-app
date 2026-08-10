<script setup>
import { ref, watch } from 'vue';
import { parseMarkdownTable } from '../utils/mdParser';
import BaseIcon from './BaseIcon.vue';

const props = defineProps(['show', 'loading']);
const emit = defineEmits(['close', 'save']);
const jsonText = ref('');
const errorMsg = ref('');

const handleSubmit = () => {
    let rawContent = jsonText.value.trim();
    if (!rawContent) return;

    errorMsg.value = '';
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
        errorMsg.value = '無法解析內容，請確保格式為 JSON 或 Markdown 表格';
        return;
    }

    emit('save', data);
    jsonText.value = '';
};

watch(() => props.show, (newVal) => {
    if (newVal) {
        jsonText.value = '';
        errorMsg.value = '';
    }
});
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-overlay" @click.self="emit('close')">
      <div class="modal-panel">
        <div class="modal-head">
          <div>
            <h3><BaseIcon name="download" :size="18" />匯入行程資料</h3>
            <p>貼上 Markdown 表格或 JSON，會直接覆寫這個行程</p>
          </div>
        </div>

        <div class="modal-body">
          <div v-if="errorMsg" class="modal-error">
            <BaseIcon name="alert" :size="15" />{{ errorMsg }}
          </div>
          <textarea
            class="textarea code-area"
            v-model="jsonText"
            placeholder="| 景點名稱 | 地址 | 建議停留 | 費用 | 介紹 |"
          ></textarea>
        </div>

        <div class="modal-foot">
          <button @click="emit('close')" class="btn btn-quiet">取消</button>
          <button
              @click="handleSubmit"
              class="btn btn-primary"
              :disabled="loading || !jsonText.trim()"
          >
              <span v-if="loading" class="spinner-mini"></span>
              {{ loading ? '同步中…' : '匯入並更新' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.code-area {
    height: 210px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.85rem;
}
</style>
