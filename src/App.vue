<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import Sortable from 'sortablejs';
import ItineraryCard from './components/ItineraryCard.vue';
import CustomModal from './components/CustomModal.vue';
import AddItemModal from './components/AddItemModal.vue';
import ImportModal from './components/ImportModal.vue';
import UserGuideModal from './components/UserGuideModal.vue';
import BaseIcon from './components/BaseIcon.vue';

// --- 配置區 ---
const API_URL = import.meta.env.VITE_API_URL || "";

// --- 狀態定義 ---
const currentSheet = ref(localStorage.getItem('currentSheet') || '行程 1');
const allSheets = ref(JSON.parse(localStorage.getItem('allSheets') || '["行程 1"]'));
const itineraryData = ref(JSON.parse(localStorage.getItem(`data_cache_${currentSheet.value}`) || '[]'));
const metadata = ref(JSON.parse(localStorage.getItem('metadata') || '{}'));

const editingItem = ref(null);
const loading = ref(false); // 控制全螢幕載入 (匯入 / 改名 / 刪除等阻塞操作)
const initialLoading = ref(false); // 首次載入且無快取時顯示骨架屏
const isFetching = ref(false); // 控制背景同步狀態
const isSyncing = ref(false); // 控制存檔中狀態

const toast = ref({ show: false, msg: '', type: 'success' });
const showAddModal = ref(false);
const showImportModal = ref(false);
const showUserGuide = ref(false);
const menuOpen = ref(false);
const regionalWeather = ref([]);
let sortableInstance = null;
let toastTimer = null;
let lastFetchAt = 0;

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

// --- 更多選單 ---
const runFromMenu = (fn) => {
    menuOpen.value = false;
    fn();
};

const closeMenu = () => { menuOpen.value = false; };

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
        triggerToast('尚未連結雲端，請設定 .env 的 VITE_API_URL', 'error');
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

const saveSheets = () => {
    localStorage.setItem('allSheets', JSON.stringify(allSheets.value));
};

const afterDataReady = () => {
    nextTick(() => {
        initSortable();
        updateRegionalWeather();
    });
};

const fetchData = async () => {
    const sheetCacheKey = `data_cache_${currentSheet.value}`;
    const cachedData = localStorage.getItem(sheetCacheKey);
    if (cachedData) {
        itineraryData.value = JSON.parse(cachedData);
    }

    // 未設定後端時只跑本機初始化，別讓拖曳排序與氣象一起停擺
    if (!API_URL) {
        afterDataReady();
        return;
    }

    const hasData = itineraryData.value.length > 0;
    // 沒有快取可先墊檔時才顯示骨架屏，有快取就直接看舊資料、背景更新
    if (!hasData) initialLoading.value = true;
    isFetching.value = true;

    try {
        // getSheets 與 read 彼此不相依，平行送可省掉一整趟 GAS 延遲（約 1.6 秒）
        const [sheetsResult, dataResult] = await Promise.all([
            syncToGAS({ action: 'getSheets' }),
            syncToGAS({ action: 'read', sheetName: currentSheet.value })
        ]);

        let finalData = dataResult;

        if (Array.isArray(sheetsResult)) {
            allSheets.value = sheetsResult;
            saveSheets();

            // 目前分頁在雲端已不存在時，才需要補讀第一個分頁
            if (!sheetsResult.includes(currentSheet.value) && sheetsResult.length > 0) {
                console.log(`[Startup] Switching from "${currentSheet.value}" to "${sheetsResult[0]}"`);
                currentSheet.value = sheetsResult[0];
                finalData = await syncToGAS({ action: 'read', sheetName: currentSheet.value });
            }
        }

        if (Array.isArray(finalData)) {
            processIncomingData(finalData);
        }
    } catch (err) {
        console.error('Fetch error:', err);
        if (!hasData) triggerToast('雲端連線失敗，請檢查網路', 'error');
    } finally {
        initialLoading.value = false;
        isFetching.value = false;
        afterDataReady();
    }
};

/**
 * 只重讀單一分頁：切換分頁與手動刷新都用這支，省掉 getSheets 那趟
 */
const reloadSheet = async (sheetName) => {
    if (!API_URL) {
        afterDataReady();
        return;
    }
    isFetching.value = true;
    try {
        const dataResult = await syncToGAS({ action: 'read', sheetName });
        // 期間使用者又切走了就不要蓋掉畫面
        if (sheetName !== currentSheet.value) return;
        if (Array.isArray(dataResult)) processIncomingData(dataResult);
    } finally {
        isFetching.value = false;
        afterDataReady();
    }
};

const manualRefresh = async () => {
    if (isFetching.value || !API_URL) return;
    await reloadSheet(currentSheet.value);
    triggerToast('已重新讀取雲端資料');
};

// 從背景切回前景時自動重抓，避免長時間停留在舊資料
const handleVisibility = () => {
    if (document.visibilityState !== 'visible') return;
    if (Date.now() - lastFetchAt < 30000) return;
    lastFetchAt = Date.now();
    reloadSheet(currentSheet.value);
};

const processIncomingData = (data) => {
    lastFetchAt = Date.now();
    const config = data.find(row => row.ID === "CONFIG");
    metadata.value = config ? { "基礎資訊": config["基礎資訊"] || "", "特別提醒": config["特別提醒"] || "" } : { "基礎資訊": "", "特別提醒": "" };
    itineraryData.value = data.filter(row => row.ID !== "CONFIG" && row.ID);
    saveLocal();
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
    const el = document.querySelector('.timeline');
    if (!el) return;

    if (sortableInstance) {
        sortableInstance.destroy();
    }

    sortableInstance = new Sortable(el, {
        animation: 250,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        // 手機長按才啟動拖曳，避免與頁面捲動打架
        delay: 180,
        delayOnTouchOnly: true,
        touchStartThreshold: 5,
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

const openAddModal = () => {
    editingItem.value = null;
    showAddModal.value = true;
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
        title: '重新命名行程',
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
        return triggerToast('不能刪除最後一個行程', 'error');
    }
    openModal({
        title: '確認刪除行程',
        message: `確定要刪除「${currentSheet.value}」嗎？此行程的所有景點都會一併消失。`,
        type: 'confirm',
        onConfirm: async (ok) => {
            if (!ok) return;
            loading.value = true;
            const result = await syncToGAS({ action: "deleteSheet", sheetName: currentSheet.value });
            if (result.success) {
                const remainingSheets = allSheets.value.filter(s => s !== currentSheet.value);
                allSheets.value = remainingSheets;
                saveSheets();
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
        title: '新增行程',
        message: '請輸入行程名稱:',
        type: 'prompt',
        onConfirm: (name) => {
            if (name && !allSheets.value.includes(name)) {
                allSheets.value.push(name);
                saveSheets();
                currentSheet.value = name;
                itineraryData.value = [];
                saveLocal();
            }
        }
    });
};

const switchTab = (sheet) => {
    if (sheet === currentSheet.value) return;
    currentSheet.value = sheet;
    // 先用快取墊檔，畫面立刻換頁，雲端資料回來再覆蓋
    const cached = localStorage.getItem(`data_cache_${sheet}`);
    itineraryData.value = cached ? JSON.parse(cached) : [];
    reloadSheet(sheet);
};

const triggerToast = (msg, type = 'success') => {
    toast.value = { show: true, msg, type };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.value.show = false; }, 3000);
};

const syncLabel = computed(() => {
    if (isFetching.value) return '同步中';
    if (isSyncing.value) return '存檔中';
    return '';
});

onMounted(() => {
    document.addEventListener('click', closeMenu);
    document.addEventListener('visibilitychange', handleVisibility);
    fetchData();
});

onUnmounted(() => {
    document.removeEventListener('click', closeMenu);
    document.removeEventListener('visibilitychange', handleVisibility);
    clearTimeout(toastTimer);
});
</script>

<template>
    <header class="app-header">
        <div class="header-row">
            <div class="brand">
                <span class="brand-mark"><BaseIcon name="compass" :size="20" /></span>
                <span class="brand-text">
                    <span class="brand-name">VibeTrip</span>
                    <span class="brand-sub">
                        <template v-if="syncLabel">
                            <span class="spinner-mini"></span>{{ syncLabel }}
                        </template>
                        <template v-else>{{ itineraryData.length }} 個景點</template>
                    </span>
                </span>
            </div>

            <div class="header-actions">
                <button class="act" :class="{ spinning: isFetching }" @click="manualRefresh" title="重新讀取雲端資料" aria-label="重新整理">
                    <BaseIcon name="refresh" />
                </button>
                <button class="act" @click="showImportModal = true" title="匯入資料" aria-label="匯入資料">
                    <BaseIcon name="download" />
                </button>
                <button class="act act-primary" @click="openAddModal" title="新增景點">
                    <BaseIcon name="plus" />
                    <span class="act-label">新增景點</span>
                </button>
                <div class="menu-wrap" @click.stop>
                    <button class="act" :class="{ open: menuOpen }" @click="menuOpen = !menuOpen" title="更多" aria-label="更多操作">
                        <BaseIcon name="more" />
                    </button>
                    <transition name="menu-pop">
                        <div v-if="menuOpen" class="menu">
                            <button @click="runFromMenu(renameLocation)"><BaseIcon name="pencil" :size="16" />重新命名行程</button>
                            <button @click="runFromMenu(() => showUserGuide = true)"><BaseIcon name="book" :size="16" />使用教學</button>
                            <div class="menu-sep"></div>
                            <button class="danger" @click="runFromMenu(deleteLocation)"><BaseIcon name="trash" :size="16" />刪除此行程</button>
                        </div>
                    </transition>
                </div>
            </div>
        </div>

        <nav class="tabs u-scroll-x">
            <button
                v-for="sheet in allSheets"
                :key="sheet"
                class="tab"
                :class="{ active: currentSheet === sheet }"
                @click="switchTab(sheet)"
            >
                {{ sheet }}
            </button>
            <button class="tab tab-add" @click="addLocation" title="新增行程">
                <BaseIcon name="plus" :size="15" />
            </button>
        </nav>

        <div v-if="regionalWeather.length > 0" class="weather-bar u-scroll-x">
            <div v-for="w in regionalWeather" :key="w.city" class="weather-pill">
                <template v-if="!w.loading">
                    <span class="w-city">{{ w.city }}</span>
                    <span class="w-icon">{{ getWeatherIcon(w.code) }}</span>
                    <span class="w-temp">{{ w.temp }}°</span>
                    <span class="w-rain">💧{{ w.rain }}%</span>
                </template>
                <span v-else class="spinner-mini"></span>
            </div>
        </div>
    </header>

    <main>
        <div v-if="initialLoading" class="timeline skeleton-list">
            <div v-for="n in 3" :key="n" class="sk-station">
                <span class="sk-dot"></span>
                <div class="sk-card">
                    <span class="sk-line w60"></span>
                    <span class="sk-chips"></span>
                    <span class="sk-line w100"></span>
                    <span class="sk-line w80"></span>
                </div>
            </div>
        </div>

        <section v-else-if="itineraryData.length === 0 && !loading" class="empty">
            <span class="empty-icon"><BaseIcon name="island" :size="30" /></span>
            <h2>這趟行程還是一張白紙</h2>
            <p>加入第一個想去的地方，VibeTrip 會自動幫你抓地址、排順序，還會盯著當地天氣。</p>
            <div class="empty-actions">
                <button @click="openAddModal" class="btn btn-primary"><BaseIcon name="plus" :size="17" />新增第一個景點</button>
                <button @click="showImportModal = true" class="btn btn-ghost"><BaseIcon name="download" :size="17" />貼上表格匯入</button>
            </div>
            <p v-if="!API_URL" class="empty-warn">
                <BaseIcon name="alert" :size="15" />尚未連結 Google Sheets：缺少 <code>VITE_API_URL</code> 設定
            </p>
        </section>

        <div v-else class="timeline">
            <ItineraryCard
                v-for="(item, idx) in itineraryData"
                :key="item.ID || idx"
                :item="item"
                :index="idx + 1"
                @delete="handleDeleteItem"
                @edit="handleEditClick"
            />
        </div>

        <section v-if="metadata['基礎資訊'] || metadata['特別提醒']" class="notes">
            <div v-if="metadata['基礎資訊']" class="note-card">
                <h3><BaseIcon name="note" :size="17" />基礎資訊</h3>
                <div class="u-prewrap">{{ metadata['基礎資訊'] }}</div>
            </div>
            <div v-if="metadata['特別提醒']" class="note-card note-warn">
                <h3><BaseIcon name="bulb" :size="17" />特別提醒</h3>
                <div class="u-prewrap">{{ metadata['特別提醒'] }}</div>
            </div>
        </section>
    </main>

    <div v-if="loading" class="loading-overlay">
        <div class="spinner"></div>
        <p>正在同步雲端資料…</p>
    </div>

    <transition name="toast-slide">
        <div v-if="toast.show" class="toast" :class="toast.type">
            <BaseIcon :name="toast.type === 'error' ? 'alert' : 'check'" :size="17" />
            {{ toast.msg }}
        </div>
    </transition>

    <UserGuideModal
        :show="showUserGuide"
        @close="showUserGuide = false"
    />
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
/* ---------- 頁首 ---------- */
.app-header {
    position: sticky;
    top: 0;
    z-index: 100;
    margin: 0 -1.25rem 1.6rem;
    padding: calc(env(safe-area-inset-top, 0px) + 0.9rem) 1.25rem 0.7rem;
    background: var(--bg-header);
    backdrop-filter: blur(20px) saturate(160%);
    border-bottom: 1px solid var(--border);
}

.header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.9rem;
}

.brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    min-width: 0;
}

.brand-mark {
    display: grid;
    place-items: center;
    width: 34px;
    height: 34px;
    border-radius: var(--r-md);
    background: linear-gradient(140deg, var(--brand-fill), #8b5cf6);
    color: #fff;
    box-shadow: 0 6px 16px -8px var(--brand-fill);
}

.brand-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.brand-name {
    font-size: 1.12rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.2;
}

.brand-sub {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    height: 15px;
    font-size: 0.72rem;
    color: var(--text-3);
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 0.45rem;
}

.act {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    height: 38px;
    min-width: 38px;
    padding: 0 0.65rem;
    border-radius: var(--r-md);
    border: 1px solid var(--border);
    background: var(--surface-1);
    color: var(--text-2);
    transition: background 0.2s var(--ease), color 0.2s var(--ease),
        border-color 0.2s var(--ease);
}

.act:hover,
.act.open {
    background: var(--surface-2);
    border-color: var(--border-strong);
    color: var(--text-1);
}

.act-primary {
    background: var(--brand-fill);
    border-color: transparent;
    color: #fff;
    padding: 0 0.95rem;
    font-size: 0.88rem;
    font-weight: 600;
    box-shadow: 0 6px 18px -10px var(--brand-fill);
}

.act-primary:hover {
    background: #6a71f5;
    border-color: transparent;
    color: #fff;
}

.act:active {
    transform: scale(0.95);
}

/* 刷新圖示是 180 度旋轉對稱, 轉一圈視覺上等於兩次循環, 週期要拉長才不會顯得慌張 */
.act.spinning {
    color: var(--brand);
}

.act.spinning .ico {
    animation: spin 1.8s linear infinite;
}

/* 更多選單 */
.menu-wrap {
    position: relative;
}

.menu {
    position: absolute;
    top: calc(100% + 0.45rem);
    right: 0;
    z-index: 120;
    min-width: 190px;
    padding: 0.35rem;
    background: var(--surface-modal);
    border: 1px solid var(--border-strong);
    border-radius: var(--r-lg);
    box-shadow: var(--shadow-2);
}

.menu button {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.6rem 0.7rem;
    border-radius: var(--r-sm);
    font-size: 0.88rem;
    color: var(--text-1);
    text-align: left;
}

.menu button:hover {
    background: var(--surface-2);
}

.menu button.danger {
    color: var(--danger);
}

.menu button.danger:hover {
    background: var(--danger-soft);
}

.menu-sep {
    height: 1px;
    margin: 0.3rem 0.2rem;
    background: var(--border);
}

.menu-pop-enter-active,
.menu-pop-leave-active {
    transition: opacity 0.16s var(--ease), transform 0.16s var(--ease);
    transform-origin: top right;
}

.menu-pop-enter-from,
.menu-pop-leave-to {
    opacity: 0;
    transform: scale(0.94) translateY(-4px);
}

/* 行程分頁 */
.tabs {
    display: flex;
    gap: 0.45rem;
    padding-bottom: 0.15rem;
}

.tab {
    flex: 0 0 auto;
    padding: 0.42rem 1rem;
    border-radius: var(--r-full);
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-2);
    font-size: 0.86rem;
    font-weight: 500;
    white-space: nowrap;
    transition: all 0.2s var(--ease);
}

.tab:hover {
    color: var(--text-1);
    border-color: var(--border-strong);
}

.tab.active {
    background: var(--brand-fill);
    border-color: transparent;
    color: #fff;
    font-weight: 600;
}

.tab-add {
    display: inline-grid;
    place-items: center;
    width: 32px;
    padding: 0;
    border-style: dashed;
    color: var(--text-3);
}

/* 氣象列 */
.weather-bar {
    display: flex;
    gap: 0.45rem;
    margin-top: 0.7rem;
    padding-bottom: 0.15rem;
}

.weather-pill {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.75rem;
    border-radius: var(--r-full);
    border: 1px solid var(--border);
    background: var(--surface-1);
    white-space: nowrap;
}

.w-city {
    font-size: 0.8rem;
    font-weight: 600;
}

.w-icon {
    font-size: 0.95rem;
    line-height: 1;
}

.w-temp {
    font-size: 0.92rem;
    font-weight: 700;
}

.w-rain {
    font-size: 0.75rem;
    color: var(--text-2);
}

/* ---------- 主體 ---------- */
.timeline {
    display: flex;
    flex-direction: column;
}

/* 骨架屏：首次載入時先撐出版面，比空白轉圈有感 */
.sk-station {
    display: flex;
    align-items: flex-start;
    gap: 0.9rem;
}

.sk-dot {
    flex: 0 0 28px;
    width: 28px;
    height: 28px;
    margin-top: 0.55rem;
    border-radius: 50%;
    background: var(--surface-2);
}

.sk-card {
    flex: 1;
    min-width: 0;
    margin-bottom: 1rem;
    padding: 1.15rem 1.25rem;
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    background: var(--surface-1);
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
}

.sk-line,
.sk-chips {
    height: 12px;
    border-radius: 6px;
    background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0.05) 25%,
        rgba(255, 255, 255, 0.11) 37%,
        rgba(255, 255, 255, 0.05) 63%
    );
    background-size: 400% 100%;
    animation: sk-shimmer 1.4s ease infinite;
}

.sk-line.w60 {
    width: 55%;
    height: 17px;
}

.sk-line.w80 {
    width: 78%;
}

.sk-line.w100 {
    width: 100%;
}

.sk-chips {
    width: 62%;
    height: 21px;
    border-radius: var(--r-full);
}

@keyframes sk-shimmer {
    from {
        background-position: 100% 50%;
    }
    to {
        background-position: 0 50%;
    }
}

/* 空狀態 */
.empty {
    max-width: 460px;
    margin: 3.5rem auto;
    text-align: center;
}

.empty-icon {
    display: grid;
    place-items: center;
    width: 68px;
    height: 68px;
    margin: 0 auto 1.3rem;
    border-radius: 50%;
    background: var(--brand-soft);
    color: var(--brand);
}

.empty h2 {
    font-size: 1.3rem;
    margin-bottom: 0.6rem;
}

.empty p {
    color: var(--text-2);
    font-size: 0.92rem;
    margin-bottom: 1.7rem;
}

.empty-actions {
    display: flex;
    gap: 0.7rem;
    justify-content: center;
}

.empty-warn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 1.8rem;
    padding: 0.45rem 0.8rem;
    border-radius: var(--r-full);
    background: var(--warm-soft);
    color: var(--warm);
    font-size: 0.78rem;
}

.empty-warn code {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.75rem;
}

/* 備註區 */
.notes {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-top: 2.2rem;
}

.note-card {
    background: var(--surface-1);
    border: 1px solid var(--border);
    border-radius: var(--r-lg);
    padding: 1.25rem 1.35rem;
    font-size: 0.88rem;
    color: var(--text-2);
    line-height: 1.75;
}

.note-card h3 {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.95rem;
    color: var(--text-1);
    margin-bottom: 0.7rem;
}

.note-warn {
    border-color: rgba(245, 166, 35, 0.28);
    background: var(--warm-soft);
}

.note-warn h3 {
    color: var(--warm);
}

/* ---------- 覆蓋層 ---------- */
.loading-overlay {
    position: fixed;
    inset: 0;
    z-index: 3000;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    background: rgba(9, 11, 16, 0.78);
    backdrop-filter: blur(12px);
    color: var(--text-2);
    font-size: 0.88rem;
}

.toast {
    position: fixed;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 1.5rem);
    transform: translateX(-50%);
    z-index: 4000;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    max-width: min(90vw, 420px);
    padding: 0.75rem 1.15rem;
    border-radius: var(--r-full);
    background: var(--surface-modal);
    border: 1px solid var(--border-strong);
    box-shadow: var(--shadow-2);
    font-size: 0.88rem;
    font-weight: 500;
}

.toast.success {
    color: var(--success);
    border-color: rgba(52, 211, 153, 0.35);
}

.toast.error {
    color: var(--danger);
    border-color: rgba(242, 85, 90, 0.35);
}

.toast-slide-enter-active,
.toast-slide-leave-active {
    transition: opacity 0.25s var(--ease), transform 0.28s var(--ease-pop);
}

.toast-slide-enter-from,
.toast-slide-leave-to {
    opacity: 0;
    transform: translate(-50%, 14px);
}

/* ---------- 響應式 ---------- */
@media (max-width: 700px) {
    .notes {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 560px) {
    .app-header {
        margin: 0 -1rem 1.3rem;
        padding-left: 1rem;
        padding-right: 1rem;
    }

    .act-label {
        display: none;
    }

    .act-primary {
        padding: 0 0.65rem;
    }

    .empty-actions {
        flex-direction: column;
    }

    .empty {
        margin: 2.5rem auto;
    }
}
</style>
