import ExcelJS from 'exceljs';

import { DEFAULT_STATUS_CODE } from '~/features/catalog/defaults';
import { findCompanyStatusByCode } from '~/features/customers/api/customerCatalog.server';
import {
  customerIdentityKey,
  readTakenCustomerKeys,
} from '~/features/customers/api/customerIdentity.server';
import { resolveCustomerActor } from '~/features/customers/api/customerScope.server';
import {
  MAX_CUSTOMER_IMPORT_FILE_BYTES,
  MAX_CUSTOMER_IMPORT_ROWS,
  MAX_CUSTOMER_NAME_LENGTH,
  MAX_CUSTOMER_PHONE_LENGTH,
  MIN_CUSTOMER_PHONE_LENGTH,
} from '~/features/customers/type';
import { prisma } from '~/lib/db.server';
import { errorCodeLabel } from '~/lib/error.server';

import type { CellValue, DataValidation, Workbook, Worksheet } from 'exceljs';
import type { CatalogOptionRef } from '~/features/catalog/type';
import type { CustomerImportDuplicate, CustomerImportRowError } from '~/features/customers/type';

const TEMPLATE_HEADERS = ['이름', '연락처', '유입경로'] as const;
const MAX_ROW_ERRORS = 20;
const NAME_REQUIRED_MESSAGE = '이름을 입력하세요.';
const NAME_TOO_LONG_MESSAGE = `이름은 ${MAX_CUSTOMER_NAME_LENGTH}자 이하여야 합니다.`;
const PHONE_REQUIRED_MESSAGE = '연락처를 입력하세요.';
const PHONE_INVALID_MESSAGE = `연락처는 숫자 ${MIN_CUSTOMER_PHONE_LENGTH}자 이상 ${MAX_CUSTOMER_PHONE_LENGTH}자 이하로 입력하세요.`;
const SOURCE_REQUIRED_MESSAGE = '유입경로를 입력하세요.';
const SOURCE_UNAVAILABLE_MESSAGE =
  '사용할 수 있는 유입처가 없습니다. 유입처관리에서 먼저 등록하세요.';
const STATUS_UNAVAILABLE_MESSAGE = '기본 상담 상태(상담중)를 찾을 수 없습니다.';
const SOURCE_SHEET_NAME = '유입경로';
const HEADER_MESSAGE = '템플릿의 이름, 연락처, 유입경로 열을 사용하세요.';
const EMPTY_MESSAGE = '등록할 고객이 없습니다.';
const TOO_MANY_ROWS_MESSAGE = `한 번에 ${MAX_CUSTOMER_IMPORT_ROWS}명까지 등록할 수 있습니다.`;
const FILE_TOO_LARGE_MESSAGE = '파일은 2MB 이하여야 합니다.';
const FILE_INVALID_MESSAGE = '엑셀 파일을 읽지 못했습니다. xlsx 파일을 선택하세요.';

export type CustomerImportTemplateResult =
  | { status: 'ok'; body: ArrayBuffer }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'failed' };

export type CustomerImportResult =
  | { status: 'ok'; createdCount: number; duplicates: CustomerImportDuplicate[] }
  | { status: 'anonymous' }
  | { status: 'forbidden' }
  | { status: 'invalid'; formError?: string; rowErrors?: CustomerImportRowError[] }
  | { status: 'failed' };

type ImportCustomer = {
  row: number;
  name: string;
  phone: string;
  sourceId: string;
};

type SourceOption = Pick<CatalogOptionRef, 'id' | 'name' | 'code'>;

function sourceInvalidMessage(sources: SourceOption[]): string {
  return `유입경로는 ${sources.map((source) => source.name).join(', ')} 중에서 입력하세요.`;
}

function sourceFromCell(value: string, sources: SourceOption[]): SourceOption | null {
  return (
    sources.find((source) => source.name === value) ??
    sources.find((source) => source.code !== null && source.code === value) ??
    null
  );
}

async function readActiveSources(companyId: string): Promise<SourceOption[]> {
  return prisma.inflowSourceOption.findMany({
    where: { companyId, isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, code: true },
  });
}

function cellText(value: CellValue): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (typeof value === 'number' && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (value !== null && typeof value === 'object') {
    if ('richText' in value) {
      return value.richText
        .map((part) => part.text)
        .join('')
        .trim();
    }
    if ('text' in value) {
      return value.text.trim();
    }
    if ('result' in value) {
      return cellText(value.result ?? null);
    }
  }
  return '';
}

function phoneDigits(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10 && digits.startsWith('10')) {
    return `0${digits}`;
  }
  return digits;
}

function toArrayBuffer(value: Uint8Array | ArrayBuffer): ArrayBuffer {
  const view = value instanceof Uint8Array ? value : new Uint8Array(value);
  const copy = new ArrayBuffer(view.byteLength);
  new Uint8Array(copy).set(view);
  return copy;
}

function addSourceList(workbook: Workbook, sheet: Worksheet, sources: SourceOption[]): void {
  const sourceSheet = workbook.addWorksheet(SOURCE_SHEET_NAME);
  sourceSheet.columns = [{ header: SOURCE_SHEET_NAME, width: 24 }];
  sourceSheet.getRow(1).font = { bold: true };
  sources.forEach((source, index) => {
    sourceSheet.getCell(index + 2, 1).value = source.name;
  });
  const validation: DataValidation = {
    type: 'list',
    allowBlank: true,
    formulae: [`'${SOURCE_SHEET_NAME}'!$A$2:$A$${sources.length + 1}`],
    showErrorMessage: true,
    errorTitle: '유입경로',
    error: sourceInvalidMessage(sources),
  };
  const worksheet = sheet as Worksheet & {
    dataValidations: { add: (address: string, rule: DataValidation) => void };
  };
  worksheet.dataValidations.add(`C2:C${MAX_CUSTOMER_IMPORT_ROWS + 1}`, validation);
}

export async function readCustomerImportTemplate(request: Request): Promise<{
  result: CustomerImportTemplateResult;
  headers: Headers;
}> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }

  try {
    const sources = await readActiveSources(actor.companyId);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('상담 고객');
    sheet.columns = [
      { header: TEMPLATE_HEADERS[0], width: 20 },
      { header: TEMPLATE_HEADERS[1], width: 20 },
      { header: TEMPLATE_HEADERS[2], width: 24 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getColumn(2).numFmt = '@';
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
    if (sources.length > 0) {
      addSourceList(workbook, sheet, sources);
    }
    const buffer = await workbook.xlsx.writeBuffer();
    return { result: { status: 'ok', body: toArrayBuffer(buffer) }, headers };
  } catch (error) {
    console.error('상담 고객 템플릿을 만들지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}

function readImportRows(
  sheet: Worksheet,
  sources: SourceOption[],
): {
  customers: ImportCustomer[];
  formError?: string;
  rowErrors: CustomerImportRowError[];
} {
  const header = [1, 2, 3].map((column) => cellText(sheet.getRow(1).getCell(column).value));
  if (header.some((value, index) => value !== TEMPLATE_HEADERS[index])) {
    return { customers: [], formError: HEADER_MESSAGE, rowErrors: [] };
  }

  const customers: ImportCustomer[] = [];
  const rowErrors: CustomerImportRowError[] = [];
  let dataRows = 0;
  let errorRows = 0;
  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const name = cellText(row.getCell(1).value);
    const phone = phoneDigits(cellText(row.getCell(2).value));
    const sourceText = cellText(row.getCell(3).value);
    if (name === '' && phone === '' && sourceText === '') {
      continue;
    }
    dataRows += 1;
    if (dataRows > MAX_CUSTOMER_IMPORT_ROWS) {
      return { customers: [], formError: TOO_MANY_ROWS_MESSAGE, rowErrors: [] };
    }

    const messages: string[] = [];
    if (name.length < 1) {
      messages.push(NAME_REQUIRED_MESSAGE);
    } else if (name.length > MAX_CUSTOMER_NAME_LENGTH) {
      messages.push(NAME_TOO_LONG_MESSAGE);
    }
    if (phone.length < 1) {
      messages.push(PHONE_REQUIRED_MESSAGE);
    } else if (
      phone.length < MIN_CUSTOMER_PHONE_LENGTH ||
      phone.length > MAX_CUSTOMER_PHONE_LENGTH
    ) {
      messages.push(PHONE_INVALID_MESSAGE);
    }
    const source = sourceFromCell(sourceText, sources);
    if (sourceText.length < 1) {
      messages.push(SOURCE_REQUIRED_MESSAGE);
    } else if (source === null) {
      messages.push(sourceInvalidMessage(sources));
    }
    if (messages.length > 0) {
      errorRows += 1;
      if (rowErrors.length < MAX_ROW_ERRORS) {
        rowErrors.push({ row: rowNumber, message: messages.join(' ') });
      }
      continue;
    }
    if (source === null) {
      continue;
    }
    customers.push({ row: rowNumber, name, phone, sourceId: source.id });
  }

  if (dataRows === 0) {
    return { customers: [], formError: EMPTY_MESSAGE, rowErrors: [] };
  }
  if (errorRows > rowErrors.length) {
    return {
      customers: [],
      formError: `오류가 ${errorRows}개 행에 있습니다. 앞의 ${MAX_ROW_ERRORS}행만 표시합니다.`,
      rowErrors,
    };
  }
  return { customers, rowErrors };
}

function excludeDuplicateCustomers(
  customers: ImportCustomer[],
  taken: Set<string>,
): { fresh: ImportCustomer[]; duplicates: CustomerImportDuplicate[] } {
  const seen = new Set(taken);
  const fresh: ImportCustomer[] = [];
  const duplicates: CustomerImportDuplicate[] = [];
  for (const customer of customers) {
    const key = customerIdentityKey(customer.name, customer.phone);
    if (seen.has(key)) {
      duplicates.push({ row: customer.row, name: customer.name, phone: customer.phone });
      continue;
    }
    seen.add(key);
    fresh.push(customer);
  }
  return { fresh, duplicates };
}

export async function importCustomers(
  request: Request,
  file: File,
): Promise<{ result: CustomerImportResult; headers: Headers }> {
  const { actor, headers } = await resolveCustomerActor(request);
  if (actor.status !== 'ok') {
    return { result: actor, headers };
  }
  if (file.size > MAX_CUSTOMER_IMPORT_FILE_BYTES) {
    return { result: { status: 'invalid', formError: FILE_TOO_LARGE_MESSAGE }, headers };
  }
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    return { result: { status: 'invalid', formError: FILE_INVALID_MESSAGE }, headers };
  }

  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    if (workbook.worksheets.length === 0) {
      return { result: { status: 'invalid', formError: FILE_INVALID_MESSAGE }, headers };
    }
    const sheet = workbook.worksheets[0];
    const sources = await readActiveSources(actor.companyId);
    if (sources.length === 0) {
      return { result: { status: 'invalid', formError: SOURCE_UNAVAILABLE_MESSAGE }, headers };
    }
    const status = await findCompanyStatusByCode(actor.companyId, DEFAULT_STATUS_CODE);
    if (!status) {
      return { result: { status: 'invalid', formError: STATUS_UNAVAILABLE_MESSAGE }, headers };
    }
    const parsed = readImportRows(sheet, sources);
    if (parsed.formError || parsed.rowErrors.length > 0) {
      return {
        result: {
          status: 'invalid',
          formError: parsed.formError,
          rowErrors: parsed.rowErrors.length > 0 ? parsed.rowErrors : undefined,
        },
        headers,
      };
    }

    const taken = await readTakenCustomerKeys(actor.companyId, parsed.customers);
    const { fresh, duplicates } = excludeDuplicateCustomers(parsed.customers, taken);
    if (fresh.length > 0) {
      await prisma.customer.createMany({
        data: fresh.map((customer) => ({
          companyId: actor.companyId,
          name: customer.name,
          phone: customer.phone,
          sourceId: customer.sourceId,
          statusId: status.id,
          assigneeId: null,
        })),
      });
    }
    return { result: { status: 'ok', createdCount: fresh.length, duplicates }, headers };
  } catch (error) {
    console.error('상담 고객 엑셀을 등록하지 못했습니다.', errorCodeLabel(error));
    return { result: { status: 'failed' }, headers };
  }
}
