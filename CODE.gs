/**
 * 通用型旅遊規劃器 GAS 後端
 * 支援功能：獲取資料、寫入資料、自動初始化標題列
 */

const HEADERS = ["ID", "景點名稱", "所在縣市", "地址", "交通停車", "建議停留", "費用", "介紹", "基礎資訊", "特別提醒"];

function doGet(e) {
  const params = e.parameter || {};
  return handleAllActions(params);
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    return handleAllActions(params);
  } catch (err) {
    return createResponse({ error: "POST parse error: " + err.message });
  }
}

function handleAllActions(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = params.action;
  const sheetName = params.sheetName;

  if (action === "getSheets") {
    try {
      const names = ss.getSheets().map(s => s.getName());
      return createResponse(names);
    } catch (err) {
      return createResponse({ error: "getSheets failed: " + err.message });
    }
  }

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

  if (action === "write") {
    let sheet = ss.getSheetByName(sheetName);
    let isNew = false;
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      isNew = true;
    }
    if (sheet.getLastRow() === 0 || isNew) {
      sheet.appendRow(HEADERS);
    }

    const metadata = params.metadata || {};
    const itineraries = params.data || [];

    const configRow = [
      "CONFIG", "--- 行程總覽配置 (勿刪) ---", "", "", "", "", "", "", 
      metadata["基礎資訊"] || "", metadata["特別提醒"] || ""
    ];
    
    const data = sheet.getDataRange().getValues();
    let configRowIndex = data.findIndex(row => row[0] === "CONFIG");
    if (configRowIndex !== -1) {
      sheet.getRange(configRowIndex + 1, 1, 1, HEADERS.length).setValues([configRow]);
    } else {
      sheet.appendRow(configRow);
    }

    const rowsToAppend = itineraries.map(item => {
      return HEADERS.map(header => {
        if (header === "基礎資訊" || header === "特別提醒") return "";
        return item[header] || "";
      });
    });

    if (rowsToAppend.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rowsToAppend.length, HEADERS.length).setValues(rowsToAppend);
    }
    return createResponse({ success: true, message: isNew ? "工作表已建立" : "資料已更新" });
  }

  if (action === "syncAll") {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) return createResponse({ error: "Sheet not found" });
    const itineraries = params.data || [];
    const lastRow = sheet.getLastRow();
    
    const allRowsToSync = [];
    const metadata = params.metadata || {};
    allRowsToSync.push([
      "CONFIG", "--- 行程總覽配置 ---", "", "", "", "", "", "", 
      metadata["基礎資訊"] || "", metadata["特別提醒"] || ""
    ]);
    
    itineraries.forEach(item => {
      allRowsToSync.push(HEADERS.map(header => {
        if (header === "基礎資訊" || header === "特別提醒") return "";
        return item[header] || "";
      }));
    });
    
    // 清除舊資料 (從第 2 行開始清到最後)
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow, HEADERS.length).clearContent();
    }
    
    // 寫入新資料
    if (allRowsToSync.length > 0) {
      sheet.getRange(2, 1, allRowsToSync.length, HEADERS.length).setValues(allRowsToSync);
    }
    SpreadsheetApp.flush();
    return createResponse({ success: true, message: "同步成功" });
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

  if (action === "searchPlaces") {
    return createResponse(searchPlaces(params.query));
  }

  return createResponse({ error: "Invalid action: " + action });
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 使用 Google Maps 內建服務搜尋地點（用於智能填入）
 */
function searchPlaces(query) {
  try {
    if (!query) return { success: false, message: "Missing query" };
    
    // 強制加上「台灣」關鍵字提升精準度
    const fullQuery = query.includes("台灣") ? query : "台灣 " + query;
    const results = Maps.newGeocoder().geocode(fullQuery);
    
    if (results.status === 'OK' && results.results.length > 0) {
      const res = results.results[0];
      
      // 提取縣市 (通常在 address_components 裡)
      let city = "";
      for (const comp of res.address_components) {
        if (comp.types.includes("administrative_area_level_1") || comp.types.includes("locality")) {
          // 處理像「雲林縣」或「台北市」
          city = comp.long_name;
          break;
        }
      }
      
      return {
        success: true,
        name: res.formatted_address,
        address: res.formatted_address,
        city: city,
        lat: res.geometry.location.lat,
        lng: res.geometry.location.lng
      };
    }
    return { success: false, message: 'Google 找不到相關位置資料' };
  } catch (e) {
    return { success: false, message: "Google 搜尋發生錯誤: " + e.toString() };
  }
}
