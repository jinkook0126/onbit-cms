import { RETAINED_STATUS_CODE } from '~/features/catalog/defaults';
import { isCatalogOptionRef } from '~/features/catalog/type';
import { isUuid } from '~/lib/uuid';

import type { CatalogOptionRef } from '~/features/catalog/type';

export const CUSTOMER_PAGE_SIZE = 15;
export const MAX_CUSTOMER_ASSIGNEE_BATCH = 100;
export const MAX_CUSTOMER_KEYWORD_LENGTH = 50;
export const MAX_CUSTOMER_NAME_LENGTH = 30;
export const MIN_CUSTOMER_PHONE_LENGTH = 8;
export const MAX_CUSTOMER_PHONE_LENGTH = 12;
export const MAX_CUSTOMER_IMPORT_ROWS = 500;
export const MAX_CUSTOMER_IMPORT_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_CONSULTATION_CONTENT_LENGTH = 1000;
export const MAX_RETAIN_AMOUNT = 2_000_000_000;
const refundConsultationPrefixLimit = '환불 2,000,000,000원 · '.length;
export const MAX_REFUND_REASON_LENGTH =
  MAX_CONSULTATION_CONTENT_LENGTH - refundConsultationPrefixLimit;
export const MAX_INSTALLMENT_COUNT = 120;
const promiseChangePrefixLimit = `${MAX_INSTALLMENT_COUNT}회차 납기 0000-00-00 -> 0000-00-00 / `
  .length;
export const MAX_PROMISE_REASON_LENGTH = MAX_CONSULTATION_CONTENT_LENGTH - promiseChangePrefixLimit;

export function customerPhoneDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, MAX_CUSTOMER_PHONE_LENGTH);
}

function splitPhone(digits: string, head: number, middle: number): string {
  const first = digits.slice(0, head);
  const second = digits.slice(head, head + middle);
  const third = digits.slice(head + middle);
  if (second.length === 0) {
    return first;
  }
  if (third.length === 0) {
    return `${first}-${second}`;
  }
  return `${first}-${second}-${third}`;
}

export function formatCustomerPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < MIN_CUSTOMER_PHONE_LENGTH) {
    return digits;
  }
  if (digits.startsWith('02')) {
    if (digits.length <= 9) {
      return splitPhone(digits, 2, 3);
    }
    return splitPhone(digits, 2, 4);
  }
  if (digits.length === 8) {
    return splitPhone(digits, 4, 4);
  }
  if (digits.length === 10) {
    return splitPhone(digits, 3, 3);
  }
  if (digits.length >= MAX_CUSTOMER_PHONE_LENGTH) {
    return splitPhone(digits.slice(0, MAX_CUSTOMER_PHONE_LENGTH), 4, 4);
  }
  return splitPhone(digits, 3, 4);
}

export const customerSearchFieldLabels = {
  name: '이름',
  phone: '전화번호',
  assignee: '담당',
} as const;

export function isRetainedStatus(code: string | null): boolean {
  return code === RETAINED_STATUS_CODE;
}

export type CustomerSummary = {
  totalAmount: number;
  deposit: number;
  netReceived: number;
  remainingRetainer: number;
  overdue: number;
};
export type CustomerSearchField = keyof typeof customerSearchFieldLabels;

export type CustomerListItem = {
  id: string;
  name: string;
  phone: string;
  source: CatalogOptionRef;
  status: CatalogOptionRef;
  assigneeName: string | null;
  caseType: CatalogOptionRef | null;
  registeredOn: string;
  nextContactOn: string | null;
  firstProcessedOn: string | null;
  contractedOn: string | null;
  latestConsultation: string | null;
  favorited: boolean;
};

export type CustomerDetail = {
  id: string;
  name: string;
  phone: string;
  source: CatalogOptionRef;
  assigneeId: string | null;
  assigneeName: string | null;
  status: CatalogOptionRef;
  caseType: CatalogOptionRef | null;
  registeredOn: string;
  firstProcessedOn: string | null;
  contractedOn: string | null;
  retainerFee: number | null;
  remainingRetainer: number | null;
};

export type CustomerReminder = {
  id: string;
  name: string;
  nextContactOn: string;
  latestConsultation: string | null;
};

export type CustomerReminderResponse = {
  reminders: CustomerReminder[];
};

export type CustomerListResponse = {
  customers: CustomerListItem[];
  page: number;
  pageSize: number;
  total: number;
};

export type CustomerListView = 'all' | 'favorites';
export type CustomerSortField = 'registered' | 'contracted';
export type CustomerSortDirection = 'asc' | 'desc';

export type CustomerListSort = {
  field: CustomerSortField;
  direction: CustomerSortDirection;
};

export type CustomerListParams = {
  field: CustomerSearchField;
  keyword: string;
  statusId: string | null;
  sourceId: string | null;
  from: string;
  to: string;
  sort: CustomerListSort;
  view: CustomerListView;
  page: number;
};

export type CustomerAssigneeOption = {
  id: string;
  name: string;
};

export type CustomerAssigneeResponse = {
  currentUserId: string;
  assignees: CustomerAssigneeOption[];
};

export type CustomerAssigneeBatchSubmission = {
  customerIds: string[];
  assigneeId: string;
};

export type CustomerAssigneeBatchResponse = {
  updatedCount?: number;
  formError?: string;
};

export type CustomerProfileFieldErrors = {
  name?: string;
  phone?: string;
  sourceId?: string;
  assigneeId?: string;
  statusId?: string;
  caseTypeId?: string;
  firstProcessedOn?: string;
  contractedOn?: string;
  retainerFee?: string;
};

export type CustomerProfileSubmission = {
  name: string;
  phone: string;
  sourceId: string;
  assigneeId: string;
  statusId: string;
  caseTypeId: string | null;
  firstProcessedOn: string | null;
  contractedOn: string | null;
  retainerFee: string | null;
};

export type CustomerProfileResponse = {
  id?: string;
  fieldErrors?: CustomerProfileFieldErrors;
  formError?: string;
};

export type CustomerImportRowError = {
  row: number;
  message: string;
};

export type CustomerImportDuplicate = {
  row: number;
  name: string;
  phone: string;
};

export type CustomerImportResponse = {
  createdCount?: number;
  formError?: string;
  rowErrors?: CustomerImportRowError[];
  duplicates?: CustomerImportDuplicate[];
};

export type ConsultationListItem = {
  id: string;
  content: string;
  nextContactOn: string | null;
  createdAt: string;
};

export type ConsultationListResponse = {
  consultations: ConsultationListItem[];
};

export type ConsultationCreateFieldErrors = {
  content?: string;
  nextContactOn?: string;
};

export type ConsultationCreateSubmission = {
  content: string;
  nextContactOn: string | null;
};

export type ConsultationCreateResponse = {
  id?: string;
  fieldErrors?: ConsultationCreateFieldErrors;
  formError?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNullableOptionRef(value: unknown): boolean {
  return value === null || isCatalogOptionRef(value);
}

function isNullableString(value: unknown): boolean {
  return value === null || typeof value === 'string';
}

function isCustomerListItem(value: unknown): value is CustomerListItem {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.phone === 'string' &&
    isCatalogOptionRef(value.source) &&
    isCatalogOptionRef(value.status) &&
    isNullableString(value.assigneeName) &&
    isNullableOptionRef(value.caseType) &&
    typeof value.registeredOn === 'string' &&
    isNullableString(value.nextContactOn) &&
    isNullableString(value.firstProcessedOn) &&
    isNullableString(value.contractedOn) &&
    isNullableString(value.latestConsultation) &&
    typeof value.favorited === 'boolean'
  );
}

export function isCustomerDetail(value: unknown): value is CustomerDetail {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.phone === 'string' &&
    isCatalogOptionRef(value.source) &&
    isNullableString(value.assigneeId) &&
    isNullableString(value.assigneeName) &&
    isCatalogOptionRef(value.status) &&
    isNullableOptionRef(value.caseType) &&
    typeof value.registeredOn === 'string' &&
    isNullableString(value.firstProcessedOn) &&
    isNullableString(value.contractedOn) &&
    (value.retainerFee === null || isWonAmount(value.retainerFee)) &&
    (value.remainingRetainer === null || isWonAmount(value.remainingRetainer))
  );
}

export type CustomerStatusSubmission = {
  statusId: string;
};

export type CustomerCaseTypeSubmission = {
  caseTypeId: string;
};

export type CustomerCaseTypeResponse = {
  caseType?: CatalogOptionRef;
  formError?: string;
};

export type CustomerStatusResponse = {
  status?: CatalogOptionRef;
  formError?: string;
};

export type CustomerRetainFieldErrors = {
  contractedOn?: string;
  caseTypeId?: string;
  retainerFee?: string;
  deposit?: string;
  installmentCount?: string;
  firstPaymentOn?: string;
};

export type CustomerRetainSubmission = {
  contractedOn: string;
  caseTypeId: string;
  retainerFee: string;
  deposit: string;
  installmentCount: string;
  firstPaymentOn: string;
};

export type CustomerRetainResponse = {
  status?: CatalogOptionRef;
  fieldErrors?: CustomerRetainFieldErrors;
  formError?: string;
};

export function isCustomerStatusSubmission(value: unknown): value is CustomerStatusSubmission {
  return isRecord(value) && typeof value.statusId === 'string';
}

export function isCustomerCaseTypeSubmission(value: unknown): value is CustomerCaseTypeSubmission {
  return isRecord(value) && typeof value.caseTypeId === 'string';
}

export function isCustomerCaseTypeResponse(value: unknown): value is CustomerCaseTypeResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  return value.caseType === undefined || isCatalogOptionRef(value.caseType);
}

export function isCustomerStatusResponse(value: unknown): value is CustomerStatusResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  return value.status === undefined || isCatalogOptionRef(value.status);
}

function isCustomerReminder(value: unknown): value is CustomerReminder {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.nextContactOn === 'string' &&
    isNullableString(value.latestConsultation)
  );
}

export function isCustomerReminderResponse(value: unknown): value is CustomerReminderResponse {
  if (!isRecord(value) || !Array.isArray(value.reminders)) {
    return false;
  }
  return value.reminders.every(isCustomerReminder);
}

export function isCustomerListResponse(value: unknown): value is CustomerListResponse {
  if (
    !isRecord(value) ||
    !Array.isArray(value.customers) ||
    typeof value.page !== 'number' ||
    typeof value.pageSize !== 'number' ||
    typeof value.total !== 'number'
  ) {
    return false;
  }
  return value.customers.every(isCustomerListItem);
}

const customerProfileErrorKeys = [
  'name',
  'phone',
  'sourceId',
  'assigneeId',
  'statusId',
  'caseTypeId',
  'firstProcessedOn',
  'contractedOn',
  'retainerFee',
] as const;

function isCustomerAssigneeOption(value: unknown): value is CustomerAssigneeOption {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.id === 'string' && typeof value.name === 'string';
}

export function isCustomerAssigneeResponse(value: unknown): value is CustomerAssigneeResponse {
  if (
    !isRecord(value) ||
    typeof value.currentUserId !== 'string' ||
    !Array.isArray(value.assignees)
  ) {
    return false;
  }
  return value.assignees.every(isCustomerAssigneeOption);
}

export function isCustomerAssigneeBatchSubmission(
  value: unknown,
): value is CustomerAssigneeBatchSubmission {
  if (
    !isRecord(value) ||
    typeof value.assigneeId !== 'string' ||
    !Array.isArray(value.customerIds)
  ) {
    return false;
  }
  return value.customerIds.every((customerId) => typeof customerId === 'string');
}

export function isCustomerAssigneeBatchResponse(
  value: unknown,
): value is CustomerAssigneeBatchResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.updatedCount !== undefined && typeof value.updatedCount !== 'number') {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  return true;
}

function isCustomerProfileFieldErrors(value: unknown): value is CustomerProfileFieldErrors {
  if (!isRecord(value)) {
    return false;
  }
  return customerProfileErrorKeys.every(
    (key) => value[key] === undefined || typeof value[key] === 'string',
  );
}

export function isCustomerProfileSubmission(value: unknown): value is CustomerProfileSubmission {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.name === 'string' &&
    typeof value.phone === 'string' &&
    typeof value.sourceId === 'string' &&
    typeof value.assigneeId === 'string' &&
    typeof value.statusId === 'string' &&
    isNullableString(value.caseTypeId) &&
    (value.firstProcessedOn === null || typeof value.firstProcessedOn === 'string') &&
    (value.contractedOn === null || typeof value.contractedOn === 'string') &&
    (value.retainerFee === null || typeof value.retainerFee === 'string')
  );
}

function isConsultationListItem(value: unknown): value is ConsultationListItem {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.content === 'string' &&
    isNullableString(value.nextContactOn) &&
    typeof value.createdAt === 'string'
  );
}

export function isConsultationListResponse(value: unknown): value is ConsultationListResponse {
  if (!isRecord(value) || !Array.isArray(value.consultations)) {
    return false;
  }
  return value.consultations.every(isConsultationListItem);
}

const consultationCreateErrorKeys = ['content', 'nextContactOn'] as const;

function isConsultationCreateFieldErrors(value: unknown): value is ConsultationCreateFieldErrors {
  if (!isRecord(value)) {
    return false;
  }
  return consultationCreateErrorKeys.every(
    (key) => value[key] === undefined || typeof value[key] === 'string',
  );
}

export function isConsultationCreateSubmission(
  value: unknown,
): value is ConsultationCreateSubmission {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.content === 'string' &&
    (value.nextContactOn === null || typeof value.nextContactOn === 'string')
  );
}

export function isConsultationCreateResponse(value: unknown): value is ConsultationCreateResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.id !== undefined && typeof value.id !== 'string') {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  if (value.fieldErrors !== undefined && !isConsultationCreateFieldErrors(value.fieldErrors)) {
    return false;
  }
  return true;
}

export function isCustomerProfileResponse(value: unknown): value is CustomerProfileResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.id !== undefined && typeof value.id !== 'string') {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  if (value.fieldErrors !== undefined && !isCustomerProfileFieldErrors(value.fieldErrors)) {
    return false;
  }
  return true;
}

function isCustomerImportRowError(value: unknown): value is CustomerImportRowError {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.row === 'number' &&
    Number.isSafeInteger(value.row) &&
    typeof value.message === 'string'
  );
}

function isCustomerImportDuplicate(value: unknown): value is CustomerImportDuplicate {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.row === 'number' &&
    Number.isSafeInteger(value.row) &&
    typeof value.name === 'string' &&
    typeof value.phone === 'string'
  );
}

export function isCustomerImportResponse(value: unknown): value is CustomerImportResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.createdCount !== undefined && typeof value.createdCount !== 'number') {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  if (
    value.rowErrors !== undefined &&
    (!Array.isArray(value.rowErrors) || !value.rowErrors.every(isCustomerImportRowError))
  ) {
    return false;
  }
  if (
    value.duplicates !== undefined &&
    (!Array.isArray(value.duplicates) || !value.duplicates.every(isCustomerImportDuplicate))
  ) {
    return false;
  }
  return true;
}

const customerRetainErrorKeys = [
  'contractedOn',
  'caseTypeId',
  'retainerFee',
  'deposit',
  'installmentCount',
  'firstPaymentOn',
] as const;

function isCustomerRetainFieldErrors(value: unknown): value is CustomerRetainFieldErrors {
  if (!isRecord(value)) {
    return false;
  }
  return customerRetainErrorKeys.every(
    (key) => value[key] === undefined || typeof value[key] === 'string',
  );
}

export function isCustomerRetainSubmission(value: unknown): value is CustomerRetainSubmission {
  if (!isRecord(value)) {
    return false;
  }
  return customerRetainErrorKeys.every((key) => typeof value[key] === 'string');
}

export function isCustomerRetainResponse(value: unknown): value is CustomerRetainResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.status !== undefined && !isCatalogOptionRef(value.status)) {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  if (value.fieldErrors !== undefined && !isCustomerRetainFieldErrors(value.fieldErrors)) {
    return false;
  }
  return true;
}

export const INSTALLMENT_ALREADY_PAID_MESSAGE = '이미 완납된 회차입니다.';

export const paymentMethodLabels = {
  CASH: '현금',
  CARD: '카드',
} as const;

export type PaymentMethod = keyof typeof paymentMethodLabels;

export function installmentScheduleLabel(installment: {
  kind: InstallmentKind;
  sequence: number;
}): string {
  if (installment.kind === 'DEPOSIT') {
    return '계약금';
  }
  return `${installment.sequence}회차`;
}

export type InstallmentKind = 'DEPOSIT' | 'INSTALLMENT';

export type InstallmentListItem = {
  id: string;
  kind: InstallmentKind;
  sequence: number;
  promisedOn: string;
  scheduledAmount: number;
  receivedAmount: number;
};

export type InstallmentListResponse = {
  installments: InstallmentListItem[];
};

export type InstallmentPromiseFieldErrors = {
  promisedOn?: string;
  reason?: string;
};

export type InstallmentPromiseSubmission = {
  promisedOn: string;
  reason: string;
};

export type InstallmentPromiseResponse = {
  id?: string;
  fieldErrors?: InstallmentPromiseFieldErrors;
  formError?: string;
};

function isInstallmentKind(value: unknown): value is InstallmentKind {
  return value === 'DEPOSIT' || value === 'INSTALLMENT';
}

function isInstallmentListItem(value: unknown): value is InstallmentListItem {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    isInstallmentKind(value.kind) &&
    typeof value.sequence === 'number' &&
    typeof value.promisedOn === 'string' &&
    typeof value.scheduledAmount === 'number' &&
    typeof value.receivedAmount === 'number'
  );
}

function isWonAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

export function isCustomerSummary(value: unknown): value is CustomerSummary {
  if (!isRecord(value)) {
    return false;
  }
  return (
    isWonAmount(value.totalAmount) &&
    isWonAmount(value.deposit) &&
    isWonAmount(value.netReceived) &&
    isWonAmount(value.remainingRetainer) &&
    isWonAmount(value.overdue)
  );
}

export function isInstallmentListResponse(value: unknown): value is InstallmentListResponse {
  if (!isRecord(value) || !Array.isArray(value.installments)) {
    return false;
  }
  return value.installments.every(isInstallmentListItem);
}

function isInstallmentPromiseFieldErrors(value: unknown): value is InstallmentPromiseFieldErrors {
  if (!isRecord(value)) {
    return false;
  }
  const promisedOn = value.promisedOn === undefined || typeof value.promisedOn === 'string';
  const reason = value.reason === undefined || typeof value.reason === 'string';
  return promisedOn && reason;
}

export function isInstallmentPromiseSubmission(
  value: unknown,
): value is InstallmentPromiseSubmission {
  return (
    isRecord(value) && typeof value.promisedOn === 'string' && typeof value.reason === 'string'
  );
}

export function isInstallmentPromiseResponse(value: unknown): value is InstallmentPromiseResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.id !== undefined && typeof value.id !== 'string') {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  if (value.fieldErrors !== undefined && !isInstallmentPromiseFieldErrors(value.fieldErrors)) {
    return false;
  }
  return true;
}

export type InstallmentPaymentFieldErrors = {
  amount?: string;
  paidOn?: string;
  installmentId?: string;
  method?: string;
};

export type InstallmentPaymentSubmission = {
  amount: string;
  paidOn: string;
  installmentId: string;
  method: string;
};

export type InstallmentPaymentResponse = {
  id?: string;
  fieldErrors?: InstallmentPaymentFieldErrors;
  formError?: string;
};

const installmentPaymentErrorKeys = ['amount', 'paidOn', 'installmentId', 'method'] as const;

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return value === 'CASH' || value === 'CARD';
}

export const ledgerEntryKindLabels = {
  PAYMENT: '입금',
  REFUND: '환불',
} as const;

export type LedgerEntryKind = keyof typeof ledgerEntryKindLabels;

export type LedgerEntry = {
  id: string;
  transactedOn: string;
  kind: LedgerEntryKind;
  amount: number;
  method: PaymentMethod;
  reason: string | null;
};

export type RefundSource = {
  id: string;
  paidOn: string;
  refundableAmount: number;
};

export type LedgerListResponse = {
  entries: LedgerEntry[];
  refundSources: RefundSource[];
};

export const REFUND_EXHAUSTED_MESSAGE = '환불할 수 있는 금액이 없습니다.';

export type RefundFieldErrors = {
  paymentId?: string;
  amount?: string;
  refundedOn?: string;
  reason?: string;
};

export type RefundSubmission = {
  paymentId: string;
  amount: string;
  refundedOn: string;
  reason: string;
};

export type RefundResponse = {
  id?: string;
  fieldErrors?: RefundFieldErrors;
  formError?: string;
};

function isLedgerEntryKind(value: unknown): value is LedgerEntryKind {
  return value === 'PAYMENT' || value === 'REFUND';
}

function isLedgerEntry(value: unknown): value is LedgerEntry {
  if (!isRecord(value)) {
    return false;
  }
  const reason = value.reason === null || typeof value.reason === 'string';
  return (
    typeof value.id === 'string' &&
    typeof value.transactedOn === 'string' &&
    isLedgerEntryKind(value.kind) &&
    typeof value.amount === 'number' &&
    isPaymentMethod(value.method) &&
    reason
  );
}

function isRefundSource(value: unknown): value is RefundSource {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === 'string' &&
    typeof value.paidOn === 'string' &&
    typeof value.refundableAmount === 'number'
  );
}

export function isLedgerListResponse(value: unknown): value is LedgerListResponse {
  if (!isRecord(value) || !Array.isArray(value.entries) || !Array.isArray(value.refundSources)) {
    return false;
  }
  return value.entries.every(isLedgerEntry) && value.refundSources.every(isRefundSource);
}

const refundErrorKeys = ['paymentId', 'amount', 'refundedOn', 'reason'] as const;

function isRefundFieldErrors(value: unknown): value is RefundFieldErrors {
  if (!isRecord(value)) {
    return false;
  }
  return refundErrorKeys.every((key) => value[key] === undefined || typeof value[key] === 'string');
}

export function isRefundSubmission(value: unknown): value is RefundSubmission {
  if (!isRecord(value)) {
    return false;
  }
  return refundErrorKeys.every((key) => typeof value[key] === 'string');
}

export function isRefundResponse(value: unknown): value is RefundResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.id !== undefined && typeof value.id !== 'string') {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  if (value.fieldErrors !== undefined && !isRefundFieldErrors(value.fieldErrors)) {
    return false;
  }
  return true;
}

function isInstallmentPaymentFieldErrors(value: unknown): value is InstallmentPaymentFieldErrors {
  if (!isRecord(value)) {
    return false;
  }
  return installmentPaymentErrorKeys.every(
    (key) => value[key] === undefined || typeof value[key] === 'string',
  );
}

export function isInstallmentPaymentSubmission(
  value: unknown,
): value is InstallmentPaymentSubmission {
  if (!isRecord(value)) {
    return false;
  }
  return installmentPaymentErrorKeys.every((key) => typeof value[key] === 'string');
}

export function isInstallmentPaymentResponse(value: unknown): value is InstallmentPaymentResponse {
  if (!isRecord(value)) {
    return false;
  }
  if (value.id !== undefined && typeof value.id !== 'string') {
    return false;
  }
  if (value.formError !== undefined && typeof value.formError !== 'string') {
    return false;
  }
  if (value.fieldErrors !== undefined && !isInstallmentPaymentFieldErrors(value.fieldErrors)) {
    return false;
  }
  return true;
}

export function isCustomerSearchField(value: string): value is CustomerSearchField {
  return Object.keys(customerSearchFieldLabels).includes(value);
}

export function parseCustomerSearchField(value: string | null): CustomerSearchField | null {
  if (value === null) {
    return 'name';
  }
  if (isCustomerSearchField(value)) {
    return value;
  }
  return null;
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function parseCustomerListView(value: string | null): CustomerListView | null {
  if (value === null || value === '' || value === 'all') {
    return 'all';
  }
  if (value === 'favorites') {
    return 'favorites';
  }
  return null;
}

export type CustomerFavoriteSubmission = {
  favorited: boolean;
};

export function isCustomerFavoriteSubmission(value: unknown): value is CustomerFavoriteSubmission {
  return isRecord(value) && typeof value.favorited === 'boolean';
}

export type CustomerFavoriteResponse = {
  favorited: boolean;
};

export function isCustomerFavoriteResponse(value: unknown): value is CustomerFavoriteResponse {
  return isRecord(value) && typeof value.favorited === 'boolean';
}

export function parseCustomerSortField(value: string | null): CustomerSortField | null {
  if (value === null || value === '' || value === 'registered') {
    return 'registered';
  }
  if (value === 'contracted') {
    return 'contracted';
  }
  return null;
}

export function parseCustomerSortDirection(value: string | null): CustomerSortDirection | null {
  if (value === null || value === '' || value === 'desc') {
    return 'desc';
  }
  if (value === 'asc') {
    return 'asc';
  }
  return null;
}

export function parseCustomerDate(value: string | null): string | null {
  if (value === null || value === '') {
    return '';
  }
  if (!isCalendarDate(value)) {
    return null;
  }
  return value;
}

export function seoulCalendarToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function seoulMonthStart(today = seoulCalendarToday()): string {
  return `${today.slice(0, 7)}-01`;
}

export function isCatalogOptionParam(value: string | null): boolean {
  return value === null || value === 'all' || isUuid(value);
}

export function parseCatalogOptionParam(value: string | null): string | null {
  if (value === null || value === 'all') {
    return null;
  }
  if (isUuid(value)) {
    return value;
  }
  return null;
}
