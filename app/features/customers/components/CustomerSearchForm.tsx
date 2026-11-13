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
import {
  MAX_CUSTOMER_KEYWORD_LENGTH,
  customerPhoneDigits,
  customerSearchFieldLabels,
  isCustomerSearchField,
} from '~/features/customers/type';
import { fieldLabel } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { CustomerSearchField } from '~/features/customers/type';

type CustomerSearchFormProps = {
  field: CustomerSearchField;
  keyword: string;
  onSearch: (field: CustomerSearchField, keyword: string) => void;
};

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

export function CustomerSearchForm({
  field,
  keyword,
  onSearch,
}: CustomerSearchFormProps): JSX.Element {
  const [draftField, setDraftField] = useState(field);
  const [draftKeyword, setDraftKeyword] = useState(keyword);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSearch(draftField, draftKeyword.trim());
  }

  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={handleSubmit}>
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
    </form>
  );
}
