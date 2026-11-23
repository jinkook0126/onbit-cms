import { useState } from 'react';

import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { CustomerNextContactField } from '~/features/customers/components/CustomerNextContactField';
import { MAX_CUSTOMER_KEYWORD_LENGTH } from '~/features/customers/type';
import {
  isReceivableSearchField,
  receivablePaymentFilterLabels,
  receivableSearchFieldLabels,
} from '~/features/receivables/type';
import { fieldLabel } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { ReceivablePaymentFilter, ReceivableSearchField } from '~/features/receivables/type';

export type ReceivableSearchValues = {
  field: ReceivableSearchField;
  keyword: string;
  from: string;
  to: string;
  status: ReceivablePaymentFilter;
};

type ReceivableSearchFormProps = {
  values: ReceivableSearchValues;
  onSearch: (values: ReceivableSearchValues) => void;
};

const searchFields = Object.keys(receivableSearchFieldLabels) as ReceivableSearchField[];
const paymentFilters = Object.keys(receivablePaymentFilterLabels) as ReceivablePaymentFilter[];
const rangeErrorMessage = '시작일은 종료일보다 늦을 수 없습니다.';

function keywordPlaceholder(field: ReceivableSearchField): string {
  if (field === 'assignee') {
    return '담당 이름을 입력하세요';
  }
  return '고객 이름을 입력하세요';
}

function isPaymentFilter(value: string): value is ReceivablePaymentFilter {
  return value === 'ALL' || value === 'OVERDUE' || value === 'SCHEDULED' || value === 'PAID';
}

export function ReceivableSearchForm({ values, onSearch }: ReceivableSearchFormProps): JSX.Element {
  const [draftField, setDraftField] = useState(values.field);
  const [draftKeyword, setDraftKeyword] = useState(values.keyword);
  const [draftFrom, setDraftFrom] = useState(values.from);
  const [draftTo, setDraftTo] = useState(values.to);
  const [draftStatus, setDraftStatus] = useState(values.status);
  const [rangeError, setRangeError] = useState('');

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (draftFrom !== '' && draftTo !== '' && draftFrom > draftTo) {
      setRangeError(rangeErrorMessage);
      return;
    }
    setRangeError('');
    onSearch({
      field: draftField,
      keyword: draftKeyword.trim(),
      from: draftFrom,
      to: draftTo,
      status: draftStatus,
    });
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid w-full max-w-40 gap-2">
          <Label htmlFor="receivable-search-field" className={fieldLabel}>
            구분
          </Label>
          <Select
            value={draftField}
            onValueChange={(value) => {
              if (!isReceivableSearchField(value)) {
                return;
              }
              setDraftField(value);
            }}
          >
            <SelectTrigger id="receivable-search-field" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {searchFields.map((option) => (
                <SelectItem key={option} value={option}>
                  {receivableSearchFieldLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid min-w-56 flex-1 gap-2">
          <Label htmlFor="receivable-search-keyword" className={fieldLabel}>
            검색어
          </Label>
          <Input
            id="receivable-search-keyword"
            value={draftKeyword}
            maxLength={MAX_CUSTOMER_KEYWORD_LENGTH}
            placeholder={keywordPlaceholder(draftField)}
            onChange={(event) => {
              setDraftKeyword(event.currentTarget.value.slice(0, MAX_CUSTOMER_KEYWORD_LENGTH));
            }}
          />
        </div>
        <div className="w-44">
          <CustomerNextContactField
            id="receivable-search-from"
            label="납부예정 시작"
            value={draftFrom}
            invalid={rangeError !== ''}
            disabled={false}
            onChange={(value) => {
              setDraftFrom(value);
              setRangeError('');
            }}
          />
        </div>
        <div className="w-44">
          <CustomerNextContactField
            id="receivable-search-to"
            label="납부예정 종료"
            value={draftTo}
            invalid={rangeError !== ''}
            disabled={false}
            onChange={(value) => {
              setDraftTo(value);
              setRangeError('');
            }}
          />
        </div>
        <div className="grid w-full max-w-40 gap-2">
          <Label htmlFor="receivable-search-status" className={fieldLabel}>
            납부 상태
          </Label>
          <Select
            value={draftStatus}
            onValueChange={(value) => {
              if (!isPaymentFilter(value)) {
                return;
              }
              setDraftStatus(value);
            }}
          >
            <SelectTrigger id="receivable-search-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {paymentFilters.map((option) => (
                <SelectItem key={option} value={option}>
                  {receivablePaymentFilterLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit">검색</Button>
      </div>
      {rangeError !== '' ? (
        <p role="alert" className="text-sm text-destructive">
          {rangeError}
        </p>
      ) : null}
    </form>
  );
}
