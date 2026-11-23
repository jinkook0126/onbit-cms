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
import {
  MAX_CUSTOMER_KEYWORD_LENGTH,
  customerPhoneDigits,
  customerSearchFieldLabels,
  isCustomerSearchField,
} from '~/features/customers/type';
import { fieldLabel } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { CustomerSearchField } from '~/features/customers/type';

export type CustomerSearchValues = {
  field: CustomerSearchField;
  keyword: string;
  from: string;
  to: string;
};

type CustomerSearchFormProps = {
  values: CustomerSearchValues;
  onSearch: (values: CustomerSearchValues) => void;
};

const rangeErrorMessage = '시작일은 종료일보다 늦을 수 없습니다.';

const searchFields = Object.keys(customerSearchFieldLabels) as CustomerSearchField[];

function keywordPlaceholder(field: CustomerSearchField): string {
  if (field === 'phone') {
    return '01012345678';
  }
  if (field === 'assignee') {
    return '담당 이름을 입력하세요';
  }
  return '이름을 입력하세요';
}

export function CustomerSearchForm({ values, onSearch }: CustomerSearchFormProps): JSX.Element {
  const [draftField, setDraftField] = useState(values.field);
  const [draftKeyword, setDraftKeyword] = useState(values.keyword);
  const [draftFrom, setDraftFrom] = useState(values.from);
  const [draftTo, setDraftTo] = useState(values.to);
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
    });
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid w-full max-w-40 gap-2">
          <Label htmlFor="customer-search-field" className={fieldLabel}>
            구분
          </Label>
          <Select
            value={draftField}
            onValueChange={(value) => {
              if (!isCustomerSearchField(value)) {
                return;
              }
              setDraftField(value);
              if (value === 'phone') {
                setDraftKeyword((current) => customerPhoneDigits(current));
              }
            }}
          >
            <SelectTrigger id="customer-search-field" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {searchFields.map((option) => (
                <SelectItem key={option} value={option}>
                  {customerSearchFieldLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid min-w-56 flex-1 gap-2">
          <Label htmlFor="customer-search-keyword" className={fieldLabel}>
            검색어
          </Label>
          <Input
            id="customer-search-keyword"
            value={draftKeyword}
            maxLength={MAX_CUSTOMER_KEYWORD_LENGTH}
            inputMode={draftField === 'phone' ? 'numeric' : undefined}
            placeholder={keywordPlaceholder(draftField)}
            onChange={(event) => {
              const nextValue = event.currentTarget.value.slice(0, MAX_CUSTOMER_KEYWORD_LENGTH);
              setDraftKeyword(draftField === 'phone' ? customerPhoneDigits(nextValue) : nextValue);
            }}
          />
        </div>
        <Button type="submit">검색</Button>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <CustomerNextContactField
            id="customer-search-from"
            label="등록일 시작"
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
            id="customer-search-to"
            label="등록일 종료"
            value={draftTo}
            invalid={rangeError !== ''}
            disabled={false}
            onChange={(value) => {
              setDraftTo(value);
              setRangeError('');
            }}
          />
        </div>
      </div>
      {rangeError !== '' ? (
        <p role="alert" className="text-sm text-destructive">
          {rangeError}
        </p>
      ) : null}
    </form>
  );
}
