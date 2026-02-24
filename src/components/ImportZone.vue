<script setup>
import { ref } from 'vue';
import { parseMarkdownTable } from '../utils/mdParser';

const props = defineProps(['loading']);
const emit = defineEmits(['save']);
const jsonText = ref('');

const handleSubmit = () => {
    let rawContent = jsonText.value.trim();
    if (!rawContent) return alert('請輸入內容');

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

    console.log('--- 解析結果 (Console 預覽) ---');
    console.log(data);
    console.log('----------------------------');

    emit('save', data);

    jsonText.value = '';
};
</script>

<template>
  <section class="action-zone">
    <div class="glass-card">
        <h3>匯入生成內容</h3>
        <p>貼上 Markdown 表格或 JSON 格式資料</p>
        <textarea 
            v-model="jsonText"
            placeholder="| 景點名稱 | 地址 | 介紹 | ... |"
        ></textarea>
        <button 
            @click="handleSubmit" 
            class="primary-btn"
            :disabled="loading"
        >
            {{ loading ? '同步中...' : '儲存內容並初始化' }}
        </button>
    </div>
  </section>
</template>


<style scoped>
.action-zone {
    max-width: 600px;
    margin: 4rem auto 0;
}

.glass-card {
    background: var(--card-bg);
    backdrop-filter: blur(12px);
    border: 1px solid var(--border-color);
    border-radius: 16px;
    padding: 1.5rem;
}

textarea {
    width: 100%;
    height: 150px;
    background: rgba(0,0,0,0.2);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    color: #fff;
    padding: 1rem;
    margin: 1rem 0;
    font-family: monospace;
    resize: none;
}

.primary-btn {
    width: 100%;
    background: var(--text-primary);
    color: var(--bg-color);
    border: none;
    padding: 1rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.3s;
}

.primary-btn:hover {
    opacity: 0.9;
}

.primary-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}
</style>
