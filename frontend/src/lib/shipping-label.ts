function normalizeDistance(distanceKm: number): number {
  return Math.max(0, Math.round(distanceKm * 10) / 10)
}

export function formatShippingDistance(distanceKm: number | null | undefined): string | null {
  if (distanceKm == null) return null
  const distance = normalizeDistance(distanceKm)
  if (distance <= 0.5 || Math.round(distance) === 0) return 'nội thành'
  return `~${distance.toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km`
}

export function formatShippingScope(
  provinceName: string | null | undefined,
  distanceKm: number | null | undefined,
): string | null {
  const province = provinceName?.trim()
  const distance = formatShippingDistance(distanceKm)

  if (province && distance) return `${province} · ${distance}`
  if (province) return province
  return distance
}
