// Wave F21.B — IpAllowlistPanel vitest.
// Empty state + populated table render, tenant switching ve sil aksiyonu.

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IpAllowlistPanel } from '@/components/security/IpAllowlistPanel'
import { addAllowEntry, resetAllowlistForTests } from '@/lib/ip-allowlist'
import { TENANTS } from '@landx/data'

const TENANT_A = TENANTS[0]
const TENANT_B = TENANTS[1]

describe('IpAllowlistPanel', () => {
  beforeEach(() => {
    resetAllowlistForTests()
  })

  afterEach(() => {
    cleanup()
    resetAllowlistForTests()
  })

  it('renders empty state when tenant has no CIDR entries', () => {
    render(<IpAllowlistPanel initialTenantId={TENANT_A.id} />)
    expect(screen.getByTestId('ip-allowlist-empty')).toBeInTheDocument()
    expect(screen.queryAllByTestId('ip-allowlist-row')).toHaveLength(0)
  })

  it('renders entries for the active tenant only', () => {
    addAllowEntry({
      tenantId: TENANT_A.id,
      cidr: '10.0.0.0/24',
      label: 'Ofis',
      createdBy: 'ops@arsam',
    })
    addAllowEntry({
      tenantId: TENANT_B.id,
      cidr: '192.168.0.0/16',
      createdBy: 'ops@arsam',
    })

    render(<IpAllowlistPanel initialTenantId={TENANT_A.id} />)
    const rows = screen.getAllByTestId('ip-allowlist-row')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('10.0.0.0/24')
    expect(rows[0]).toHaveTextContent('Ofis')
  })

  it('switches tenant via the select and re-derives entries', () => {
    addAllowEntry({
      tenantId: TENANT_B.id,
      cidr: '192.168.1.0/24',
      createdBy: 'ops@arsam',
    })

    render(<IpAllowlistPanel initialTenantId={TENANT_A.id} />)
    expect(screen.getByTestId('ip-allowlist-empty')).toBeInTheDocument()

    fireEvent.change(screen.getByTestId('ip-allowlist-tenant-select'), {
      target: { value: TENANT_B.id },
    })
    expect(screen.getAllByTestId('ip-allowlist-row')).toHaveLength(1)
  })

  it('removes an entry via the row sil button', () => {
    addAllowEntry({
      tenantId: TENANT_A.id,
      cidr: '10.0.0.0/24',
      createdBy: 'ops@arsam',
    })
    render(<IpAllowlistPanel initialTenantId={TENANT_A.id} />)
    expect(screen.getAllByTestId('ip-allowlist-row')).toHaveLength(1)
    fireEvent.click(screen.getByTestId('ip-allowlist-remove'))
    expect(screen.queryAllByTestId('ip-allowlist-row')).toHaveLength(0)
    expect(screen.getByTestId('ip-allowlist-empty')).toBeInTheDocument()
  })
})
