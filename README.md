# VibeTrip | 通用型旅遊規劃器 (Vue 3 + GAS)

VibeTrip 是一款專為「懶人」設計的旅遊規劃工具。它結合了 Google Sheets 的強大資料處理能力與 Vue 3 的現代化介面，支援自動初始化標題列，讓你只需貼上 JSON 資料即可快速建立精美的旅遊行程。

## 🚀 核心功能

- **✨ 自動初始化**：初次建立地點（工作表）時，系統會自動在第一行補全欄位標題。
- **📊 響應式佈局**：支援桌面與手機端，提供極簡且現代的深色模式視圖。
- **🔌 JSON 快速匯入**：支援從 AI 生成器或其他來源複製的 JSON 資料一鍵同步至雲端。
- **🗺️ 地圖聯動**：點擊地址自動跳轉至 Google Maps 導航。
- **🔄 動態分頁**：自由建立多個旅遊地點，資料讀取不報錯。

## 🛠️ 技術棧

- **Frontend**: Vue 3 (Composition API), Vite, Vanilla CSS
- **Backend**: Google Apps Script (GAS)
- **Database**: Google Sheets

## 📝 欄位定義 (自動生成)

系統預設會初始化以下欄位：
`["ID", "景點名稱", "照片URL", "地址", "交通停車", "建議停留", "費用", "介紹"]`

## ⚙️ 快速上手

### 1. 後端部署 (GAS)
1. 建立一個新的 Google 試算表。
2. 點擊「延伸功能」 > 「Apps Script」。
3. 貼入專案中的 `CODE.gs` 內容。
4. 點擊「部署」 > 「新部署」。
5. 類型選擇「網頁應用程式」，並將權限設為「任何人 (Anyone)」。
6. 複製生成的 **Web App URL**。

### 2. 前端設定
1. 在 `/src/App.vue` 中尋找 `const API_URL = "YOUR_GAS_API_URL";`。
2. 將其替換為你剛才複製的 GAS 網址。

### 3. 本地運行
```bash
# 安裝依賴
npm install

# 啟動開發環境
npm run dev

# 構建生產版資料
npm run build
```

## 📂 檔案結構

```text
├── src/
│   ├── components/
│   │   ├── ItineraryCard.vue  # 行程顯示組件
│   │   └── ImportZone.vue     # 資料匯入組件
│   ├── App.vue                # 主程式與邏輯
│   ├── main.js                # 入口點
│   └── style.css              # 全域樣式
├── index.html                 # HTML 模板
├── CODE.gs                    # GAS 後端程式碼
└── README.md                  # 專案文件
```

---

*Made with ❤️ for travelers.*
