<script setup>
import { ref, watch, nextTick } from 'vue';
import BaseIcon from './BaseIcon.vue';

const props = defineProps(['show', 'initialData']);
const emit = defineEmits(['close', 'add', 'update']);

const initialFocus = ref(null);
const autoFilling = ref(false);
const errorMsg = ref('');

const blankForm = () => ({
    ID: Date.now().toString(),
    "景點名稱": "",
    "所在縣市": "",
    "地址": "",
    "建議停留": "",
    "費用": "",
    "介紹": ""
});

const form = ref(blankForm());

const handleAutoFill = async () => {
    if (!form.value.景點名稱) return;
    autoFilling.value = true;
    errorMsg.value = '';
    console.log("[AutoFill] Starting Google Maps search for:", form.value.景點名稱);

    try {
        // 使用 GAS 後端進行搜尋
        const response = await fetch(import.meta.env.VITE_API_URL, {
            method: 'POST',
            mode: 'cors',
            redirect: 'follow',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'searchPlaces',
                query: form.value.景點名稱
            })
        });

        const result = await response.json();
        console.log("[AutoFill] GAS Response:", result);

        if (result && result.success) {
            form.value.地址 = result.address;

            // 處理縣市名稱 (確保符合「縣/市」格式)
            let city = result.city || "";
            const TW_CITIES = ["台北", "新北", "桃園", "台中", "台南", "高雄", "基隆", "新竹", "嘉義", "苗栗", "彰化", "南投", "雲林", "屏東", "宜蘭", "花蓮", "台東", "澎湖", "金門", "馬祖"];

            for (const c of TW_CITIES) {
                if (city.includes(c)) {
                    const isCityType = ["台北", "新北", "桃園", "台中", "台南", "高雄", "新竹", "嘉義", "基隆"].includes(c);
                    form.value.所在縣市 = c + (isCityType ? "市" : "縣");
                    break;
                }
            }
            console.log("[AutoFill] Auto-filled City:", form.value.所在縣市);
        } else {
            console.warn("[AutoFill] Search failed:", result.message);
            errorMsg.value = result.message || "找不到該地點，請嘗試輸入更明確的名稱。";
        }
    } catch (err) {
        console.error("[AutoFill] Request error:", err);
        errorMsg.value = "搜尋連線失敗，請檢查網路或稍後再試。";
    } finally {
        autoFilling.value = false;
    }
};

watch(() => props.show, (newVal) => {
    if (newVal) {
        errorMsg.value = '';
        // 編輯模式帶入現有資料，新增模式重設表單
        form.value = props.initialData ? { ...props.initialData } : blankForm();
        nextTick(() => {
            initialFocus.value?.focus();
        });
    }
});

const submit = () => {
    if (props.initialData) {
        emit('update', { ...form.value });
    } else {
        emit('add', { ...form.value });
    }
};
</script>

<template>
  <Transition name="modal-fade">
    <div v-if="show" class="modal-overlay" @click.self="emit('close')">
      <div class="modal-panel">
        <div class="modal-head">
          <h3>
            <BaseIcon :name="initialData ? 'pencil' : 'plus'" :size="18" />
            {{ initialData ? '編輯景點' : '新增景點' }}
          </h3>
        </div>

        <div class="modal-body">
          <div v-if="errorMsg" class="modal-error">
            <BaseIcon name="alert" :size="15" />{{ errorMsg }}
          </div>

          <div class="field">
            <label>景點名稱</label>
            <div class="input-row">
              <input class="input" v-model="form.景點名稱" placeholder="例如：新竹市立動物園" ref="initialFocus">
              <button @click="handleAutoFill" class="fill-btn" :disabled="!form.景點名稱 || autoFilling">
                <span v-if="autoFilling" class="spinner-mini"></span>
                <BaseIcon v-else name="sparkles" :size="15" />
                <span class="fill-label">智能填入</span>
              </button>
            </div>
          </div>

          <div class="field">
            <label>地址 / Google 地圖連結</label>
            <input class="input" v-model="form.地址" placeholder="輸入地址或貼上地圖連結">
          </div>

          <div class="field">
            <label>所在縣市（影響天氣顯示）</label>
            <input class="input" v-model="form.所在縣市" placeholder="例如：雲林縣">
          </div>

          <div class="field-row">
            <div class="field">
              <label>建議停留</label>
              <input class="input" v-model="form.建議停留" placeholder="例如：2 小時">
            </div>
            <div class="field">
              <label>費用</label>
              <input class="input" v-model="form.費用" placeholder="例如：50元 / 免費">
            </div>
          </div>

          <div class="field">
            <label>景點介紹</label>
            <textarea class="textarea" v-model="form.介紹" placeholder="簡單描述一下這個地方…" rows="3"></textarea>
          </div>
        </div>

        <div class="modal-foot">
          <button @click="emit('close')" class="btn btn-quiet">取消</button>
          <button @click="submit" class="btn btn-primary" :disabled="!form.景點名稱">
            {{ initialData ? '儲存修改' : '新增景點' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.input-row {
  display: flex;
  gap: 0.5rem;
}

.fill-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  white-space: nowrap;
  background: var(--brand-soft);
  border: 1px solid rgba(99, 102, 241, 0.32);
  color: var(--brand);
  padding: 0 0.9rem;
  border-radius: var(--r-md);
  font-size: 0.82rem;
  font-weight: 600;
  transition: all 0.2s var(--ease);
}

.fill-btn:hover:not(:disabled) {
  background: rgba(99, 102, 241, 0.22);
  border-color: rgba(129, 140, 248, 0.5);
}

.fill-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}

@media (max-width: 480px) {
  .field-row {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .fill-label {
    display: none;
  }

  .fill-btn {
    padding: 0 0.8rem;
  }
}
</style>
