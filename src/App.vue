<script setup>
import { ref, onMounted } from 'vue';
import ItineraryCard from './components/ItineraryCard.vue';
import ImportZone from './components/ImportZone.vue';
import PWAInstructions from './components/PWAInstructions.vue';


// --- 配置區 ---
const API_URL = "YOUR_GAS_API_URL"; 

const metadata = ref({ "基礎資訊": "", "特別提醒": "" });
const currentSheet = ref("預設行程");
const allSheets = ref(["預設行程"]);
const itineraryData = ref([]);
const loading = ref(false);
const toastMsg = ref('');
const showToast = ref(false);

const fetchData = async () => {
    if (API_URL === "YOUR_GAS_API_URL") return;
    loading.value = true;
    try {
        const [sheetsRes, dataRes] = await Promise.all([
            fetch(`${API_URL}?action=getSheets`),
            fetch(`${API_URL}?action=read&sheetName=${encodeURIComponent(currentSheet.value)}`)
        ]);
        
        const sheets = await sheetsRes.json();
        const data = await dataRes.json();
        
        if (Array.isArray(sheets)) allSheets.value = sheets;
        
        if (Array.isArray(data)) {
            // 分離 Metadata 與 景點資料
            const config = data.find(row => row.ID === "CONFIG");
            if (config) {
                metadata.value["基礎資訊"] = config["基礎資訊"];
                metadata.value["特別提醒"] = config["特別提醒"];
            } else {
                metadata.value = { "基礎資訊": "", "特別提醒": "" };
            }
            itineraryData.value = data.filter(row => row.ID !== "CONFIG");
        }
    } catch (err) {
        console.error(err);
        triggerToast('連線失敗', 'error');
    } finally {
        loading.value = false;
    }
};

const handleSave = async (parsedData) => {
    loading.value = true;
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "write",
                sheetName: currentSheet.value,
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


const addLocation = () => {
    const name = prompt("請輸入新地點名稱:");
    if (name && !allSheets.value.includes(name)) {
        allSheets.value.push(name);
        currentSheet.value = name;
        itineraryData.value = [];
    }
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
        <div class="logo">VibeTrip</div>
        <nav>
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
        </nav>
    </header>

    <main>
        <!-- 行程總覽區塊 -->
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


        <div v-if="itineraryData.length === 0 && !loading" class="empty-state">

            <h2>🏖️ 目前尚無行程資料</h2>
            <p v-if="API_URL === 'YOUR_GAS_API_URL'">請先在 App.vue 中設定您的 GAS API URL</p>
            <p v-else>請在下方區塊貼上 JSON 資料以建立第一個行程。</p>
        </div>

        <div v-else class="grid-container">
            <ItineraryCard 
                v-for="(item, idx) in itineraryData" 
                :key="idx" 
                :item="item" 
            />
        </div>


        <ImportZone :loading="loading" @save="handleSave" />
        
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
</template>

<style>
header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 3rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
}

.logo {
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: -0.05em;
    background: linear-gradient(90deg, #fff, #94a3b8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

nav {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding-bottom: 0.5rem;
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
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
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
    header { 
        flex-direction: column; 
        align-items: flex-start;
        gap: 1.5rem; 
    }
    .logo { font-size: 1.8rem; }
    nav { width: 100%; padding-bottom: 0.5rem; }
    .summary-zone { grid-template-columns: 1fr; }
    .grid-container { grid-template-columns: 1fr; }
    .toast { left: 1rem; right: 1rem; bottom: 1rem; text-align: center; }
}

</style>
