export function requiredServerEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} 환경 변수가 설정되지 않았습니다.`);
  }
  return value;
}
