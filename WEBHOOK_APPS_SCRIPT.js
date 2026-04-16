/**
 * ========================================================
 * 🚀 ENERGYBAE WEBHOOK - GOOGLE APPS SCRIPT FILE
 * ========================================================
 * 
 * INSTRUCTIONS:
 * 1. Go to Google Sheets -> Extensions -> Apps Script
 * 2. Delete everything there and Paste this code.
 * 3. Save it.
 * 4. Click "Deploy" -> "New Deployment"
 * 5. Type: "Web App"
 * 6. Execute as: "Me"
 * 7. Who has access: "Anyone" (crucial for web hooks)
 * 8. Copy the "Web App URL" given to you and paste it into `js/app.js` locally.
 * 
 */

const CONFIG = {
  SALES_EMAIL: "sales@energybae.com", // Change this!
  SHEET_NAME: "Sheet1" // Change to your actual sheet name
};

/**
 * The doPost method is automatically called when your web app (HTML fetch)
 * sends a POST request to the Web App URL.
 */
function doPost(e) {
  try {
    // We send payload as text/plain from the client to avoid CORS preflight options.
    // Therefore we parse the postData contents.
    const leadData = JSON.parse(e.postData.contents);
    
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
    
    // Add row to Google Sheet
    sheet.appendRow([
      leadData.timestamp,
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
    
    // Optional: Send Email Alert 
    const subject = `🚨 NEW LOCAL LEAD [Score: ${leadData.score}] - ${leadData.name}`;
    const body = `
      New Lead Synced from Web App:
      Name: ${leadData.name}
      Email: ${leadData.email}
      Phone: ${leadData.phone}
      City: ${leadData.city}
      Type: ${leadData.propertyType}
      Score: ${leadData.score}
    `;
    MailApp.sendEmail(CONFIG.SALES_EMAIL, subject, body);

    // Creates an all-day event on your default calendar
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + 3);
    const eventTitle = `📞 Follow-up: ${leadData.name}`;
    CalendarApp.getDefaultCalendar().createAllDayEvent(eventTitle, followUpDate, {description: `Call ${leadData.phone}`});
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", id: leadData.id }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
    }
}
