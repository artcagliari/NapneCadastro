export const onlyDigits = value => String(value ?? '').replace(/\D/g, '')

export function isValidCpf(value) {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
  const digit = size => {
    let sum = 0
    for (let i = 0; i < size; i += 1) sum += Number(cpf[i]) * (size + 1 - i)
    const result = (sum * 10) % 11
    return result === 10 ? 0 : result
  }
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10])
}

export function isValidEmail(value) {
  const email = String(value ?? '').trim()
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)
}

export function isValidPhone(value) {
  const phone = onlyDigits(value)
  if (!/^\d{11}$/.test(phone) || /^0/.test(phone) || /^(\d)\1+$/.test(phone)) return false
  const ddd = Number(phone.slice(0, 2))
  return ddd >= 11 && ddd <= 99 && phone[2] === '9'
}

export const isValidCep = value => /^\d{8}$/.test(onlyDigits(value))
