import { useState } from 'react';

import { Button } from '~/components/ui/button';
import { CustomerNextContactField } from '~/features/customers/components/CustomerNextContactField';

import type { JSX, SubmitEvent } from 'react';

type TodayPeriodFormProps = {
  from: string;
  to: string;
  onSearch: (from: string, to: string) => void;
};

const rangeErrorMessage = '시작일은 종료일보다 늦을 수 없습니다.';
const emptyErrorMessage = '조회 기간을 선택하세요.';

export function TodayPeriodForm({ from, to, onSearch }: TodayPeriodFormProps): JSX.Element {
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const [error, setError] = useState('');

  function handleSubmit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (draftFrom === '' || draftTo === '') {
      setError(emptyErrorMessage);
      return;
    }
    if (draftFrom > draftTo) {
      setError(rangeErrorMessage);
      return;
    }
    setError('');
    onSearch(draftFrom, draftTo);
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <CustomerNextContactField
            id="today-period-from"
            label="시작일"
            value={draftFrom}
            invalid={error !== ''}
            disabled={false}
            onChange={(value) => {
              setDraftFrom(value);
              setError('');
            }}
          />
        </div>
        <div className="w-44">
          <CustomerNextContactField
            id="today-period-to"
            label="종료일"
            value={draftTo}
            invalid={error !== ''}
            disabled={false}
            onChange={(value) => {
              setDraftTo(value);
              setError('');
            }}
          />
        </div>
        <Button type="submit">조회</Button>
      </div>
      {error !== '' ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
