// Pure helper cho /account-deleted page — tính số ngày còn lại trước khi
// account bị xóa vĩnh viễn (sau scheduled_purge_at).
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function computeDaysRemaining(
  scheduledPurgeAt: string | null,
): number {
  if (!scheduledPurgeAt) return 0;
  const target = new Date(scheduledPurgeAt).getTime();
  if (Number.isNaN(target)) return 0;
  const diff = target - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / MS_PER_DAY);
}