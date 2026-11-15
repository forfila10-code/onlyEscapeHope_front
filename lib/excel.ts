import { Capacitor } from '@capacitor/core';
import type { SheetData } from 'write-excel-file/browser';

/** 엑셀로 내보낼 거래 한 줄 */
export interface ExcelTransactionRow {
  /** 거래일 (yyyy-MM-dd 또는 ISO 문자열) */
  date?: string | null;
  /** INCOME | EXPENSE */
  type?: string | null;
  /** 카테고리 이름 */
  category?: string | null;
  /** 금액 */
  amount?: number | null;
  /** 메모 */
  memo?: string | null;
  /** 결제자 user id */
  paid_by?: string | null;
}

/** 저장 결과. blocked면 클릭이 끊겨서 한 번 더 눌러야 합니다. */
export type ExcelSaveResult = 'shared' | 'downloaded' | 'cancelled' | 'blocked' | 'unsupported';

const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export const EXCEL_APP_UNSUPPORTED_MESSAGE =
  '이 앱에서는 파일을 바로 저장할 수 없습니다. 휴대폰 브라우저(사파리·크롬)에서 같은 주소를 연 뒤 엑셀을 눌러 주세요.';

/** 시트 이름·열 너비. 날짜 열은 yyyy-mm-dd로 고정합니다. */
export const transactionSheetOptions = {
  sheet: '가계부',
  stickyRowsCount: 1,
  dateFormat: 'yyyy-mm-dd',
  columns: [
    { width: 14 },
    { width: 10 },
    { width: 14 },
    { width: 16 },
    { width: 32 },
    { width: 14 },
  ],
};

/**
 * 거래 목록을 엑셀 시트 행으로 바꿉니다.
 * 날짜는 현지 달력 기준으로 넣고, 금액은 숫자 셀이라 엑셀에서 합계를 낼 수 있습니다.
 *
 * @param rows 내보낼 거래 행
 * @param members 결제자 닉네임 매핑용 멤버 목록
 */
export function toTransactionSheetRows(
  rows: ExcelTransactionRow[],
  members: { user_id: string; nickname: string }[] = []
): SheetData {
  const nickById = new Map(members.map((member) => [member.user_id, member.nickname]));
  const header = ['날짜', '구분', '카테고리', '금액', '메모', '결제자'].map((label, index) => ({
    value: label,
    fontWeight: 'bold' as const,
    backgroundColor: '#EEF2FF',
    align: index === 3 ? ('right' as const) : ('left' as const),
  }));

  const body = rows.map((row) => {
    const income = (row.type ?? '').toUpperCase() === 'INCOME';
    const payer = row.paid_by ? (nickById.get(row.paid_by) ?? '') : '';
    const date = parseLocalDate(row.date);
    const amount = Number(row.amount ?? 0);
    return [
      date ? { type: Date, value: date, format: 'yyyy-mm-dd' } : { value: '' },
      { value: income ? '수입' : '지출', textColor: income ? '#2563EB' : '#DC2626' },
      { value: row.category ?? '' },
      { type: Number, value: Number.isFinite(amount) ? amount : 0, format: '#,##0', align: 'right' as const },
      { value: row.memo ?? '' },
      { value: payer },
    ];
  });

  return [header, ...body];
}

/**
 * 거래 목록으로 xlsx Blob을 만듭니다.
 *
 * @param rows 내보낼 거래 행
 * @param members 결제자 닉네임 매핑용 멤버 목록
 */
export async function toTransactionsXlsx(
  rows: ExcelTransactionRow[],
  members: { user_id: string; nickname: string }[] = []
): Promise<Blob> {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const blob = await writeExcelFile(toTransactionSheetRows(rows, members), transactionSheetOptions).toBlob();
  return blob.type === EXCEL_MIME ? blob : new Blob([blob], { type: EXCEL_MIME });
}

/**
 * xlsx 파일을 저장합니다.
 * 휴대폰·앱 웹뷰는 a[download]를 무시해서, 공유 시트로 파일을 넘깁니다.
 * 데스크톱은 링크를 문서에 붙인 뒤 클릭하고, 주소는 다운로드가 시작된 다음에 지웁니다.
 *
 * @param blob xlsx 파일 내용
 * @param filename 저장 파일명 (.xlsx)
 */
export async function saveExcelFile(blob: Blob, filename: string): Promise<ExcelSaveResult> {
  const file = new File([blob], filename, { type: EXCEL_MIME });

  if (shouldUseShareSheet() && canShareFile(file)) {
    try {
      await navigator.share({ files: [file], title: '가계부 엑셀' });
      return 'shared';
    } catch (error) {
      const name = error instanceof DOMException ? error.name : '';
      if (name === 'AbortError') return 'cancelled';
      // 조회를 기다린 뒤라 브라우저가 저장을 막은 경우. 버튼을 한 번 더 눌러야 합니다.
      if (name === 'NotAllowedError') return 'blocked';
    }
  }

  if (isNativeApp() && !canShareFile(file)) return 'unsupported';

  triggerAnchorDownload(file, filename);
  return 'downloaded';
}

/**
 * yyyy-MM-dd를 그 달력 날짜의 UTC 자정으로 바꿉니다.
 * 엑셀 변환이 UTC 밀리초를 쓰므로, 한국 자정으로 만들면 하루 전으로 찍힙니다.
 */
function parseLocalDate(value: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 터치 기기·네이티브 앱은 다운로드 폴더 대신 공유 시트를 씁니다. */
function shouldUseShareSheet(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (isNativeApp()) return true;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function canShareFile(file: File): boolean {
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/**
 * 데스크톱 브라우저 다운로드.
 * 링크를 body에 붙이지 않거나, 클릭 직후 blob 주소를 지우면 파일이 0바이트로 떨어지거나 취소됩니다.
 *
 * @param blob xlsx blob
 * @param filename 저장 파일명
 */
function triggerAnchorDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
