/**
 * Markdown 表格解析器
 * 將 Markdown 表格轉換為 JSON 物件陣列
 */

const HEADER_MAP = {
    "ID": "ID",
    "景點名稱": "景點名稱",
    "名稱": "景點名稱",
    "景點照片 (URL)": "照片URL",
    "照片": "照片URL",
    "圖片": "照片URL",
    "Google 導航連結": "地址",
    "地址": "地址",
    "地點": "地址",
    "交通與停車資訊": "交通停車",
    "交通": "交通停車",
    "建議停留": "建議停留",
    "費用 (當地/台幣)": "費用",
    "費用": "費用",
    "景點介紹與營業確認": "介紹",
    "介紹": "介紹"
};

/**
 * 提取 Markdown 連結中的 URL 或文字
 * [文字](url) -> url (如果是地址欄位) 或保留原始內容
 */
function processCell(content, isAddressField) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/;
    const match = content.match(linkRegex);
    
    if (match) {
        // 如果是導航連結（地址欄位），優先提取 URL
        if (isAddressField) return match[2];
        // 其他欄位（如介紹）可能包含多個連結，暫不破壞結構
    }
    return content;
}

export function parseMarkdownTable(md) {
    const lines = md.trim().split('\n');
    
    // 尋找包含景點名稱的表格行
    const tableHeaderIndex = lines.findIndex(line => line.includes('景點名稱') && line.includes('|'));
    if (tableHeaderIndex === -1) return null;

    const tableLines = lines.slice(tableHeaderIndex).filter(line => line.includes('|'));
    if (tableLines.length < 3) return null;

    // 解析標題
    const rawHeaders = tableLines[0].split('|').map(h => h.trim()).filter(h => h !== '');
    
    // 解析基礎資訊
    const basicInfoMatch = md.match(/## 📋 基礎資訊與匯率參考[\s\S]*?(?=##|$)/);
    const basicInfo = basicInfoMatch ? basicInfoMatch[0].replace(/## 📋 基礎資訊與匯率參考/, '').trim() : "";

    // 解析特別提醒
    const remindersMatch = md.match(/## 💡 特別提醒[\s\S]*?(?=##|$)/);
    const reminders = remindersMatch ? remindersMatch[0].replace(/## 💡 特別提醒/, '').trim() : "";

    // 嚴格解析資料行：只取包含有效 ID 的行，避免抓到提示文字
    const itineraryItems = tableLines.slice(2).filter(line => {
        const cells = line.trim().split('|').filter(c => c.trim() !== '');
        return cells.length > 0 && /^\d+$/.test(cells[0].trim());
    }).map(line => {
        const actualCells = line.trim().startsWith('|') 
            ? line.trim().split('|').slice(1, -1).map(c => c.trim())
            : line.trim().split('|').map(c => c.trim());

        let obj = {};
        rawHeaders.forEach((header, index) => {
            const mappedHeader = HEADER_MAP[header] || header;
            const isAddress = mappedHeader === "地址";
            obj[mappedHeader] = processCell(actualCells[index] || "", isAddress);
        });

        return obj;
    });

    return {
        metadata: {
            "基礎資訊": basicInfo,
            "特別提醒": reminders
        },
        items: itineraryItems
    };
}




