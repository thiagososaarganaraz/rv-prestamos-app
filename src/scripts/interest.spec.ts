import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calculateLoanAmounts, isValidInterestRate, validateInterestRate } from '../lib/interest.ts'

test('tasas explícitas, finitas y con hasta dos decimales', () => {
  for (const rate of [0, 20, 20.25, 100, 150, 0.29]) {
    assert.equal(isValidInterestRate(rate), true)
    assert.doesNotThrow(() => validateInterestRate(rate))
  }
  for (const rate of [undefined, null, '', '20', -1, NaN, Infinity, -Infinity, 0.001, 20.255]) {
    assert.equal(isValidInterestRate(rate), false)
    assert.throws(() => validateInterestRate(rate))
  }
})

test('interés único, cero y tasas superiores al 100%', () => {
  assert.deepEqual(calculateLoanAmounts({ monto: 10000, tasa_interes: 20 }), { interest: 2000, total: 12000 })
  assert.deepEqual(calculateLoanAmounts({ monto: 10000, tasa_interes: 0 }), { interest: 0, total: 10000 })
  assert.deepEqual(calculateLoanAmounts({ monto: 10000, tasa_interes: 150 }), { interest: 15000, total: 25000 })
})

test('redondeo por préstamo a centavos antes de sumar', () => {
  const first = calculateLoanAmounts({ monto: 1, tasa_interes: 0.5 })
  const second = calculateLoanAmounts({ monto: 1, tasa_interes: 1.5 })
  assert.deepEqual(first, { interest: 0.01, total: 1.01 })
  assert.deepEqual(second, { interest: 0.02, total: 1.02 })
  assert.equal(first.interest + second.interest, 0.03)
  assert.deepEqual(calculateLoanAmounts({ monto: 10.05, tasa_interes: 10 }), { interest: 1.01, total: 11.06 })
})

test('cada préstamo conserva su tasa aunque cambie la configuración', () => {
  const loans = [{ monto: 10000, tasa_interes: 20 }, { monto: 10000, tasa_interes: 30 }]
  assert.equal(loans.reduce((sum, loan) => sum + calculateLoanAmounts(loan).interest, 0), 5000)
  assert.equal(loans.reduce((sum, loan) => sum + calculateLoanAmounts(loan).total, 0), 25000)
  loans[0].tasa_interes = 25
  assert.equal(loans.reduce((sum, loan) => sum + calculateLoanAmounts(loan).interest, 0), 5500)
})
