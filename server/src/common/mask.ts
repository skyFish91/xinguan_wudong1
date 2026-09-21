/** 敏感信息脱敏（需求书 12.2 安全需求） */

/** 手机号脱敏：138****0001 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) {
    return phone || '';
  }
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

/** 身份证脱敏：5226**********1234 */
export function maskIdCard(idCard: string): string {
  if (!idCard || idCard.length < 8) {
    return idCard || '';
  }
  return idCard.slice(0, 4) + '**********' + idCard.slice(-4);
}
