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
import { caseSearchFieldLabels, isCaseSearchField } from '~/features/cases/type';
import { MAX_CUSTOMER_KEYWORD_LENGTH } from '~/features/customers/type';
import { fieldLabel } from '~/lib/styles';

import type { JSX, SubmitEvent } from 'react';
import type { CaseSearchField } from '~/features/cases/type';

type CaseSearchFormProps = {
  field: CaseSearchField;
  keyword: string;
  onSearch: (field: CaseSearchField, keyword: string) => void;
};

const searchFields = Object.keys(caseSearchFieldLabels) as CaseSearchField[];

function keywordPlaceholder(field: CaseSearchField): string {
  if (field === 'assignee') {
    return '담당 이름을 입력하세요';
  }
  return '고객 이름을 입력하세요';
}

export function CaseSearchForm({ field, keyword, onSearch }: CaseSearchFormProps): JSX.Element {
  const [draftField, setDraftField] = useState(field);
  const [draftKeyword, setDraftKeyword] = useState(keyword);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    onSearch(draftField, draftKeyword.trim());
  }

  return (
    <form className="flex flex-wrap items-end gap-3" onSubmit={handleSubmit}>
      <div className="grid w-full max-w-40 gap-2">
        <Label htmlFor="case-search-field" className={fieldLabel}>
          구분
        </Label>
        <Select
          value={draftField}
          onValueChange={(value) => {
            if (!isCaseSearchField(value)) {
              return;
            }
            setDraftField(value);
          }}
        >
          <SelectTrigger id="case-search-field" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {searchFields.map((option) => (
              <SelectItem key={option} value={option}>
                {caseSearchFieldLabels[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid min-w-56 flex-1 gap-2">
        <Label htmlFor="case-search-keyword" className={fieldLabel}>
          검색어
        </Label>
        <Input
          id="case-search-keyword"
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
