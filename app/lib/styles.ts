/** 키보드 focus 표시. ring은 --ring(= primary)을 투명도 없이 사용해 3:1 이상 대비를 유지한다. */
export const focusRing =
  'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** aria-invalid="true"일 때의 오류 표시. */
export const invalidState =
  'aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive';

/** 섹션 설명. 필드 라벨보다 작고 옅다. */
export const sectionDescription = 'text-xs leading-5 font-normal text-muted-foreground/65';

/** 폼 라벨. 값보다 옅고 가는 글씨로 구분한다. */
export const fieldLabel = 'text-sm leading-none font-normal text-muted-foreground';

/** 읽기 전용 필드 값. 라벨보다 진하고 굵다. */
export const fieldValue = 'text-sm font-medium text-foreground';

/** Input, Textarea, Select 트리거가 공유하는 입력 필드 외형과 상태. */
export const fieldBase = [
  'w-full min-w-0 rounded-lg border border-input bg-background text-base text-foreground transition-colors duration-150 md:text-sm',
  'placeholder:text-muted-foreground',
  'hover:border-muted-foreground focus-visible:border-ring',
  'read-only:bg-muted',
  'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50 disabled:hover:border-input',
  'dark:bg-input/30',
  focusRing,
  invalidState,
].join(' ');
