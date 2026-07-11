// src\lib\invoiceGenerator.ts

import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const formatRs = (amount: number) => `Rs. ${Number(amount).toFixed(2)}`;

export const generateInvoice = async (order: any) => {
  try {
    const paymentMode = order.OrderType?.toLowerCase() === 'online' || order.OrderType?.toLowerCase() === 'prepaid'
      ? 'Paid Online'
      : 'Cash on Delivery';

    // Create table rows for items
    const itemsHtml = order.Items.map((item: any, i: number) => `
      <tr>
        <td style="text-align: center;">${i + 1}</td>
        <td>${item.name}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: center;">${formatRs(item.price)}</td>
        <td style="text-align: center;">${formatRs(item.quantity * item.price)}</td>
      </tr>
    `).join('');

    // Fill empty rows if items are less than 6
    const emptyRowsNeeded = Math.max(0, 6 - order.Items.length);
    const emptyRowsHtml = Array(emptyRowsNeeded).fill(`
      <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>
    `).join('');

    // Dynamic QR code using public API
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
      `https://www.bumbaskitchen.app/account/orders?id=${order.OrderNumber}`
    )}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 0; padding: 0; }
          .page { padding: 40px; }
          .top-bar { background-color: #C3CD49; color: #fff; padding: 15px 40px; display: flex; justify-content: space-between; align-items: center; margin: -40px -40px 30px -40px; }
          .top-bar h1 { margin: 0; font-size: 16px; letter-spacing: 1px; }
          .original-box { border: 1px solid #fff; border-radius: 4px; padding: 6px 12px; font-size: 12px; font-weight: bold; }
          .header { display: flex; align-items: center; margin-bottom: 30px; }
          .header-text h2 { color: #4A5D23; margin: 0 0 5px 0; font-size: 28px; }
          .header-text p { margin: 0; font-size: 14px; }
          .details-bar { background-color: #EAEAEA; padding: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; border-top: 2px solid #4A5D23; border-bottom: 1px solid #ccc; }
          .details-col { display: flex; flex-direction: column; gap: 12px; font-size: 13px; }
          .details-row { display: flex; }
          .details-row strong { width: 100px; color: #111; }
          .bill-to { margin-bottom: 30px; font-size: 14px; }
          .bill-to h3 { color: #4A5D23; margin: 0 0 15px 0; font-size: 18px; text-transform: uppercase; }
          .bill-to-row { display: flex; margin-bottom: 8px; }
          .bill-to-row strong { width: 80px; color: #111; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 13px; }
          th { background-color: #4A5D23; color: #fff; padding: 14px 10px; text-align: center; }
          th:nth-child(2) { text-align: left; }
          td { padding: 14px 10px; text-align: center; border-bottom: 1px solid #eee; }
          td:nth-child(2) { text-align: left; font-weight: 500; }
          tr:nth-child(even) { background-color: #EAF0CD; }
          .summary-section { display: flex; justify-content: space-between; margin-top: 20px; page-break-inside: avoid; }
          .terms { width: 45%; font-size: 11px; color: #555; }
          .terms h4 { color: #111; font-size: 13px; margin: 0 0 10px 0; text-transform: uppercase; }
          .terms p { margin: 0 0 5px 0; }
          .qr-box { margin-top: 20px; }
          .qr-box img { width: 80px; height: 80px; }
          .qr-box p { font-size: 10px; color: #777; margin-top: 5px; }
          .totals { width: 45%; font-size: 14px; }
          .totals-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
          .grand-total { display: flex; justify-content: space-between; background-color: #4A5D23; color: #fff; padding: 15px; font-size: 16px; font-weight: bold; margin-top: 15px; border-radius: 4px; }
          .footer { margin-top: 80px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; }
          .footer-left h2 { font-family: 'Times New Roman', Times, serif; font-style: italic; margin: 0 0 15px 0; font-size: 26px; color: #000; }
          .footer-left p { margin: 0; font-size: 12px; font-weight: bold; color: #333; }
          .signature { text-align: right; }
          .signature h3 { font-family: 'Times New Roman', Times, serif; font-style: italic; font-size: 32px; color: #333; margin: 0 0 20px 0; font-weight: normal; }
          .signature-text { font-size: 11px; font-weight: bold; color: #000; margin: 0 0 5px 0; }
          .signature-sub { font-size: 11px; color: #333; margin: 0; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="top-bar">
            <h1>BILL OF SUPPLY</h1>
            <div class="original-box">ORIGINAL FOR RECIPIENT</div>
          </div>
          
          <div class="header">
            <div class="header-text">
              <h2>BUMBA'S KITCHEN</h2>
              <p>Mobile: +91 8240690254</p>
            </div>
          </div>

          <div class="details-bar">
            <div class="details-col">
              <div class="details-row"><strong>Receipt No</strong> : ${order.OrderNumber}</div>
              <div class="details-row"><strong>Order Status</strong> : ${order.Status || 'Processing'}</div>
            </div>
            <div class="details-col">
              <div class="details-row"><strong>Date</strong> : ${new Date(order.Timestamp).toLocaleDateString("en-GB")}</div>
              <div class="details-row"><strong>Payment</strong> : ${paymentMode}</div>
            </div>
          </div>

          <div class="bill-to">
            <h3>Bill to</h3>
            <div class="bill-to-row"><strong>Name</strong> : ${order.Name || 'Guest'}</div>
            <div class="bill-to-row"><strong>Address</strong> : ${order.DeliveryAddress || order.Address || 'N/A'}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>SL.</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              ${emptyRowsHtml}
            </tbody>
          </table>

          <div class="summary-section">
            <div class="terms">
              <h4>Terms and Conditions</h4>
              <p>1. Goods once sold will not be taken back or exchanged.</p>
              <p>2. All disputes are subject to jurisdiction only.</p>
              <div class="qr-box">
                <img src="${qrUrl}" alt="QR Code" />
                <p>Scan to view order</p>
              </div>
            </div>
            <div class="totals">
              <div class="totals-row">
                <span>Sub Total</span>
                <span>${formatRs(order.Subtotal || order.FinalPrice)}</span>
              </div>
              <div class="totals-row">
                <span>Discount</span>
                <span>- ${formatRs(order.Discount || 0)}</span>
              </div>
              <div class="totals-row">
                <span>Received Amount</span>
                <span>${formatRs(order.ReceivedAmount || 0)}</span>
              </div>
              <div class="grand-total">
                <span>Grand Total</span>
                <span>${formatRs(order.FinalPrice || 0)}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <div class="footer-left">
              <h2>Thank You & Order Again</h2>
              <p>HEALTHY FOOD RESTAURANT</p>
              <p style="margin-top: 15px;"><span style="background: #4A5D23; color: #fff; border-radius: 50%; padding: 2px 6px; font-family: serif; margin-right: 5px;">f</span> Bumba's Kitchen</p>
            </div>
            <div class="signature">
              <h3>Bumba</h3>
              <p class="signature-text">AUTHORISED SIGNATORY FOR</p>
              <p class="signature-sub">Bumba's Kitchen</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // 1. Generate PDF as Base64 string
    const { base64 } = await Print.printToFileAsync({
      html,
      base64: true,
    });

    if (!base64) {
      throw new Error('Failed to generate PDF base64 data');
    }

    // 2. Create a persistent file path in the app's cache directory
    const invoiceFileName = `Invoice_${order.OrderNumber}.pdf`;
    const pdfPath = `${FileSystem.cacheDirectory}${invoiceFileName}`;

    // 3. Write the Base64 string to the file
    await FileSystem.writeAsStringAsync(pdfPath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 4. ★ OPEN/VIEW PDF directly
    if (Platform.OS === 'android') {
      // Android: PDF Viewer-এ সরাসরি খোলার জন্য
      const contentUri = await FileSystem.getContentUriAsync(pdfPath);
      await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
        data: contentUri,
        flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
        type: 'application/pdf',
      });
    } else {
      // iOS: Sharing API-ই iOS-এ Preview হিসেবে কাজ করে (Native iOS Behavior)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfPath, {
          mimeType: 'application/pdf',
          dialogTitle: `View Invoice #${order.OrderNumber}`,
          UTI: 'com.adobe.pdf',
        });
      }
    }
  } catch (error) {
    console.error('Invoice Generation Error:', error);
    throw error;
  }
};
