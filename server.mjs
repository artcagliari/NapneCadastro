import express from 'express'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { isValidCep, isValidCpf, isValidEmail, isValidPhone, onlyDigits } from './src/validation.js'
import { createClient } from '@supabase/supabase-js'

const root = path.dirname(fileURLToPath(import.meta.url))
const envFile = path.join(root, '.env')
if (existsSync(envFile)) process.loadEnvFile(envFile)
const dataDir = path.join(root, 'data')
const recordsFile = path.join(dataDir, 'records.json')
const studentsFile = path.join(dataDir, 'students.json')
const port = Number(process.env.PORT || 5173)
const adminEmail = process.env.ADMIN_EMAIL || 'admin@napne.gov.br'
const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabaseEnabled = Boolean(supabaseUrl && supabaseAnonKey && supabaseServiceKey)
const supabaseOptions = { auth:{ persistSession:false, autoRefreshToken:false, detectSessionInUrl:false } }
const supabaseAdmin = supabaseEnabled ? createClient(supabaseUrl, supabaseServiceKey, supabaseOptions) : null
const supabaseAuth = supabaseEnabled ? createClient(supabaseUrl, supabaseAnonKey, supabaseOptions) : null
const sessions = new Map()

const seed = [
  { id:'NAP-2026-041',nome:'Mariana Alves da Silva',cpf:'482.***.***-09',cpfRaw:'48297136809',nascimento:'1990-06-14',email:'mariana.alves@escola.edu.br',telefone:'(61) 99842-1160',sexo:'Feminino',raca:'Parda',nacionalidade:'Brasileira',cidadeNascimento:'Goiânia',ufNascimento:'GO',cep:'70680-120',cidade:'Brasília',uf:'DF',zona:'Urbana',escolaridade:'Educação superior',curso:'Pedagogia',instituicao:'Universidade de Brasília',conclusao:'2014',pos:'Psicopedagogia',funcao:'Psicopedagogo(a)',carga:'40h',vinculo:'Concursado/efetivo/estável',cursos:['Educação especial','Educação em direitos humanos'],status:'Completo',criadoEm:'2026-08-29T10:20:00' },
  { id:'NAP-2026-040',nome:'Carlos Eduardo Mendes',cpf:'071.***.***-42',cpfRaw:'07158392442',nascimento:'1986-11-03',email:'carlos.mendes@escola.edu.br',telefone:'(61) 99120-0734',sexo:'Masculino',raca:'Preta',nacionalidade:'Brasileira',cidadeNascimento:'Brasília',ufNascimento:'DF',cep:'72015-300',cidade:'Brasília',uf:'DF',zona:'Urbana',escolaridade:'Educação superior',curso:'Letras — Libras',instituicao:'Universidade Federal de Santa Catarina',conclusao:'2018',pos:'',funcao:'Tradutor(a) e intérprete de Libras',carga:'20h',vinculo:'Contrato temporário',cursos:['Educação bilíngue de surdos'],status:'Completo',criadoEm:'2026-08-28T14:10:00' },
  { id:'NAP-2026-039',nome:'Renata Souza Lima',cpf:'193.***.***-11',cpfRaw:'19360472111',nascimento:'1995-02-20',email:'renata.lima@escola.edu.br',telefone:'(61) 98551-9042',sexo:'Feminino',raca:'Branca',nacionalidade:'Brasileira',cidadeNascimento:'Anápolis',ufNascimento:'GO',cep:'71020-025',cidade:'Brasília',uf:'DF',zona:'Urbana',escolaridade:'Ensino médio',curso:'Magistério',instituicao:'CED 02',conclusao:'2013',pos:'',funcao:'Profissional de apoio escolar',carga:'40h',vinculo:'Contrato terceirizado',cursos:['Educação especial'],status:'Pendente',criadoEm:'2026-08-26T08:45:00' },
  { id:'NAP-2026-038',nome:'João Pedro Nascimento',cpf:'625.***.***-70',cpfRaw:'62590481370',nascimento:'1992-09-08',email:'joao.nascimento@escola.edu.br',telefone:'(61) 99632-4418',sexo:'Masculino',raca:'Parda',nacionalidade:'Brasileira',cidadeNascimento:'Formosa',ufNascimento:'GO',cep:'72801-015',cidade:'Formosa',uf:'GO',zona:'Rural',escolaridade:'Educação superior',curso:'Psicologia',instituicao:'Centro Universitário de Brasília',conclusao:'2017',pos:'Psicopedagogia',funcao:'Psicopedagogo(a)',carga:'20h',vinculo:'Contrato CLT',cursos:['Educação especial','Gestão escolar'],status:'Completo',criadoEm:'2026-08-25T16:30:00' }
]

if (!supabaseEnabled) {
  await mkdir(dataDir, { recursive: true })
  if (!existsSync(recordsFile)) await writeFile(recordsFile, JSON.stringify(seed, null, 2))
  if (!existsSync(studentsFile)) await writeFile(studentsFile, '[]')
}
const readRecords = async () => {
  if (!supabaseAdmin) return JSON.parse(await readFile(recordsFile, 'utf8'))
  const { data, error } = await supabaseAdmin.from('profissionais').select('*').order('criado_em', { ascending:false })
  if (error) throw error
  return data.map(row => ({ ...row.dados, id:row.id, nome:row.nome, cpf:row.cpf, cpfRaw:row.cpf, email:row.email, telefone:row.telefone, status:row.status, criadoEm:row.criado_em }))
}
const saveRecords = async records => {
  if (!supabaseAdmin) return writeFile(recordsFile, JSON.stringify(records, null, 2))
  const rows = records.map(record => ({ id:record.id, nome:record.nome, cpf:record.cpfRaw || onlyDigits(record.cpf), email:record.email, telefone:onlyDigits(record.telefone), status:record.status, criado_em:record.criadoEm, dados:record }))
  const { error } = await supabaseAdmin.from('profissionais').upsert(rows, { onConflict:'id' })
  if (error) throw error
}
const readStudents = async () => {
  if (!supabaseAdmin) return JSON.parse(await readFile(studentsFile, 'utf8'))
  const { data, error } = await supabaseAdmin.from('alunos').select('*').order('criado_em', { ascending:false })
  if (error) throw error
  return data.map(row => ({ ...row.dados, id:row.id, codigoEscola:row.codigo_escola, cpf:row.cpf || '', nome:row.nome, turma:row.turma, criadoEm:row.criado_em }))
}
const saveStudents = async students => {
  if (!supabaseAdmin) return writeFile(studentsFile, JSON.stringify(students, null, 2))
  const rows = students.map(student => ({ id:student.id, codigo_escola:student.codigoEscola, cpf:student.cpf || null, nome:student.nome, turma:student.turma, criado_em:student.criadoEm, dados:student }))
  const { error } = await supabaseAdmin.from('alunos').upsert(rows, { onConflict:'id' })
  if (error) throw error
}
const cookies = req => Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(v => v.trim().split('=').map(decodeURIComponent)))
const authorized = async req => {
  const token = cookies(req).napne_session
  if (!token) return false
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    return !error && data.user?.email?.trim().toLowerCase() === adminEmail.trim().toLowerCase()
  }
  const session = sessions.get(token)
  return Boolean(session && session.expires > Date.now())
}
const passwordMatches = candidate => {
  const salt = 'conecta-napne-admin'
  return timingSafeEqual(scryptSync(candidate, salt, 32), scryptSync(adminPassword, salt, 32))
}
const authenticateAdmin = async (email, password) => {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (normalizedEmail !== adminEmail.trim().toLowerCase()) return null
  if (!supabaseAuth) return passwordMatches(password) ? { token:null } : null
  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email:normalizedEmail, password })
  if (error || data.user?.email?.toLowerCase() !== normalizedEmail) return null
  return { token:data.session?.access_token || null }
}

if (supabaseAdmin) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page:1, perPage:1000 })
  if (error) throw new Error(`Não foi possível consultar usuários no Supabase: ${error.message}`)
  if (!data.users.some(user => user.email === adminEmail)) {
    const { error:createError } = await supabaseAdmin.auth.admin.createUser({ email:adminEmail, password:adminPassword, email_confirm:true })
    if (createError) throw new Error(`Não foi possível criar o administrador no Supabase: ${createError.message}`)
  }
}

const app = express()
app.use(express.json({ limit: '200kb' }))
app.use((req,res,next) => { res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('X-Frame-Options','DENY'); res.setHeader('Referrer-Policy','same-origin'); next() })

app.post('/api/cadastros', async (req,res) => {
  const required = ['nome','cpf','nascimento','email','telefone','sexo','raca','cep','cidade','uf','zona','escolaridade','funcao','carga','vinculo']
  if (required.some(key => !String(req.body[key] || '').trim()) || req.body.consentimento !== true) return res.status(400).json({ error:'Preencha todos os campos obrigatórios.' })
  if (req.body.raca === 'Indígena' && !String(req.body.povoIndigena || '').trim()) return res.status(400).json({ error:'Informe o povo ou tribo indígena.' })
  if (req.body.escolaridade === 'Educação superior' && !String(req.body.cursosSuperiores?.[0]?.curso || req.body.curso || '').trim()) return res.status(400).json({ error:'Informe ao menos um curso superior.' })
  if (req.body.ifa === 'Sim' && !String(req.body.areaIfa || '').trim()) return res.status(400).json({ error:'Informe a área do IFA.' })
  if (req.body.iftp === 'Sim' && !String(req.body.areaIftp || '').trim()) return res.status(400).json({ error:'Informe a área do IFTP.' })
  if (!isValidCpf(req.body.cpf)) return res.status(400).json({ error:'Informe um CPF válido, usando apenas números.' })
  if (!isValidEmail(req.body.email)) return res.status(400).json({ error:'Informe um e-mail válido.' })
  if (!isValidPhone(req.body.telefone)) return res.status(400).json({ error:'Informe um celular válido com DDD.' })
  if (!isValidCep(req.body.cep) || !/^[A-Za-z]{2}$/.test(req.body.uf)) return res.status(400).json({ error:'Informe um CEP e uma UF válidos.' })
  if (Number.isNaN(Date.parse(req.body.nascimento)) || new Date(req.body.nascimento) >= new Date()) return res.status(400).json({ error:'Informe uma data de nascimento válida.' })
  const records = await readRecords()
  const digits = onlyDigits(req.body.cpf)
  if (records.some(r => r.cpfRaw === digits)) return res.status(409).json({ error:'Já existe um cadastro para este CPF.' })
  const max = Math.max(41, ...records.map(r => Number(r.id?.split('-').pop()) || 0))
  const clean = { ...req.body, cursosSuperiores:(req.body.cursosSuperiores||[]).filter(item=>item?.curso?.trim()), formacoesPedagogicas:(req.body.formacoesPedagogicas||[]).filter(item=>item?.curso?.trim()), posGraduacoes:(req.body.posGraduacoes||[]).filter(item=>item?.curso?.trim()), outrosCursos:(req.body.outrosCursos||[]).filter(item=>String(item).trim()) }
  const record = { ...clean, id:`NAP-2026-${String(max + 1).padStart(3,'0')}`, cpfRaw:digits, cpf:digits, telefone:onlyDigits(req.body.telefone), email:String(req.body.email).trim().toLowerCase(), status:'Completo', criadoEm:new Date().toISOString() }
  records.unshift(record)
  await saveRecords(records)
  res.status(201).json(record)
})

app.post('/api/admin/login', async (req,res) => {
  const authentication = await authenticateAdmin(req.body.email, String(req.body.password || ''))
  if (!authentication) return res.status(401).json({ error:'E-mail ou senha incorretos.' })
  const token = authentication.token || randomBytes(32).toString('hex')
  if (!authentication.token) sessions.set(token, { expires:Date.now() + 8 * 60 * 60 * 1000 })
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https'
  res.setHeader('Set-Cookie', `napne_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800${secure?'; Secure':''}`)
  res.json({ ok:true })
})
app.get('/api/admin/session', async (req,res) => res.json({ authenticated:await authorized(req) }))
app.post('/api/admin/logout', (req,res) => { sessions.delete(cookies(req).napne_session); res.setHeader('Set-Cookie','napne_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); res.json({ok:true}) })
app.get('/api/admin/cadastros', async (req,res) => await authorized(req) ? res.json(await readRecords()) : res.status(401).json({error:'Não autorizado.'}))

app.get('/api/admin/alunos', async (req,res) => await authorized(req) ? res.json(await readStudents()) : res.status(401).json({error:'Não autorizado.'}))
app.post('/api/admin/alunos', async (req,res) => {
  if (!await authorized(req)) return res.status(401).json({ error:'Não autorizado.' })
  const required = ['codigoEscola','nome','nascimento','sexo','raca','nacionalidade','paisResidencia','ufResidencia','municipioResidencia','zona','turma','etapa']
  if (required.some(key => !String(req.body[key] || '').trim())) return res.status(400).json({ error:'Preencha todos os campos obrigatórios do aluno.' })
  if (req.body.cpf && !isValidCpf(req.body.cpf)) return res.status(400).json({ error:'Informe um CPF válido, usando apenas números.' })
  if (req.body.cep && !isValidCep(req.body.cep)) return res.status(400).json({ error:'Informe um CEP válido.' })
  if (!/^[A-Za-z]{2}$/.test(req.body.ufResidencia)) return res.status(400).json({ error:'Informe uma UF de residência válida.' })
  if (Number.isNaN(Date.parse(req.body.nascimento)) || new Date(req.body.nascimento) >= new Date()) return res.status(400).json({ error:'Informe uma data de nascimento válida.' })
  if (req.body.raca === 'Indígena' && !String(req.body.povoIndigena || '').trim()) return res.status(400).json({ error:'Informe o código do povo indígena.' })
  if (req.body.nacionalidade === 'Estrangeira' && !String(req.body.paisNacionalidade || '').trim()) return res.status(400).json({ error:'Informe o país da nacionalidade.' })
  if (req.body.deficiencia === 'Sim' && !(req.body.tiposDeficiencia || []).length) return res.status(400).json({ error:'Selecione ao menos uma deficiência, transtorno ou habilidade.' })
  if (req.body.transtornoAprendizagem === 'Sim' && !(req.body.tiposTranstorno || []).length) return res.status(400).json({ error:'Selecione ao menos um transtorno de aprendizagem.' })
  if (req.body.recursos === 'Sim' && !(req.body.tiposRecursos || []).length) return res.status(400).json({ error:'Selecione ao menos um recurso necessário.' })
  if (req.body.transporte === 'Utiliza' && (!req.body.responsavelTransporte || !(req.body.veiculos || []).length)) return res.status(400).json({ error:'Informe o responsável e o veículo do transporte escolar.' })
  const students = await readStudents()
  const cpf = onlyDigits(req.body.cpf)
  if (cpf && students.some(student => student.cpf === cpf)) return res.status(409).json({ error:'Já existe um aluno cadastrado com este CPF.' })
  const max = Math.max(0, ...students.map(student => Number(student.id?.split('-').pop()) || 0))
  const student = { ...req.body, cpf, id:`ALU-2026-${String(max + 1).padStart(3,'0')}`, criadoEm:new Date().toISOString() }
  students.unshift(student)
  await saveStudents(students)
  res.status(201).json(student)
})

if (!process.env.VERCEL) {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(root, 'dist')))
    app.get('*path', (_,res) => res.sendFile(path.join(root, 'dist', 'index.html')))
  } else {
    const { createServer } = await import('vite')
    const vite = await createServer({ server:{ middlewareMode:true }, appType:'spa' })
    app.use(vite.middlewares)
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Conecta NAPNE disponível em http://localhost:${port}`)
    console.log(`Persistência: ${supabaseEnabled ? 'Supabase' : 'arquivos locais (configure SUPABASE_SERVICE_ROLE_KEY para ativar o Supabase)'}`)
  })
}

export default app
