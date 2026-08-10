export const currency = (cents: number) =>
  new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    maximumFractionDigits: 0,
  }).format(cents / 100)

export const shortDate = (value: string | Date | null) => {
  if (!value) return 'Sin fecha'
  return new Intl.DateTimeFormat('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}
