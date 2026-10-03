import { describe, expect, it } from 'vitest'
import { Access, normalizeAccess } from '@/constants/access.js'
import { Roles, normalizeRole } from '@/constants/roles.js'

describe('role normalization (the only place that knows the backend role values)', () => {
  it('maps the backend "manager" to INSTRUCTOR', () => {
    expect(normalizeRole('manager')).toBe(Roles.INSTRUCTOR)
  })

  it('maps "student" to STUDENT', () => {
    expect(normalizeRole('student')).toBe(Roles.STUDENT)
  })

  it('fails closed on anything unknown', () => {
    for (const value of ['admin', 'MANAGER', 'instructor', '', null, undefined, 42]) {
      expect(normalizeRole(value)).toBeNull()
    }
  })
})

describe('access normalization', () => {
  it('keeps the five backend states', () => {
    for (const state of ['NONE', 'PENDING', 'ACTIVE', 'FAILED', 'EXPIRED']) {
      expect(normalizeAccess(state)).toBe(state)
    }
  })

  it('treats unknown or missing values as NONE, never as ACTIVE', () => {
    for (const value of ['active', 'TRIAL', '', null, undefined]) {
      expect(normalizeAccess(value)).toBe(Access.NONE)
    }
  })
})
