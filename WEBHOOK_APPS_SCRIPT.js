const CONFIG = {
  SALES_EMAIL: "chaitanyashete95@gmail.com",
  SHEET_NAME: "Sheet1",
  // PASTE YOUR SPREADSHEET ID HERE 👇
  SPREADSHEET_ID: "1rQYnUkLyACAqjOM1sZZx6fPvVN0ANfYAn8R_c1UcV3o"
};

function doPost(e) {
  try {
    const leadData = JSON.parse(e.postData.contents);

    // Using openById is 100% foolproof
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.getSheets()[0];

    sheet.appendRow([
      new Date().toLocaleString(),
      leadData.id,
      leadData.name,
      leadData.email,
      leadData.phone,
      leadData.city,
      leadData.propertyType,
      leadData.billAmount,
      leadData.score,
      leadData.status
    ]);

    // Send Email
    MailApp.sendEmail(CONFIG.SALES_EMAIL, "New Lead", "Received lead: " + leadData.name);

    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    // If it fails, this will tell us exactly why in the "Executions" tab
    console.error("Critical Error: " + error.message);
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
