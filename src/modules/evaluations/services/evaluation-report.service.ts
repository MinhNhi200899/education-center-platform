import { format } from 'date-fns';
import { EvaluationResponse } from '../types/evaluation.types';

const TYPE_LABELS: Record<string, string> = {
  daily: 'Buổi học',
  weekly: 'Tuần',
  monthly: 'Tháng',
  term: 'Học kỳ',
};

const stars = (n: number | null | undefined) => {
  if (n == null) return '—';
  return '★'.repeat(n) + '☆'.repeat(5 - n);
};

export function renderEvaluationReport(evaluation: EvaluationResponse): string {
  const dateStr = format(new Date(evaluation.evaluationDate), 'dd/MM/yyyy');
  const typeLabel = TYPE_LABELS[evaluation.evaluationType] || evaluation.evaluationType;

  const body = `
    <div style="font-family:'Segoe UI',system-ui,sans-serif;max-width:720px;margin:0 auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px;background:#fff">
      <div style="text-align:center;border-bottom:3px solid #4f46e5;padding-bottom:20px;margin-bottom:24px">
        <h1 style="margin:0;color:#1e293b;font-size:26px">NHẬN XÉT HỌC SINH</h1>
        <p style="margin:8px 0 0;color:#64748b;font-size:14px">${typeLabel} · ${dateStr}</p>
      </div>

      <table style="width:100%;margin-bottom:24px;font-size:15px">
        <tr><td style="color:#64748b;padding:6px 0;width:140px">Học sinh</td><td style="font-weight:600">${evaluation.student?.fullName || '—'}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0">Lớp</td><td style="font-weight:600">${evaluation.class?.name || '—'}</td></tr>
        <tr><td style="color:#64748b;padding:6px 0">Giáo viên</td><td>${evaluation.teacher?.fullName || '—'}</td></tr>
      </table>

      <h2 style="font-size:16px;color:#4f46e5;margin:0 0 12px">Đánh giá kỹ năng & thái độ</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <thead>
          <tr style="background:#f8fafc">
            <th style="text-align:left;padding:10px;border-bottom:2px solid #e2e8f0">Tiêu chí</th>
            <th style="text-align:center;padding:10px;border-bottom:2px solid #e2e8f0;width:120px">Điểm (1-5)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="padding:10px;border-bottom:1px solid #f1f5f9">Tham gia lớp</td><td style="text-align:center;padding:10px;border-bottom:1px solid #f1f5f9;color:#f59e0b">${stars(evaluation.participation)}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #f1f5f9">Bài tập về nhà</td><td style="text-align:center;padding:10px;border-bottom:1px solid #f1f5f9;color:#f59e0b">${stars(evaluation.homework)}</td></tr>
          <tr><td style="padding:10px;border-bottom:1px solid #f1f5f9">Thái độ / Hành vi</td><td style="text-align:center;padding:10px;border-bottom:1px solid #f1f5f9;color:#f59e0b">${stars(evaluation.behavior)}</td></tr>
        </tbody>
      </table>

      <h2 style="font-size:16px;color:#4f46e5;margin:0 0 12px">Điểm Nói & Viết</h2>
      <div style="display:flex;gap:16px;margin-bottom:24px">
        <div style="flex:1;background:linear-gradient(135deg,#dbeafe,#eff6ff);padding:16px;border-radius:10px;text-align:center">
          <div style="font-size:12px;color:#3b82f6;text-transform:uppercase;letter-spacing:1px">Điểm Nói</div>
          <div style="font-size:32px;font-weight:700;color:#1d4ed8">${evaluation.speakingScore ?? '—'}/10</div>
        </div>
        <div style="flex:1;background:linear-gradient(135deg,#fce7f3,#fdf2f8);padding:16px;border-radius:10px;text-align:center">
          <div style="font-size:12px;color:#db2777;text-transform:uppercase;letter-spacing:1px">Điểm Viết</div>
          <div style="font-size:32px;font-weight:700;color:#be185d">${evaluation.writingScore ?? '—'}/10</div>
        </div>
      </div>

      ${
        evaluation.comments
          ? `<h2 style="font-size:16px;color:#4f46e5;margin:0 0 8px">Nhận xét của giáo viên</h2>
             <p style="background:#f8fafc;padding:16px;border-radius:8px;line-height:1.6;color:#334155;margin:0 0 24px">${evaluation.comments.replace(/</g, '&lt;')}</p>`
          : ''
      }

      <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:32px;border-top:1px solid #f1f5f9;padding-top:16px">
        Báo cáo được tạo tự động · Trung tâm giáo dục
      </p>
    </div>`;

  return `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8"><title>Nhận xét - ${evaluation.student?.fullName || ''}</title></head><body style="background:#f1f5f9;padding:24px;margin:0">${body}</body></html>`;
}
