import { InvoiceResponse } from '../types/payment.types';
import { format } from 'date-fns';

export const RECEIPT_THEMES = [
  'classic',
  'modern',
  'minimal',
  'colorful',
  'formal',
  'elegant',
] as const;

export type ReceiptTheme = (typeof RECEIPT_THEMES)[number];

export interface ReceiptPreviewData {
  theme: ReceiptTheme;
  invoice: InvoiceResponse;
  html: string;
  printable: boolean;
}

const formatVnd = (amount: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount);

const formatDate = (date: Date | string) =>
  format(new Date(date), 'dd/MM/yyyy');

function baseItemsHtml(invoice: InvoiceResponse): string {
  const items = invoice.items?.length
    ? invoice.items
    : [{ description: 'Học phí', quantity: 1, amount: invoice.amount }];

  return items
    .map(
      (item) =>
        `<tr>
          <td>${item.description}</td>
          <td style="text-align:center">${item.quantity}</td>
          <td style="text-align:right">${formatVnd(item.amount)}</td>
        </tr>`
    )
    .join('');
}

function wrapHtml(theme: ReceiptTheme, body: string): string {
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Phiếu thu</title></head><body data-theme="${theme}">${body}</body></html>`;
}

function renderClassic(invoice: InvoiceResponse): string {
  const body = `
    <div style="font-family:Georgia,serif;max-width:720px;margin:0 auto;padding:32px;border:2px solid #333">
      <h1 style="text-align:center;margin:0 0 8px">PHIẾU THU HỌC PHÍ</h1>
      <p style="text-align:center;color:#555;margin:0 0 24px">${invoice.centerId ? '' : ''}${invoice.student?.center?.name || 'Trung tâm giáo dục'}</p>
      <p><strong>Số phiếu:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>Học sinh:</strong> ${invoice.student?.fullName || '-'}</p>
      <p><strong>Ngày phát hành:</strong> ${formatDate(invoice.issueDate)}</p>
      <p><strong>Hạn thanh toán:</strong> ${formatDate(invoice.dueDate)}</p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0">
        <thead><tr style="border-bottom:2px solid #333">
          <th style="text-align:left;padding:8px">Mô tả</th>
          <th style="padding:8px">SL</th>
          <th style="text-align:right;padding:8px">Thành tiền</th>
        </tr></thead>
        <tbody>${baseItemsHtml(invoice)}</tbody>
      </table>
      <p style="text-align:right"><strong>Tổng cộng: ${formatVnd(invoice.totalAmount)}</strong></p>
      <p style="text-align:right;color:#666">Trạng thái: ${invoice.status}</p>
    </div>`;
  return wrapHtml('classic', body);
}

function renderModern(invoice: InvoiceResponse): string {
  const body = `
    <div style="font-family:system-ui,sans-serif;max-width:720px;margin:0 auto;padding:40px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;border-radius:16px">
      <div style="background:#fff;color:#1a1a2e;border-radius:12px;padding:32px">
        <h1 style="margin:0;font-size:28px;color:#667eea">Phiếu thu</h1>
        <p style="color:#888;margin:4px 0 24px">${invoice.invoiceNumber}</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px">
          <div><small style="color:#888">Học sinh</small><br><strong>${invoice.student?.fullName || '-'}</strong></div>
          <div><small style="color:#888">Hạn TT</small><br><strong>${formatDate(invoice.dueDate)}</strong></div>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#f0f4ff"><th style="padding:10px;text-align:left">Mô tả</th><th>SL</th><th style="text-align:right;padding:10px">Tiền</th></tr></thead>
          <tbody>${baseItemsHtml(invoice)}</tbody>
        </table>
        <div style="margin-top:24px;padding:16px;background:#667eea;color:#fff;border-radius:8px;text-align:right;font-size:20px;font-weight:bold">
          ${formatVnd(invoice.totalAmount)}
        </div>
      </div>
    </div>`;
  return wrapHtml('modern', body);
}

function renderMinimal(invoice: InvoiceResponse): string {
  const body = `
    <div style="font-family:Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;padding:48px 32px;color:#222">
      <p style="letter-spacing:4px;text-transform:uppercase;font-size:11px;color:#999;margin:0">Phiếu thu học phí</p>
      <h2 style="font-weight:300;margin:8px 0 32px;font-size:32px">${invoice.invoiceNumber}</h2>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
      <p>${invoice.student?.fullName || '-'} · ${formatDate(invoice.issueDate)}</p>
      <table style="width:100%;margin:32px 0;font-size:14px">${baseItemsHtml(invoice)}</table>
      <hr style="border:none;border-top:1px solid #eee"/>
      <p style="text-align:right;font-size:24px;font-weight:300;margin-top:16px">${formatVnd(invoice.totalAmount)}</p>
    </div>`;
  return wrapHtml('minimal', body);
}

function renderColorful(invoice: InvoiceResponse): string {
  const body = `
    <div style="font-family:Comic Sans MS,cursive,sans-serif;max-width:720px;margin:0 auto;padding:24px;background:#fff9e6;border:4px dashed #ff6b6b;border-radius:20px">
      <h1 style="color:#ff6b6b;text-align:center;margin:0">🧾 Phiếu Thu Vui Vẻ</h1>
      <div style="background:#4ecdc4;color:#fff;padding:16px;border-radius:12px;margin:16px 0">
        <p style="margin:4px 0"><strong>${invoice.student?.fullName || 'Học sinh'}</strong></p>
        <p style="margin:4px 0">Mã: ${invoice.invoiceNumber}</p>
      </div>
      <table style="width:100%;background:#fff;border-radius:8px;padding:8px">${baseItemsHtml(invoice)}</table>
      <p style="text-align:center;font-size:28px;color:#ff6b6b;font-weight:bold;margin-top:20px">${formatVnd(invoice.totalAmount)}</p>
    </div>`;
  return wrapHtml('colorful', body);
}

function renderFormal(invoice: InvoiceResponse): string {
  const body = `
    <div style="font-family:Times New Roman,serif;max-width:720px;margin:0 auto;padding:48px;border:1px solid #000">
      <div style="text-align:center;border-bottom:2px double #000;padding-bottom:16px;margin-bottom:24px">
        <h2 style="margin:0;text-transform:uppercase;letter-spacing:2px">Cộng Hòa Xã Hội Chủ Nghĩa Việt Nam</h2>
        <p style="margin:8px 0;font-style:italic">Độc lập - Tự do - Hạnh phúc</p>
        <h1 style="margin:24px 0 0">PHIẾU THU HỌC PHÍ</h1>
      </div>
      <p>Kính gửi phụ huynh học sinh: <strong>${invoice.student?.fullName || '-'}</strong></p>
      <p>Số phiếu thu: <strong>${invoice.invoiceNumber}</strong> · Ngày: ${formatDate(invoice.issueDate)}</p>
      <table style="width:100%;border:1px solid #000;border-collapse:collapse;margin:24px 0">
        <thead><tr style="background:#f5f5f5"><th style="border:1px solid #000;padding:8px">STT</th><th style="border:1px solid #000;padding:8px">Nội dung</th><th style="border:1px solid #000;padding:8px">Số tiền</th></tr></thead>
        <tbody>${baseItemsHtml(invoice)}</tbody>
      </table>
      <p style="text-align:right"><strong>Tổng số tiền (bằng chữ): ${formatVnd(invoice.totalAmount)}</strong></p>
      <div style="display:flex;justify-content:space-between;margin-top:48px">
        <p>Người nộp tiền<br><br><br>...............</p>
        <p>Người thu tiền<br><br><br>...............</p>
      </div>
    </div>`;
  return wrapHtml('formal', body);
}

function renderElegant(invoice: InvoiceResponse): string {
  const body = `
    <div style="font-family:Palatino,serif;max-width:720px;margin:0 auto;padding:40px;background:#faf8f5;border-top:6px solid #b8860b">
      <h1 style="color:#b8860b;font-weight:normal;text-align:center;margin:0 0 32px">✦ Phiếu Thu ✦</h1>
      <div style="border-left:3px solid #b8860b;padding-left:20px;margin-bottom:24px">
        <p style="margin:4px 0;color:#666">${invoice.invoiceNumber}</p>
        <p style="margin:4px 0;font-size:18px">${invoice.student?.fullName || '-'}</p>
      </div>
      <table style="width:100%;border-collapse:collapse">${baseItemsHtml(invoice)}</table>
      <div style="margin-top:32px;text-align:center;padding:20px;background:#fff;border:1px solid #e8e0d0">
        <p style="margin:0;color:#888;font-size:13px">Tổng thanh toán</p>
        <p style="margin:8px 0 0;font-size:26px;color:#b8860b">${formatVnd(invoice.totalAmount)}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#999">Hạn: ${formatDate(invoice.dueDate)}</p>
      </div>
    </div>`;
  return wrapHtml('elegant', body);
}

const renderers: Record<ReceiptTheme, (invoice: InvoiceResponse) => string> = {
  classic: renderClassic,
  modern: renderModern,
  minimal: renderMinimal,
  colorful: renderColorful,
  formal: renderFormal,
  elegant: renderElegant,
};

export function renderReceiptPreview(
  invoice: InvoiceResponse,
  theme: ReceiptTheme = 'classic'
): ReceiptPreviewData {
  const safeTheme = RECEIPT_THEMES.includes(theme) ? theme : 'classic';
  const html = renderers[safeTheme](invoice);

  return {
    theme: safeTheme,
    invoice,
    html,
    printable: true,
  };
}

export function getAvailableThemes(): Array<{ id: ReceiptTheme; label: string }> {
  return [
    { id: 'classic', label: 'Cổ điển' },
    { id: 'modern', label: 'Hiện đại' },
    { id: 'minimal', label: 'Tối giản' },
    { id: 'colorful', label: 'Màu sắc' },
    { id: 'formal', label: 'Trang trọng' },
    { id: 'elegant', label: 'Thanh lịch' },
  ];
}
