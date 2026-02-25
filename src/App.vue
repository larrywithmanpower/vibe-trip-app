<script setup>
import { ref, onMounted, nextTick } from 'vue';
import Sortable from 'sortablejs';
import ItineraryCard from './components/ItineraryCard.vue';
import CustomModal from './components/CustomModal.vue';
import AddItemModal from './components/AddItemModal.vue';
import ImportModal from './components/ImportModal.vue';
import PWAInstructions from './components/PWAInstructions.vue';


// --- 配置區 ---
const API_URL = import.meta.env.VITE_API_URL || ""; 

const metadata = ref({ "基礎資訊": "", "特別提醒": "" });
const currentSheet = ref(localStorage.getItem('last_sheet') || "預設行程");
const allSheets = ref(["預設行程"]);
const itineraryData = ref([]);
const loading = ref(false);
const toastMsg = ref('');
const showToast = ref(false);
const showAddModal = ref(false);
const showImportModal = ref(false);
const isSyncing = ref(false);
let sortableInstance = null;

import { watch } from 'vue';
watch(currentSheet, (newVal) => {
    localStorage.setItem('last_sheet', newVal);
});

// --- Modal 控制 ---
const modal = ref({
    show: false,
    title: '',
    message: '',
    type: 'alert',
    initialValue: '',
    onConfirm: null
});

const openModal = (config) => {
    modal.value = {
        show: true,
        title: config.title || '通知',
        message: config.message || '',
        type: config.type || 'alert',
        initialValue: config.initialValue || '',
        onConfirm: config.onConfirm
    };
};

const handleModalConfirm = (val) => {
    if (modal.value.onConfirm) modal.value.onConfirm(val);
    modal.value.show = false;
};

const getUrl = (params) => {
    const url = new URL(API_URL);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    return url.toString();
};

const fetchData = async () => {
    if (!API_URL) return;

    loading.value = true;
    try {
        // 先獲取分頁清單，確保當前分頁是有效的
        const sheetsRes = await fetch(getUrl({ action: 'getSheets' }));
        const sheets = await sheetsRes.json();
        
        if (Array.isArray(sheets) && sheets.length > 0) {
            allSheets.value = sheets;
            // 如果當前 localStorage 存的分頁不在清單中，跳到第一個
            if (!allSheets.value.includes(currentSheet.value)) {
                currentSheet.value = allSheets.value[0];
            }
        }

        // 接著讀取該分頁資料
        const dataRes = await fetch(getUrl({ action: 'read', sheetName: currentSheet.value }));
        const data = await dataRes.json();
        
        // 只有在真的是陣列且有長度時才更新，避免被錯誤物件蓋掉
        if (Array.isArray(sheets) && sheets.length > 0) {
            allSheets.value = sheets;
            // 如果當前選擇的頁籤不在清單中，自動跳到第一個有效頁籤
            if (!allSheets.value.includes(currentSheet.value)) {
                currentSheet.value = allSheets.value[0];
            }
        }
        
        if (Array.isArray(data)) {
            // 分離 Metadata 與 景點資料
            const config = data.find(row => row.ID === "CONFIG");
            if (config) {
                metadata.value["基礎資訊"] = config["基礎資訊"] || "";
                metadata.value["特別提醒"] = config["特別提醒"] || "";
            } else {
                metadata.value = { "基礎資訊": "", "特別提醒": "" };
            }
            itineraryData.value = data.filter(row => row.ID !== "CONFIG" && row.ID); // 確保 ID 存在
        } else {
            console.error('Data format error from backend:', data);
            itineraryData.value = [];
        }
    } catch (err) {
        console.error('Fetch error:', err);
        triggerToast('雲端連線失敗，請檢查 API URL 或部署設定', 'error');
    } finally {
        loading.value = false;
        nextTick(initSortable);
    }
};

const initSortable = () => {
    const el = document.querySelector('.grid-container');
    if (!el) return;
    
    if (sortableInstance) {
        sortableInstance.destroy();
    }

    sortableInstance = new Sortable(el, {
        animation: 300,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        onEnd: (evt) => {
            if (evt.oldIndex === evt.newIndex) return;
            handleReorder(evt.oldIndex, evt.newIndex);
        }
    });
};

const handleSave = async (parsedData) => {
    showImportModal.value = false;
    if (!API_URL) {
        return triggerToast('請先設定 .env 檔案中的 VITE_API_URL', 'error');
    }

    let targetSheet = currentSheet.value;
    const detectedName = parsedData.metadata.locationName;
    
    // 定義真正的儲存邏輯
    const executeSave = async (finalSheet) => {
        loading.value = true;
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify({
                    action: "write",
                    sheetName: finalSheet,
                    metadata: parsedData.metadata,
                    data: parsedData.items
                })
            });
            const result = await response.json();
            if (result.success) {
                triggerToast(result.message);
                await fetchData();
            }
        } catch (err) {
            triggerToast('同步失敗', 'error');
        } finally {
            loading.value = false;
        }
    };

    if (detectedName && detectedName !== currentSheet.value) {
        if (currentSheet.value === "預設行程") {
            openModal({
                title: '智慧偵測',
                message: `偵測到行程地點為「${detectedName}」，是否要以此名稱儲存？`,
                type: 'confirm',
                onConfirm: (ok) => {
                    if (ok) {
                        targetSheet = detectedName;
                        if (!allSheets.value.includes(targetSheet)) allSheets.value.push(targetSheet);
                        currentSheet.value = targetSheet;
                    }
                    executeSave(targetSheet);
                }
            });
            return;
        } 
        else if (detectedName.includes(currentSheet.value) || currentSheet.value.includes(detectedName)) {
            targetSheet = currentSheet.value;
        }
        else {
            openModal({
                title: '建立新分頁？',
                message: `目前在「${currentSheet.value}」，但偵測到內容是「${detectedName}」，要建立新分頁儲存嗎？\n(取消則儲存至目前分頁)`,
                type: 'confirm',
                onConfirm: (createNew) => {
                    if (createNew) {
                        targetSheet = detectedName;
                        if (!allSheets.value.includes(targetSheet)) allSheets.value.push(targetSheet);
                        currentSheet.value = targetSheet;
                    }
                    executeSave(targetSheet);
                }
            });
            return;
        }
    }

    executeSave(targetSheet);
};

const handleAddManual = async (newItem) => {
    showAddModal.value = false;
    isSyncing.value = true;
    // 樂觀更新 UI
    itineraryData.value.push(newItem);
    nextTick(initSortable);

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "write",
                sheetName: currentSheet.value,
                data: [newItem],
                metadata: metadata.value
            })
        });
        const result = await response.json();
        if (result.success) {
            triggerToast('已新增一個景點');
        } else {
            triggerToast(result.error || '新增失敗', 'error');
            await fetchData(); // 失敗時重新抓取
        }
    } catch (err) {
        triggerToast('新增失敗', 'error');
        await fetchData();
    } finally {
        isSyncing.value = false;
    }
};

const handleReorder = async (oldIdx, newIdx) => {
    if (itineraryData.value.length === 0) return;
    
    const items = [...itineraryData.value];
    const [movedItem] = items.splice(oldIdx, 1);
    items.splice(newIdx, 0, movedItem);
    itineraryData.value = items;

    // 非阻塞同步
    isSyncing.value = true;
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            mode: "cors",
            headers: {
                "Content-Type": "text/plain;charset=utf-8",
            },
            body: JSON.stringify({
                action: "syncAll",
                sheetName: currentSheet.value,
                data: itineraryData.value,
                metadata: metadata.value
            })
        });
        const result = await response.json();
        if (result.success) {
            triggerToast('順序已保存');
        } else {
            triggerToast(result.error || '順序保存失敗', 'error');
            // 只有在明確錯誤且需要恢復時才重新抓取
            if (!result.error?.includes("拒絕同步")) {
                await fetchData();
            }
        }
    } catch (err) {
        console.error("Sync failed:", err);
        // 如果是網路錯誤，暫不強制重新抓取，以免清空 UI
        triggerToast('排序同步中...', 'info'); 
    } finally {
        isSyncing.value = false;
        nextTick(initSortable);
    }
};

const renameLocation = () => {
    openModal({
        title: '重新命名',
        message: `請輸入「${currentSheet.value}」的新名稱:`,
        type: 'prompt',
        initialValue: currentSheet.value,
        onConfirm: async (newName) => {
            if (!newName || newName === currentSheet.value) return;
            loading.value = true;
            try {
                const response = await fetch(API_URL, {
                    method: "POST",
                    body: JSON.stringify({
                        action: "renameSheet",
                        sheetName: currentSheet.value,
                        newName: newName
                    })
                });
                const result = await response.json();
                if (result.success) {
                    triggerToast(result.message);
                    currentSheet.value = newName;
                    await fetchData();
                } else {
                    triggerToast(result.error, 'error');
                }
            } catch (err) {
                triggerToast('重新命名失敗', 'error');
            } finally {
                loading.value = false;
            }
        }
    });
};

const deleteLocation = () => {
    if (allSheets.value.length <= 1) {
        return triggerToast('不能刪除最後一個分頁', 'error');
    }
    openModal({
        title: '確認刪除',
        message: `確定要刪除「${currentSheet.value}」嗎？此動作不可撤銷！`,
        type: 'confirm',
        onConfirm: async (ok) => {
            if (!ok) return;
            loading.value = true;
            try {
                const response = await fetch(API_URL, {
                    method: "POST",
                    body: JSON.stringify({ action: "deleteSheet", sheetName: currentSheet.value })
                });
                const result = await response.json();
                if (result.success) {
                    triggerToast(result.message);
                    const remainingSheets = allSheets.value.filter(s => s !== currentSheet.value);
                    currentSheet.value = remainingSheets[0];
                    await fetchData();
                } else {
                    triggerToast(result.error || '刪除失敗', 'error');
                }
            } catch (err) {
                triggerToast('刪除失敗', 'error');
            } finally {
                loading.value = false;
            }
        }
    });
};

const addLocation = () => {
    openModal({
        title: '新增行程地點',
        message: '請輸入地點名稱:',
        type: 'prompt',
        onConfirm: (name) => {
            if (name && !allSheets.value.includes(name)) {
                allSheets.value.push(name);
                currentSheet.value = name;
                itineraryData.value = [];
            }
        }
    });
};

const switchTab = (sheet) => {
    currentSheet.value = sheet;
    fetchData();
};

const triggerToast = (msg, type = 'success') => {
    toastMsg.value = msg;
    showToast.value = true;
    setTimeout(() => showToast.value = false, 3000);
};

onMounted(fetchData);
</script>

<template>
    <header>
        <div class="header-main">
            <div class="logo">VibeTrip</div>
            <div class="active-tab-controls">
                <span v-if="isSyncing" class="sync-status">📡 存檔中...</span>
                <button @click="showImportModal = true" class="icon-btn" title="匯入資料">📥</button>
                <button @click="showAddModal = true" class="icon-btn" title="手動新增">➕</button>
                <button @click="renameLocation" class="icon-btn" title="重新命名分頁">✏️</button>
                <button @click="deleteLocation" class="icon-btn delete-btn" title="刪除分頁">🗑️</button>
            </div>
        </div>
        <nav class="tab-nav">
            <div class="nav-scroll">
                <button 
                    v-for="sheet in allSheets" 
                    :key="sheet"
                    class="tab-btn"
                    :class="{ active: currentSheet === sheet }"
                    @click="switchTab(sheet)"
                >
                    {{ sheet }}
                </button>
                <button class="tab-btn add-tab" @click="addLocation">+</button>
            </div>
        </nav>
    </header>

    <main>
        <div v-if="itineraryData.length === 0 && !loading" class="empty-state">
            <h2>🏖️ 目前尚無行程資料</h2>
            <p v-if="API_URL === 'YOUR_GAS_API_URL'">請先在 App.vue 中設定您的 GAS API URL</p>
            <p v-else>請點擊上方 📥 按鈕匯入資料，或用 ➕ 手動新增卡片。</p>
        </div>

        <div v-else class="grid-container">
            <ItineraryCard 
                v-for="(item, idx) in itineraryData" 
                :key="item.ID || idx" 
                :item="item" 
            />
        </div>

        <!-- 基礎資訊與提醒移動至卡片下方 -->
        <section v-if="metadata['基礎資訊'] || metadata['特別提醒']" class="summary-zone">
            <div v-if="metadata['基礎資訊']" class="glass-card summary-card">
                <h3>📋 基礎資訊</h3>
                <div class="pre-wrap">{{ metadata['基礎資訊'] }}</div>
            </div>
            <div v-if="metadata['特別提醒']" class="glass-card summary-card alert-card">
                <h3>💡 特別提醒</h3>
                <div class="pre-wrap">{{ metadata['特別提醒'] }}</div>
            </div>
        </section>

        <PWAInstructions />
    </main>


    <!-- Loading Overlay -->
    <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
        <p>正在同步雲端資料...</p>
    </div>

    <!-- Notification Toast -->
    <transition name="fade">
        <div v-if="showToast" class="toast">{{ toastMsg }}</div>
    </transition>

    <!-- Custom Modal -->
    <CustomModal 
        :show="modal.show"
        :title="modal.title"
        :message="modal.message"
        :type="modal.type"
        :initialValue="modal.initialValue"
        @confirm="handleModalConfirm"
        @cancel="modal.show = false"
    />
    <!-- Add Item Modal -->
    <AddItemModal 
        :show="showAddModal"
        @close="showAddModal = false"
        @add="handleAddManual"
    />
    <!-- Import Modal -->
    <ImportModal
        :show="showImportModal"
        :loading="loading"
        @close="showImportModal = false"
        @save="handleSave"
    />
</template>

<style>
header {
    position: sticky;
    top: 0;
    z-index: 1000;
    background: rgba(15, 17, 21, 0.95);
    backdrop-filter: blur(16px);
    margin-bottom: 2rem;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--border-color);
}

@media (max-width: 768px) {
    header {
        padding: 0.8rem 1rem;
        margin-bottom: 1.5rem;
    }
}

.header-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}

.active-tab-controls {
    display: flex;
    gap: 0.6rem;
}

.icon-btn {
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 0.3rem 0.6rem;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
}

.icon-btn:hover {
    background: rgba(255,255,255,0.15);
    transform: scale(1.05);
}

.delete-btn:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: #ef4444;
}

.logo {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.05em;
    background: linear-gradient(90deg, #fff, #94a3b8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.sync-status {
    font-size: 0.8rem;
    color: var(--accent-color);
    margin-right: 0.5rem;
    display: flex;
    align-items: center;
    font-weight: 500;
    opacity: 0.8;
}

nav.tab-nav {
    width: 100%;
}

.nav-scroll {
    display: flex;
    gap: 0.6rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    -webkit-overflow-scrolling: touch;
}

.nav-scroll::-webkit-scrollbar {
    display: none;
}

.tab-btn {
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: 0.5rem 1.25rem;
    border-radius: 99px;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;
}

.tab-btn.active {
    background: var(--text-primary);
    color: var(--bg-color);
    border-color: var(--text-primary);
}

.summary-zone {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 3rem;
}

.summary-card {
    padding: 1.5rem;
    font-size: 0.95rem;
}

.summary-card h3 {
    margin-bottom: 1rem;
    font-size: 1.1rem;
    color: var(--text-primary);
}

.alert-card {
    border-color: rgba(99, 102, 241, 0.3);
}

.pre-wrap {
    white-space: pre-wrap;
    color: var(--text-secondary);
    line-height: 1.8;
}

.grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
    align-items: start;
}

.empty-state {
    text-align: center;
    padding: 5rem 2rem;
}

.empty-state h2 {
    color: var(--text-secondary);
    margin-bottom: 1rem;
}

.loading-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: var(--text-primary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

.toast {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: var(--success);
    color: #fff;
    padding: 1rem 2rem;
    border-radius: 8px;
    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.5);
    z-index: 1001;
}

.fade-enter-active, .fade-leave-active {
    transition: opacity 0.5s;
}
.fade-enter-from, .fade-leave-to {
    opacity: 0;
}

@media (max-width: 768px) {
    .header-main {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }
    .logo { font-size: 1.4rem; }
    
    .nav-scroll {
        padding: 0 0.5rem 0.5rem;
        gap: 0.5rem;
    }

    .summary-zone { 
        grid-template-columns: 1fr; 
        margin-top: 1.5rem;
        margin-bottom: 1.5rem;
    }
    .grid-container { 
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        width: 100%;
        padding: 0;
    }
    .toast { left: 1rem; right: 1rem; bottom: 1rem; text-align: center; }
}

.sortable-ghost {
    opacity: 0.3;
    transform: scale(0.95);
    border: 2px dashed var(--accent-color) !important;
}
</style>
