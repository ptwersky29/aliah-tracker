// PDF statement generator using html2canvas + jspdf.
// We render the statement as a hidden DOM node, capture it with html2canvas,
// and emit a multi-page A4 PDF. This handles Hebrew/Yiddish characters
// natively (the browser rasterizes them).

import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { fullName } from "./jewishCalendar";

const POUND = "£";

function fmt(n) {
  if (n === null || n === undefined || isNaN(n)) return `${POUND}0.00`;
  return `${POUND}${Number(n).toFixed(2)}`;
}

function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function buildHtml({ customer, transactions, totals, businessName = "Pinkas Hamakhires" }) {
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  const rows = transactions.map((t, i) => {
    const sign = t.amount < 0 ? "−" : "";
    const amountClass = t.type === "payment" ? "amount-paid" : t.type === "extra" ? "amount-extra" : "amount-sale";
    const typeBadge =
      t.type === "payment" ? `<span class="badge badge-paid">Payment</span>` :
      t.type === "extra" ? `<span class="badge badge-warn">Extra</span>` :
      `<span class="badge badge-sale">Sale</span>`;
    return `
      <tr>
        <td class="num">${i + 1}</td>
        <td class="date">${escapeHtml((t.date || "").slice(0, 10) || "—")}</td>
        <td>${typeBadge}</td>
        <td class="desc">${escapeHtml(t.description || "")}</td>
        <td class="amount ${amountClass}">${sign}${POUND}${Math.abs(t.amount).toFixed(2)}</td>
      </tr>`;
  }).join("");

  return `
  <div id="statement-root" style="width: 794px; background: #FFFFFF; color: #101828; font-family: 'Plus Jakarta Sans', 'Heebo', system-ui, sans-serif; padding: 48px;">
    <style>
      #statement-root * { box-sizing: border-box; }
      #statement-root .header { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 24px; border-bottom: 2px solid #101828; }
      #statement-root .brand { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: #0B1729; }
      #statement-root .brand-sub { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #667085; margin-top: 4px; font-weight: 600; }
      #statement-root .meta { text-align: right; font-size: 12px; color: #667085; line-height: 1.6; }
      #statement-root .meta b { color: #101828; font-weight: 600; }

      #statement-root .customer-block { margin-top: 28px; display: flex; align-items: flex-end; justify-content: space-between; }
      #statement-root .customer-label { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #2A4574; font-weight: 700; }
      #statement-root .customer-name { font-size: 30px; font-weight: 800; color: #0B1729; letter-spacing: -0.02em; margin-top: 4px; }
      #statement-root .customer-phone { font-size: 13px; color: #667085; margin-top: 4px; }
      #statement-root .statement-title { font-size: 12px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #2A4574; text-align: right; }

      #statement-root .totals { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 24px; }
      #statement-root .total-card { padding: 16px; border: 1px solid #E4E7EC; border-radius: 8px; }
      #statement-root .total-card .lbl { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: #667085; font-weight: 700; }
      #statement-root .total-card .val { font-size: 22px; font-weight: 700; margin-top: 6px; font-variant-numeric: tabular-nums; }
      #statement-root .total-card.owed .val { color: #0B1729; }
      #statement-root .total-card.paid .val { color: #047857; }
      #statement-root .total-card.balance.positive .val { color: #B91C1C; }
      #statement-root .total-card.balance.zero .val { color: #047857; }

      #statement-root table.tx { width: 100%; border-collapse: collapse; margin-top: 28px; font-size: 12px; }
      #statement-root table.tx thead th {
        background: #F1F3F7; padding: 10px 12px; text-align: left; font-size: 10px; font-weight: 700;
        letter-spacing: 0.10em; text-transform: uppercase; color: #344054; border-bottom: 1px solid #E4E7EC;
      }
      #statement-root table.tx tbody td { padding: 11px 12px; border-bottom: 1px solid #F1F3F7; vertical-align: top; }
      #statement-root table.tx tbody tr:nth-child(even) td { background: #FAFBFD; }
      #statement-root table.tx td.num { color: #98A2B3; font-variant-numeric: tabular-nums; width: 34px; }
      #statement-root table.tx td.date { color: #667085; font-variant-numeric: tabular-nums; white-space: nowrap; width: 88px; }
      #statement-root table.tx td.desc { color: #101828; }
      #statement-root table.tx td.amount { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; width: 110px; }
      #statement-root .amount-sale { color: #0B1729; }
      #statement-root .amount-paid { color: #047857; }
      #statement-root .amount-extra { color: #B45309; }

      #statement-root .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; }
      #statement-root .badge-paid { background: rgba(16,185,129,0.12); color: #047857; }
      #statement-root .badge-warn { background: rgba(245,158,11,0.12); color: #B45309; }
      #statement-root .badge-sale { background: rgba(42,69,116,0.10); color: #1E3258; }

      #statement-root .footer { margin-top: 36px; padding-top: 18px; border-top: 1px solid #E4E7EC; display: flex; justify-content: space-between; font-size: 11px; color: #98A2B3; }
      #statement-root .summary-row { margin-top: 14px; padding: 14px 16px; background: #0B1729; color: #FFFFFF; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; }
      #statement-root .summary-row .lbl { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #98A2B3; font-weight: 700; }
      #statement-root .summary-row .val { font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; }
    </style>

    <div class="header">
      <div>
        <div class="brand">${escapeHtml(businessName)}</div>
        <div class="brand-sub">Auction Ledger · Customer Statement</div>
      </div>
      <div class="meta">
        <div><b>Issued:</b> ${today}</div>
        <div><b>Statement #:</b> ${Date.now().toString().slice(-8)}</div>
      </div>
    </div>

    <div class="customer-block">
      <div>
        <div class="customer-label">Statement for</div>
        <div class="customer-name">${escapeHtml(fullName(customer) || "—")}</div>
        ${customer && customer.phone ? `<div class="customer-phone">${escapeHtml(customer.phone)}</div>` : ""}
      </div>
      <div>
        <div class="statement-title">Account Summary</div>
      </div>
    </div>

    <div class="totals">
      <div class="total-card owed">
        <div class="lbl">Total Charges</div>
        <div class="val">${fmt(totals.totalOwed)}</div>
      </div>
      <div class="total-card paid">
        <div class="lbl">Total Paid</div>
        <div class="val">${fmt(totals.totalPaid)}</div>
      </div>
      <div class="total-card balance ${totals.balance > 0 ? "positive" : "zero"}">
        <div class="lbl">${totals.balance > 0 ? "Outstanding" : "Status"}</div>
        <div class="val">${totals.balance > 0 ? fmt(totals.balance) : "Paid in full"}</div>
      </div>
    </div>

    <table class="tx">
      <thead>
        <tr>
          <th>#</th>
          <th>Date</th>
          <th>Type</th>
          <th>Description</th>
          <th style="text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="5" style="text-align:center; padding: 24px; color:#98A2B3;">No transactions to display.</td></tr>`}
      </tbody>
    </table>

    <div class="summary-row">
      <span class="lbl">${totals.balance > 0 ? "Amount Due" : "Final Balance"}</span>
      <span class="val">${totals.balance > 0 ? fmt(totals.balance) : fmt(0)}</span>
    </div>

    <div class="footer">
      <div>Generated by Pinkas Hamakhires · ${today}</div>
      <div>Thank you for your continued support.</div>
    </div>
  </div>`;
}

export async function generateStatementPDF({ customer, transactions, totals, businessName }) {
  const html = buildHtml({ customer, transactions, totals, businessName });

  // Mount off-screen
  const wrapper = document.createElement("div");
  wrapper.style.position = "fixed";
  wrapper.style.left = "-10000px";
  wrapper.style.top = "0";
  wrapper.style.pointerEvents = "none";
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);

  // Wait for fonts so Hebrew renders cleanly
  if (document.fonts && document.fonts.ready) {
    try { await document.fonts.ready; } catch (e) { /* noop */ }
  }
  // Tiny delay so the browser commits paint
  await new Promise((r) => setTimeout(r, 80));

  const node = wrapper.querySelector("#statement-root");
  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: "#FFFFFF",
    useCORS: true,
    logging: false,
  });
  document.body.removeChild(wrapper);

  const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait", compress: true });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  // Image dims in pt — we want full page width with 28pt margin
  const margin = 28;
  const imgWidth = pageW - margin * 2;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  if (imgHeight <= pageH - margin * 2) {
    // Single page
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, imgWidth, imgHeight, undefined, "FAST");
  } else {
    // Multi-page — slice the canvas vertically
    const pageHeightInCanvas = Math.floor((canvas.width * (pageH - margin * 2)) / imgWidth);
    let renderedHeight = 0;
    let isFirst = true;
    while (renderedHeight < canvas.height) {
      const sliceH = Math.min(pageHeightInCanvas, canvas.height - renderedHeight);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceH;
      const ctx = sliceCanvas.getContext("2d");
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, -renderedHeight);
      const sliceImg = sliceCanvas.toDataURL("image/png");
      const sliceImgHeight = (sliceH * imgWidth) / canvas.width;
      if (!isFirst) pdf.addPage();
      pdf.addImage(sliceImg, "PNG", margin, margin, imgWidth, sliceImgHeight, undefined, "FAST");
      renderedHeight += sliceH;
      isFirst = false;
    }
  }

  const safeName = (fullName(customer) || "statement").replace(/[^\p{L}\p{N}_\- ]/gu, "").trim().replace(/\s+/g, "_") || "statement";
  pdf.save(`Statement_${safeName}.pdf`);
}
