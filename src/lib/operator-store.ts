/**
 * Wave F21.0 — Operator (super-admin user) CRUD store.
 *
 * Seeded from the F11 ROLES mock (each role's `members[]` list flattened
 * into Operator records). All persistence is local — `arsam.platform-
 * operators.v1` localStorage key — until the real backend ships.
 */

import { ROLES, type RoleDef } from '@landx/data'

export type OperatorRoleId = RoleDef['id']
export type OperatorStatus = 'active' | 'invited' | 'suspended'

export interface Operator {
  id: string
  email: string
  name: string
  roleId: OperatorRoleId
  status: OperatorStatus
  lastLoginISO?: string
  createdISO: string
  twofaEnrolled: boolean
}

export const OPERATORS_STORAGE_KEY = 'arsam.platform-operators.v1'

function nameFromEmail(email: string): string {
  const local = email.split('@')[0] ?? email
  return local
    .replace(/[._-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(' ')
}

function newId(): string {
  return `op_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function seedFromRoles(): Operator[] {
  const out: Operator[] = []
  const now = Date.now()
  for (const role of ROLES) {
    for (let i = 0; i < role.members.length; i++) {
      const m = role.members[i]
      out.push({
        id: `op_seed_${role.id}_${i}`,
        email: m.email,
        name: nameFromEmail(m.email),
        roleId: role.id,
        status: 'active',
        lastLoginISO: m.lastActiveISO,
        createdISO: new Date(now - (i + 1) * 86_400_000 * 30).toISOString(),
        twofaEnrolled: (i + role.id.length) % 3 !== 0,
      })
    }
  }
  return out
}

function readStore(): Operator[] | null {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(OPERATORS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Operator[]) : null
  } catch {
    return null
  }
}

function writeStore(operators: Operator[]): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(OPERATORS_STORAGE_KEY, JSON.stringify(operators))
  } catch {
    /* ignore quota */
  }
}

export function getOperators(): Operator[] {
  const stored = readStore()
  if (stored !== null) return stored
  const seeded = seedFromRoles()
  writeStore(seeded)
  return seeded
}

export function getOperator(id: string): Operator | null {
  return getOperators().find((o) => o.id === id) ?? null
}

export interface CreateOperatorInput {
  email: string
  name?: string
  roleId: OperatorRoleId
}

export function createOperator(input: CreateOperatorInput): Operator {
  const operators = getOperators()
  if (operators.some((o) => o.email.toLowerCase() === input.email.toLowerCase())) {
    throw new Error('Bu e-posta zaten kayıtlı')
  }
  const operator: Operator = {
    id: newId(),
    email: input.email,
    name: input.name?.trim() || nameFromEmail(input.email),
    roleId: input.roleId,
    status: 'invited',
    createdISO: new Date().toISOString(),
    twofaEnrolled: false,
  }
  operators.push(operator)
  writeStore(operators)
  return operator
}

export function updateOperator(id: string, patch: Partial<Omit<Operator, 'id' | 'createdISO'>>): Operator | null {
  const operators = getOperators()
  const idx = operators.findIndex((o) => o.id === id)
  if (idx < 0) return null
  const next: Operator = { ...operators[idx], ...patch }
  operators[idx] = next
  writeStore(operators)
  return next
}

export function suspendOperator(id: string): Operator | null {
  return updateOperator(id, { status: 'suspended' })
}

export function reactivateOperator(id: string): Operator | null {
  return updateOperator(id, { status: 'active' })
}

export function deleteOperator(id: string): void {
  const operators = getOperators().filter((o) => o.id !== id)
  writeStore(operators)
}

export function resendInvite(id: string): Operator | null {
  const operators = getOperators()
  const idx = operators.findIndex((o) => o.id === id)
  if (idx < 0) return null
  if (operators[idx].status !== 'invited') return operators[idx]
  const next: Operator = { ...operators[idx], createdISO: new Date().toISOString() }
  operators[idx] = next
  writeStore(operators)
  return next
}

export function resetOperatorsForTests(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(OPERATORS_STORAGE_KEY)
}

export function getRoleLabel(id: OperatorRoleId): string {
  return ROLES.find((r) => r.id === id)?.name ?? id
}

export function get2faCoverage(): { enrolled: number; missing: number; rate: number } {
  const ops = getOperators()
  const enrolled = ops.filter((o) => o.twofaEnrolled).length
  const missing = ops.length - enrolled
  const rate = ops.length === 0 ? 0 : Math.round((enrolled / ops.length) * 1000) / 10
  return { enrolled, missing, rate }
}
