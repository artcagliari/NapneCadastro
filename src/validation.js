export const onlyDigits = value => String(value ?? '').replace(/\D/g, '')

export function formatCpf(value) {
  const digits = onlyDigits(value).slice(0, 11)
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

export function formatPhone(value) {
  const digits = onlyDigits(value).slice(0, 11)
  if (!digits) return ''
  if (digits.length < 3) return `(${digits}`
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

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
