/**
 * 通用型旅遊規劃器 GAS 後端
 * 支援功能：獲取資料、寫入資料、自動初始化標題列
 */

const HEADERS = ["ID", "景點名稱", "地址", "交通停車", "建議停留", "費用", "介紹", "基礎資訊", "特別提醒"];

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = e.parameter ? e.parameter.action : null;

  // 1. 優先處理獲取工作表清單 (無須 sheetName)
  if (action === "getSheets") {
    try {
      const names = ss.getSheets().map(s => s.getName());
      return createResponse(names);
    } catch (err) {
      return createResponse({ error: "getSheets failed: " + err.message });
    }
  }

  // 2. 處理資料讀取 (需要 sheetName)
  const sheetName = e.parameter ? e.parameter.sheetName : null;
  if (action === "read") {
    if (!sheetName) return createResponse({ error: "Missing sheetName" });
    
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return createResponse([]); 
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return createResponse([]); 
    
    const headers = data[0];
    const rows = data.slice(1);
    const formattedData = rows.map(row => {
      let obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });
    return createResponse(formattedData);
  }

  return createResponse({ error: "Invalid action or missing parameters" });
}



function doPost(e) {
  const params = JSON.parse(e.postData.contents);
  const action = params.action;
  const sheetName = params.sheetName;
  const itineraries = params.data; // Array of objects
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === "write") {
    let sheet = ss.getSheetByName(sheetName);
    let isNew = false;
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      isNew = true;
    }

    // 初始化標題
    if (sheet.getLastRow() === 0 || isNew) {
      sheet.appendRow(HEADERS);
    }

    const metadata = params.metadata || {};
    const itineraries = params.data || [];

    // 儲存 Metadata 到 CONFIG 行 (ID 設為 CONFIG)
    const configRow = [
      "CONFIG", 
      "--- 行程總覽配置 (勿刪) ---", 
      "", "", "", "", "", "", 
      metadata["基礎資訊"] || "", 
      metadata["特別提醒"] || ""
    ];
    
    // 檢查是否已有 CONFIG 行，有的話覆寫，無則新增
    const data = sheet.getDataRange().getValues();
    let configRowIndex = data.findIndex(row => row[0] === "CONFIG");
    
    if (configRowIndex !== -1) {
      sheet.getRange(configRowIndex + 1, 1, 1, HEADERS.length).setValues([configRow]);
    } else {
      sheet.appendRow(configRow);
    }

    // 將實際行程資料附加在下方
    const rowsToAppend = itineraries.map(item => {
      return HEADERS.map(header => {
        if (header === "基礎資訊" || header === "特別提醒") return ""; // 景點行不存冗餘資訊
        return item[header] || "";
      });
    });

    if (rowsToAppend.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rowsToAppend.length, HEADERS.length).setValues(rowsToAppend);
    }

    return createResponse({ success: true, message: isNew ? "工作表已建立並初始化" : "資料已更新 (含配置資訊)" });
  }

  if (action === "syncAll") {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) return createResponse({ error: "Sheet not found" });
    
    const itineraries = params.data || [];
    // 安全檢查：如果傳入資料為空，且原始資料原本有值，則拒絕同步以防誤刪
    const lastRow = sheet.getLastRow();
    if (itineraries.length === 0 && lastRow > 2) {
       return createResponse({ error: "拒絕同步空資料集以防資料遺失" });
    }

    // 1. 準備所有要寫入的資料列 (Header 除外)
    const allRowsToSync = [];
    
    // 加 CONFIG
    const metadata = params.metadata || {};
    allRowsToSync.push([
      "CONFIG", 
      "--- 行程總覽配置 (勿刪) ---", 
      "", "", "", "", "", 
      metadata["基礎資訊"] || "", 
      metadata["特別提醒"] || ""
    ]);
    
    // 加景點
    itineraries.forEach(item => {
      allRowsToSync.push(HEADERS.map(header => {
        if (header === "基礎資訊" || header === "特別提醒") return "";
        return item[header] || "";
      }));
    });
    
    // 2. 清除舊資料並寫入新資料 (從第 2 行開始)
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow, HEADERS.length).clearContent();
    }
    
    // 3. 執行批次寫入
    if (allRowsToSync.length > 0) {
      sheet.getRange(2, 1, allRowsToSync.length, HEADERS.length).setValues(allRowsToSync);
    }
    
    SpreadsheetApp.flush();
    return createResponse({ success: true, message: "順序已同步至雲端" });
  }

  if (action === "renameSheet") {
    const newName = params.newName;
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) return createResponse({ error: "Sheet not found" });
    if (ss.getSheetByName(newName)) return createResponse({ error: "Name already exists" });
    
    sheet.setName(newName);
    return createResponse({ success: true, message: "重新命名成功" });
  }

  if (action === "deleteSheet") {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) return createResponse({ error: "Sheet not found" });
    if (ss.getSheets().length <= 1) return createResponse({ error: "不能刪除最後一個分頁" });
    
    ss.deleteSheet(sheet);
    return createResponse({ success: true, message: "刪除成功" });
  }


  return createResponse({ error: "Invalid action" });
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
