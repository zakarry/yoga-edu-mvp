export function hasProYogaQualification(status: string): boolean {
  return ['プロYoga検定取得', 'Professional Yoga取得', '取得済み'].includes(status.trim());
}
