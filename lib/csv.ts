/**
 * 거래 목록을 BOM 포함 CSV로 내려받습니다 (엑셀 한글 깨짐 방지).
 *
 * @param rows 내보낼 거래 행
 * @param filename 다운로드 파일명
 * @param members 결제자 닉네임 매핑용 멤버 목록
 */
export function downloadTransactionsCsv(
  rows: {
    date?: string | null;
    type?: string | null;
    category?: string | null;
    amount?: number | null;
    memo?: string | null;
    paid_by?: string | null;
  }[],
  filename: string,
  members: { user_id: string; nickname: string }[] = []
) {
  const nickById = new Map(members.map((m) => [m.user_id, m.nickname]));
  const escape = (value: unknown) => {
    const text = value == null ? '' : String(value);
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };

  const header = ['날짜', '구분', '카테고리', '금액', '메모', '결제자'];
  const lines = rows.map((row) => {
    const type = (row.type ?? '').toUpperCase() === 'INCOME' ? '수입' : '지출';
    const payer = row.paid_by ? (nickById.get(row.paid_by) ?? '') : '';
    return [
      escape(String(row.date ?? '').slice(0, 10)),
      escape(type),
      escape(row.category ?? ''),
      escape(Number(row.amount ?? 0)),
      escape(row.memo ?? ''),
      escape(payer),
    ].join(',');
  });

  const csv = `\uFEFF${[header.join(','), ...lines].join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
