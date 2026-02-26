<script setup>
import { ref, onMounted, nextTick, watch } from 'vue';
import Sortable from 'sortablejs';
import ItineraryCard from './components/ItineraryCard.vue';
import CustomModal from './components/CustomModal.vue';
import AddItemModal from './components/AddItemModal.vue';
import ImportModal from './components/ImportModal.vue';
import PWAInstructions from './components/PWAInstructions.vue';

// --- 配置區 ---
const API_URL = import.meta.env.VITE_API_URL || ""; 

// --- 狀態定義 ---
const currentSheet = ref(localStorage.getItem('currentSheet') || '行程 1');
const allSheets = ref(JSON.parse(localStorage.getItem('allSheets') || '["行程 1"]'));
const itineraryData = ref(JSON.parse(localStorage.getItem(`data_cache_${currentSheet.value}`) || '[]'));
const metadata = ref(JSON.parse(localStorage.getItem('metadata') || '{}'));

const editingItem = ref(null);
const loading = ref(false); // 控制全螢幕載入 (僅在完全沒資料時使用)
const isFetching = ref(false); // 控制背景同步狀態
const isSyncing = ref(false); // 控制存檔中狀態

const toastMsg = ref('');
const showToast = ref(false);
const showAddModal = ref(false);
const showImportModal = ref(false);
const regionalWeather = ref([]); 
let sortableInstance = null;

// 當切換分頁時，儲存名稱並更新氣象
watch(currentSheet, (newVal) => {
    localStorage.setItem('currentSheet', newVal);
    updateRegionalWeather();
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

// --- 通用地圖座標 ---
const TW_GEO_MAP = {
    "台北市": { lat: 25.0330, lon: 121.5654 },
    "新北市": { lat: 25.0120, lon: 121.4657 },
    "桃園市": { lat: 24.9936, lon: 121.3009 },
    "台中市": { lat: 24.1477, lon: 120.6736 },
    "台南市": { lat: 22.9997, lon: 120.2270 },
    "高雄市": { lat: 22.6273, lon: 120.3014 },
    "基隆市": { lat: 25.1284, lon: 121.7419 },
    "新竹市": { lat: 24.8138, lon: 120.9674 },
    "新竹縣": { lat: 24.8252, lon: 121.0124 },
    "嘉義市": { lat: 23.4805, lon: 120.4491 },
    "嘉義縣": { lat: 23.4518, lon: 120.2559 },
    "苗栗縣": { lat: 24.5601, lon: 120.8209 },
    "彰化縣": { lat: 24.0519, lon: 120.5161 },
    "南投縣": { lat: 23.9037, lon: 120.6867 },
    "雲林縣": { lat: 23.7092, lon: 120.4313 },
    "屏東縣": { lat: 22.6659, lon: 120.4862 },
    "宜蘭縣": { lat: 24.7570, lon: 121.7533 },
    "花蓮縣": { lat: 23.9769, lon: 121.6044 },
    "台東縣": { lat: 22.7584, lon: 121.1444 },
    "澎湖縣": { lat: 23.5711, lon: 119.5793 },
    "金門縣": { lat: 24.4367, lon: 118.3183 },
    "連江縣": { lat: 26.1557, lon: 119.9513 }
};

// --- API 溝通相關 ---

/**
 * 核心同步函式：全面使用 POST + text/plain 以避開 CORS 問題
 */
const syncToGAS = async (payload) => {
    if (!API_URL) {
        triggerToast('請先設定 .env 檔案中的 VITE_API_URL', 'error');
        return { success: false };
    }
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            mode: "cors",
            redirect: "follow",
            cache: "no-cache",
            headers: {
                "Content-Type": "text/plain",
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (err) {
        console.error("[Sync Error]", err);
        return { success: false, error: "連線失敗，請檢查網路或 API 設定" };
    }
};

const saveLocal = () => {
    localStorage.setItem(`data_cache_${currentSheet.value}`, JSON.stringify(itineraryData.value));
    localStorage.setItem('metadata', JSON.stringify(metadata.value));
};

const fetchData = async () => {
    if (!API_URL) return;

    // 嘗試從分頁特定的快取中讀取
    const sheetCacheKey = `data_cache_${currentSheet.value}`;
    const cachedData = localStorage.getItem(sheetCacheKey);
    if (cachedData) {
        itineraryData.value = JSON.parse(cachedData);
    }

    const hasData = itineraryData.value.length > 0;
    if (!hasData) loading.value = true;
    isFetching.value = true;

    try {
        const [sheets, data] = await Promise.all([
            syncToGAS({ action: 'getSheets' }),
            syncToGAS({ action: 'read', sheetName: currentSheet.value })
        ]);
        
        if (Array.isArray(sheets)) {
            allSheets.value = sheets;
            localStorage.setItem('allSheets', JSON.stringify(sheets));
        }

        if (Array.isArray(data)) {
            const config = data.find(row => row.ID === "CONFIG");
            metadata.value = config ? { "基礎資訊": config["基礎資訊"] || "", "特別提醒": config["特別提醒"] || "" } : { "基礎資訊": "", "特別提醒": "" };
            
            itineraryData.value = data.filter(row => row.ID !== "CONFIG" && row.ID);
            
            // 更新特定分頁快取與全域快取
            saveLocal();
        }
    } catch (err) {
        console.error('Fetch error:', err);
        if (!hasData) triggerToast('雲端連線失敗', 'error');
    } finally {
        loading.value = false;
        isFetching.value = false;
        nextTick(() => {
            initSortable();
            updateRegionalWeather();
        });
    }
};

const updateRegionalWeather = async () => {
    const cities = new Set();
    const TW_CITIES_SHORT = ["基隆", "台北", "新北", "桃園", "新竹", "苗栗", "台中", "彰化", "南投", "雲林", "嘉義", "台南", "高雄", "屏東", "宜蘭", "花蓮", "台東", "澎湖", "金門", "馬祖"];

    // 寬鬆提取：從所有欄位中尋找縣市名稱 (包括使用者可能填錯的位址)
    itineraryData.value.forEach(item => {
        // 合併所有可能包含地名的文字
        const allText = [
            item['所在縣市'],
            item['建議停留'],
            item['地址'],
            item['景點名稱']
        ].join(' ');

        TW_CITIES_SHORT.forEach(shortName => {
            if (allText.includes(shortName)) {
                // 標準化名稱
                const isCity = ["台北", "新北", "桃園", "台中", "台南", "高雄", "新竹", "嘉義", "基隆"].includes(shortName);
                cities.add(shortName + (isCity ? "市" : "縣"));
            }
        });
    });

    if (cities.size === 0) {
        regionalWeather.value = [];
        return;
    }

    // 初始化狀態
    const newWeatherData = Array.from(cities).map(city => ({ city, loading: true }));
    regionalWeather.value = newWeatherData;

    newWeatherData.forEach(async (item, index) => {
        try {
            let latitude, longitude, cityName = item.city;

            // 1. 優先查看靜態地圖
            if (TW_GEO_MAP[item.city]) {
                latitude = TW_GEO_MAP[item.city].lat;
                longitude = TW_GEO_MAP[item.city].lon;
            } else {
                // 2. 查 Geocoding API
                const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(item.city)}&count=1&language=zh&format=json`;
                const res = await fetch(url);
                const geoData = await res.json();
                if (geoData.results && geoData.results.length > 0) {
                    latitude = geoData.results[0].latitude;
                    longitude = geoData.results[0].longitude;
                    cityName = geoData.results[0].name;
                }
            }

            if (latitude !== undefined) {
                // 抓取當前氣象以及每小時預報（包含降雨機率）
                const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=precipitation_probability&timezone=auto`);
                const wData = await weatherRes.json();
                
                if (wData.current_weather) {
                    // 取得當前小時的降雨機率
                    const currentHourIdx = new Date().getHours();
                    const rainProb = wData.hourly ? wData.hourly.precipitation_probability[currentHourIdx] : 0;

                    regionalWeather.value[index] = {
                        city: cityName,
                        temp: Math.round(wData.current_weather.temperature),
                        code: wData.current_weather.weathercode,
                        rain: rainProb,
                        loading: false
                    };
                }
            }
        } catch (err) {
            console.error("[Weather Error]", err);
            if (regionalWeather.value[index]) regionalWeather.value[index].loading = false;
        }
    });
};

const getWeatherIcon = (code) => {
    if (code === 0) return '☀️';
    if (code <= 3) return '🌤️';
    if (code === 45 || code === 48) return '🌫️';
    if (code >= 51 && code <= 55) return '🌦️';
    if (code >= 61 && code <= 65) return '🌧️';
    if (code >= 71 && code <= 77) return '❄️';
    if (code >= 80 && code <= 82) return '🌦️';
    if (code >= 95) return '⛈️';
    return '🌡️';
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
    loading.value = true;
    
    const targetSheet = parsedData.metadata.locationName || currentSheet.value;
    
    const result = await syncToGAS({
        action: "write",
        sheetName: targetSheet,
        metadata: parsedData.metadata,
        data: parsedData.items
    });

    if (result.success) {
        triggerToast('匯入成功');
        currentSheet.value = targetSheet;
        await fetchData();
    } else {
        triggerToast(result.error || '同步失敗', 'error');
    }
    loading.value = false;
};

const handleAddManual = async (newItem) => {
    isSyncing.value = true;
    showAddModal.value = false;
    
    // 樂觀更新
    itineraryData.value.push(newItem);
    saveLocal();

    const result = await syncToGAS({
        action: "write",
        sheetName: currentSheet.value,
        data: [newItem],
        metadata: metadata.value
    });

    if (result.success) {
        triggerToast('景點已新增');
        updateRegionalWeather();
    } else {
        triggerToast(result.error || '同步失敗', 'error');
        await fetchData(); // 失敗時回滾
    }
    isSyncing.value = false;
};

const handleUpdateManual = async (updatedItem) => {
    isSyncing.value = true;
    showAddModal.value = false;
    editingItem.value = null;

    // 樂觀更新
    const index = itineraryData.value.findIndex(item => item.ID === updatedItem.ID);
    if (index !== -1) {
        itineraryData.value[index] = updatedItem;
        saveLocal();
    }

    // 更新雲端 (使用 syncAll 覆寫)
    const result = await syncToGAS({
        action: "syncAll",
        sheetName: currentSheet.value,
        data: itineraryData.value,
        metadata: metadata.value
    });

    if (result.success) {
        triggerToast('景點資料已更新');
        updateRegionalWeather();
    } else {
        triggerToast(result.error || '更新同步失敗', 'error');
        await fetchData();
    }
    isSyncing.value = false;
};

const handleEditClick = (item) => {
    editingItem.value = item;
    showAddModal.value = true;
};

const handleDeleteItem = (targetItem) => {
    openModal({
        title: '確認刪除景點',
        message: `確定要從行程中刪除「${targetItem['景點名稱']}」嗎？`,
        type: 'confirm',
        onConfirm: async (ok) => {
            if (!ok) return;
            
            isSyncing.value = true;
            // 樂觀更新 UI 與快取
            itineraryData.value = itineraryData.value.filter(item => item !== targetItem);
            saveLocal();

            // 同步到雲端 (使用 syncAll 覆寫當前分頁)
            const result = await syncToGAS({
                action: "syncAll",
                sheetName: currentSheet.value,
                data: itineraryData.value,
                metadata: metadata.value
            });

            if (result.success) {
                triggerToast('景點已刪除');
                updateRegionalWeather();
            } else {
                triggerToast(result.error || '同步失敗', 'error');
                await fetchData(); // 失敗時回滾
            }
            isSyncing.value = false;
        }
    });
};

const handleReorder = async (oldIdx, newIdx) => {
    const items = [...itineraryData.value];
    const [movedItem] = items.splice(oldIdx, 1);
    items.splice(newIdx, 0, movedItem);
    itineraryData.value = items;
    saveLocal();

    isSyncing.value = true;
    const result = await syncToGAS({
        action: "syncAll",
        sheetName: currentSheet.value,
        data: itineraryData.value,
        metadata: metadata.value
    });

    if (result.success) {
        triggerToast('順序已保存');
    } else {
        triggerToast(result.error || '順序同步失敗', 'error');
        await fetchData();
    }
    isSyncing.value = false;
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
            const result = await syncToGAS({
                action: "renameSheet",
                sheetName: currentSheet.value,
                newName: newName
            });

            if (result.success) {
                currentSheet.value = newName;
                await fetchData();
            } else {
                triggerToast(result.error || '命名失敗', 'error');
            }
            loading.value = false;
        }
    });
};

const deleteLocation = () => {
    if (allSheets.value.length <= 1) {
        return triggerToast('不能刪除最後一個分頁', 'error');
    }
    openModal({
        title: '確認刪除',
        message: `確定要刪除「${currentSheet.value}」嗎？`,
        type: 'confirm',
        onConfirm: async (ok) => {
            if (!ok) return;
            loading.value = true;
            const result = await syncToGAS({ action: "deleteSheet", sheetName: currentSheet.value });
            if (result.success) {
                const remainingSheets = allSheets.value.filter(s => s !== currentSheet.value);
                currentSheet.value = remainingSheets[0];
                await fetchData();
            } else {
                triggerToast(result.error || '刪除失敗', 'error');
            }
            loading.value = false;
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
                saveLocal();
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
            <div class="brand-area">
                <div class="logo">VibeTrip</div>
                <div class="sync-status-container">
                    <span v-if="isFetching" class="sync-status fetching">📡 同步中...</span>
                    <span v-else-if="isSyncing" class="sync-status">💾 存檔中...</span>
                </div>
            </div>
            <div class="active-tab-controls">
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
        
        <div v-if="regionalWeather.length > 0" class="weather-summary-bar">
            <div v-for="w in regionalWeather" :key="w.city" class="weather-card-mini glass-card">
                <template v-if="!w.loading">
                    <div class="w-compact">
                        <span class="w-city-name">{{ w.city }}</span>
                        <span class="w-icon-mini">{{ getWeatherIcon(w.code) }}</span>
                        <span class="w-temp-mini">{{ w.temp }}°</span>
                        <span class="w-details-mini">💧{{ w.rain }}%</span>
                    </div>
                </template>
                <div v-else class="weather-loading-mini">
                    <div class="mini-spinner"></div>
                </div>
            </div>
        </div>
    </header>

    <main>
        <!-- 背景同步中的弱提示 (如果已有資料) -->
        <div v-if="isFetching && itineraryData.length > 0" class="top-sync-indicator">
            <div class="mini-spinner"></div>
            正在檢查雲端更新...
        </div>

        <div v-if="itineraryData.length === 0 && !loading" class="empty-state glass-card">
            <div class="empty-icon">🏝️</div>
            <h2>尚未發現行程資料</h2>
            <p>目前此分頁是空的，您可以從 Google Sheets 手動新增資料，或是點擊上方「➕」開始規劃第一筆行程！</p>
            <div class="empty-actions">
                <button @click="showAddModal = true" class="primary-btn">➕ 新增第一個景點</button>
                <button @click="fetchData" class="secondary-btn">🔄 重新整理</button>
            </div>
        </div>

        <div v-else class="grid-container">
            <ItineraryCard 
                v-for="(item, idx) in itineraryData" 
                :key="item.ID || idx" 
                :item="item" 
                @delete="handleDeleteItem"
                @edit="handleEditClick"
            />
        </div>

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

    <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
        <p>正在同步雲端資料...</p>
    </div>

    <transition name="fade">
        <div v-if="showToast" class="toast">{{ toastMsg }}</div>
    </transition>

    <CustomModal 
        :show="modal.show"
        :title="modal.title"
        :message="modal.message"
        :type="modal.type"
        :initialValue="modal.initialValue"
        @confirm="handleModalConfirm"
        @cancel="modal.show = false"
    />
    <AddItemModal 
        :show="showAddModal" 
        :initialData="editingItem"
        @close="showAddModal = false; editingItem = null" 
        @add="handleAddManual" 
        @update="handleUpdateManual"
    />
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
    padding: 1rem 2rem; /* 與 main padding 保持一致 */
    border-bottom: 1px solid var(--border-color);
}

.brand-area {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.sync-status-container {
    height: 14px; /* 固定高度防止跳動 */
    margin-top: -2px;
}

.sync-status {
    font-size: 0.65rem;
    color: var(--accent-color);
    opacity: 0.7;
    font-weight: 500;
}

.header-main {
    display: flex;
    justify-content: space-between;
    align-items: flex-start; /* 改為向上對齊 */
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
}

.logo {
    font-size: 1.5rem;
    font-weight: 700;
    background: linear-gradient(90deg, #fff, #94a3b8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.tab-nav {
    width: 100%;
}

.nav-scroll {
    display: flex;
    gap: 0.6rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE/Edge */
}

.nav-scroll::-webkit-scrollbar {
    display: none; /* Chrome/Safari */
}

.tab-btn {
    background: transparent;
    border: 1px solid var(--border-color);
    color: var(--text-secondary);
    padding: 0.5rem 1.25rem;
    border-radius: 99px;
    white-space: nowrap;
}

.tab-btn.active {
    background: var(--text-primary);
    color: var(--bg-color);
    border-color: var(--text-primary);
}

.weather-summary-bar {
    display: flex;
    gap: 0.6rem;
    margin-top: 1rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE/Edge */
}

.weather-summary-bar::-webkit-scrollbar {
    display: none; /* Chrome/Safari */
}

.weather-card-mini {
    flex: 0 0 auto;
    padding: 0.4rem 0.8rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border-color);
    border-radius: 99px; /* 改為橢圓形更精簡 */
}

.w-compact {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    white-space: nowrap;
}

.w-icon-mini {
    font-size: 1.1rem;
    display: flex;
    align-items: center;
}

.w-temp-mini {
    font-size: 1rem;
    font-weight: 700;
    color: var(--text-primary);
}

.w-city-name {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-primary);
}

.w-details-mini {
    font-size: 0.8rem;
    color: var(--accent-color);
    font-weight: 500;
}

.sync-status {
    font-size: 0.75rem;
    color: var(--accent-color);
    display: flex;
    align-items: center;
    margin-right: 0.5rem;
    opacity: 0.8;
}

.sync-status.fetching {
    color: #ffd700;
}

.empty-state {
    max-width: 500px;
    margin: 4rem auto;
    text-align: center;
    padding: 3rem 2rem;
}

.empty-icon {
    font-size: 4rem;
    margin-bottom: 1.5rem;
}

.empty-state h2 {
    margin-bottom: 1rem;
    color: var(--text-primary);
}

.empty-state p {
    color: var(--text-secondary);
    margin-bottom: 2rem;
    line-height: 1.6;
}

.empty-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
}

.primary-btn {
    background: var(--text-primary);
    color: var(--bg-color);
    border: none;
    padding: 0.8rem 1.5rem;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
}

.secondary-btn {
    background: rgba(255,255,255,0.05);
    border: 1px solid var(--border-color);
    color: var(--text-primary);
    padding: 0.8rem 1.5rem;
    border-radius: 12px;
    cursor: pointer;
}

.top-sync-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: #ffd700;
    margin-bottom: 1.5rem;
    opacity: 0.8;
}

.grid-container {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
}

.summary-zone {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-top: 2rem;
}

.glass-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    padding: 1.5rem;
}

.pre-wrap {
    white-space: pre-wrap;
    line-height: 1.8;
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
    background: var(--text-primary);
    color: var(--bg-color);
    padding: 1rem 2rem;
    border-radius: 8px;
}

@media (max-width: 768px) {
    .summary-zone { grid-template-columns: 1fr; }
    header {
        padding: 0.8rem 1rem;
        margin-bottom: 1.5rem;
    }
    .grid-container { display: flex; flex-direction: column; }
    .empty-actions { flex-direction: column; }
    .mini-spinner {
        width: 12px;
        height: 12px;
        border: 2px solid rgba(255, 215, 0, 0.2);
        border-top-color: #ffd700;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
}
</style>
