/**
 * Markdown 表格解析器
 * 將 Markdown 表格轉換為 JSON 物件陣列
 */

const HEADER_MAP = {
    "ID": "ID",
    "景點名稱": "景點名稱",
    "名稱": "景點名稱",
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
    
    // 解析整體標題作為預設分頁名稱
    const firstHeaderMatch = md.match(/^#+\s+(.+)$/m);
    let locationName = firstHeaderMatch ? firstHeaderMatch[1].trim() : "";
    if (locationName.includes('：')) locationName = locationName.split('：').pop().trim();
    if (locationName.includes(':')) locationName = locationName.split(':').pop().trim();
    
    // 1. 先將 Markdown 依照標題切割成區塊
    const sections = md.split(/\n(?=#+\s+)/);
    let basicInfo = "";
    let reminders = "";
    const miscSections = [];

    sections.forEach(sec => {
        const lines = sec.trim().split('\n');
        const header = lines[0].toLowerCase();
        const content = lines.slice(1).join('\n').trim();

        if (header.includes('基礎資訊') || header.includes('匯率')) {
            basicInfo = content;
            // 從基礎資訊細化地點名稱
            const locMatch = content.match(/\*\*旅遊地點[：:]\*\*\s*([^\r\n]+)/);
            if (locMatch) {
                let ln = locMatch[1].trim();
                if (ln.includes('，')) ln = ln.split('，').pop().trim();
                if (ln.includes(',')) ln = ln.split(',').pop().trim();
                locationName = ln.replace(/\(.*\)/, '').trim();
            }
        } else if (header.includes('特別提醒') || header.includes('注意事項')) {
            reminders += (reminders ? '\n\n' : '') + content;
        } else if (header.includes('排除景點') || header.includes('不建議')) {
            miscSections.push(`### ${lines[0].replace(/^#+\s+/, '')}\n${content}`);
        }
    });

    // 將額外資訊附加到提醒事項中
    if (miscSections.length > 0) {
        reminders = (miscSections.join('\n\n') + '\n\n' + reminders).trim();
    }

    // 2. 解析行程項目
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
            "特別提醒": reminders,
            "locationName": locationName
        },
        items: itineraryItems
    };
}





