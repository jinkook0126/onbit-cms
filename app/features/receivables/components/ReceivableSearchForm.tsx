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
import { MAX_CUSTOMER_KEYWORD_LENGTH } from '~/features/customers/type';
import { isReceivableSearchField, receivableSearchFieldLabels } from '~/features/receivables/type';
import { fieldLabel } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { ReceivableSearchField } from '~/features/receivables/type';

type ReceivableSearchFormProps = {
  field: ReceivableSearchField;
  keyword: string;
  onSearch: (field: ReceivableSearchField, keyword: string) => void;
};

const searchFields = Object.keys(receivableSearchFieldLabels) as ReceivableSearchField[];

function keywordPlaceholder(field: ReceivableSearchField): string {
  if (field === 'assignee') {
    return '담당 이름을 입력하세요';
  }
  return '고객 이름을 입력하세요';
}

export function ReceivableSearchForm({
  field,
  keyword,
  onSearch,
}: ReceivableSearchFormProps): JSX.Element {
  const [draftField, setDraftField] = useState(field);
  const [draftKeyword, setDraftKeyword] = useState(keyword);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSearch(draftField, draftKeyword.trim());
  }

  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={handleSubmit}>
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
      <Button type="submit">검색</Button>
    </form>
  );
}
