/** Porcentaje explícito, finito, no negativo y con hasta dos decimales. */
export function isValidInterestRate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    && Number(value.toFixed(2)) === value
}

export function validateInterestRate(value: unknown): asserts value is number {
  if (!isValidInterestRate(value)) {
    throw new Error('La tasa de interés es obligatoria y debe ser un número no negativo con hasta dos decimales.')
  }
}

export function calculateLoanAmounts(loan: { monto: number; tasa_interes: number }) {
  // Redondear una sola vez el interés de cada préstamo antes de sumarlo.
  const rawInterest = loan.monto * (loan.tasa_interes / 100)
  const interest = Math.round((rawInterest + Number.EPSILON * rawInterest) * 100) / 100
  const total = Math.round((loan.monto + interest) * 100) / 100
  return { interest, total }
}

export function formatLoanCurrency(amount: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(amount)
}
