export type OutlierLevel = 'normal' | 'notable' | 'viral';

export function getOutlierLevel(index: number): OutlierLevel {
  if (index > 3.0) return 'viral';
  if (index >= 1.5) return 'notable';
  return 'normal';
}

export function getOutlierLabel(index: number): string {
  const level = getOutlierLevel(index);
  if (level === 'viral') return `异常爆款 ${index.toFixed(1)}x`;
  if (level === 'notable') return `值得注意 ${index.toFixed(1)}x`;
  return `常规表现 ${index.toFixed(1)}x`;
}

export function getOutlierBadgeTone(index: number): 'red' | 'orange' | 'gray' {
  const level = getOutlierLevel(index);
  if (level === 'viral') return 'red';
  if (level === 'notable') return 'orange';
  return 'gray';
}
