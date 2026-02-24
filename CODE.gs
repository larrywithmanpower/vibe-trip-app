/**
 * 通用型旅遊規劃器 GAS 後端
 * 支援功能：獲取資料、寫入資料、自動初始化標題列
 */

const HEADERS = ["ID", "景點名稱", "照片URL", "地址", "交通停車", "建議停留", "費用", "介紹", "基礎資訊", "特別提醒"];

function doGet(e) {
  const action = e.parameter.action;
  const sheetName = e.parameter.sheetName;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (!sheetName) {
    return createResponse({ error: "Missing sheetName parameter" });
  }

  const sheet = ss.getSheetByName(sheetName);
  
  if (action === "read") {
    if (!sheet) {
      return createResponse([]); // 回傳空陣列代表無資料
    }
    
    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return createResponse([]); // 只有標題或全空
    
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
  
  if (action === "getSheets") {
    return createResponse(ss.getSheets().map(s => s.getName()));
  }

  return createResponse({ error: "Invalid action" });
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


  return createResponse({ error: "Invalid action" });
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
