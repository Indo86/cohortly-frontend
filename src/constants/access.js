// Workspace entitlement states, exactly as the backend reports them.
// Only ACTIVE unlocks product functionality; the backend is authoritative and
// the frontend never derives a state, it only displays and routes on it.
export const Access = Object.freeze({
  NONE: 'NONE',
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED',
})

const KNOWN = new Set(Object.values(Access))

// Unknown or missing values are treated as NONE (not active).
export const normalizeAccess = (value) => (KNOWN.has(value) ? value : Access.NONE)

export const ACCESS_LABELS = Object.freeze({
  [Access.NONE]: 'Not activated',
  [Access.PENDING]: 'Payment pending',
  [Access.ACTIVE]: 'Active',
  [Access.FAILED]: 'Payment failed',
  [Access.EXPIRED]: 'Expired',
})

// Badge tone per state (see AppBadge).
export const ACCESS_TONES = Object.freeze({
  [Access.NONE]: 'neutral',
  [Access.PENDING]: 'warning',
  [Access.ACTIVE]: 'success',
  [Access.FAILED]: 'danger',
  [Access.EXPIRED]: 'danger',
})

// Students only learn whether their organization's workspace is usable. Payment wording
// (pending, failed, expired) is the instructor's business and is not shown to them.
export const workspaceLabel = (status) => (status === Access.ACTIVE ? 'Active' : 'Inactive')
export const workspaceTone = (status) => (status === Access.ACTIVE ? 'success' : 'warning')

// Backend error codes that mean "authenticated, but the workspace is not active".
export const EntitlementCodes = Object.freeze({
  INSTRUCTOR: 'ACCESS_NOT_ACTIVE',
  STUDENT: 'WORKSPACE_ACCESS_INACTIVE',
})
