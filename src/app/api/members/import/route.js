import { NextResponse } from 'next/server'
import { withAuth }     from '@/lib/apiAuth'
import { MAX_IMPORT_ROWS, cleanMemberRow, planImport } from '@/lib/memberImport'

export const maxDuration = 60

const PAGE = 1000

/**
 * POST /api/members/import
 * Body: { members: [{ name, phone?, address?, birthday? }], groupId? }
 *
 * - Up to 500 rows per request (the client sends larger files in chunks).
 * - Target group is resolved once: `groupId` if it belongs to this church,
 *   otherwise the church's first non-"First Timers" group.
 * - Rows already in the church (same phone, or same name when there is no phone)
 *   are NOT re-created; they are attached to the target group if they are not in it.
 * - All new members go in with a single INSERT.
 *
 * Response: { created, duplicates, attached, invalid, members: [...] }
 *   `members` = created + newly-attached rows, ready to merge into UI state.
 */
export const POST = withAuth(async (request, { church, admin }) => {
  const body = await request.json().catch(() => ({}))
  const incoming = body.members

  if (!Array.isArray(incoming) || incoming.length === 0) {
    return NextResponse.json({ error: 'No members provided' }, { status: 400 })
  }
  if (incoming.length > MAX_IMPORT_ROWS) {
    return NextResponse.json({ error: `Send at most ${MAX_IMPORT_ROWS} members per request` }, { status: 400 })
  }

  // ── Resolve target group (once) ───────────────────────────────────────────
  let groupId = null
  if (body.groupId) {
    const { data: g } = await admin.from('groups').select('id')
      .eq('id', String(body.groupId)).eq('church_id', church.id).maybeSingle()
    if (!g) return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    groupId = g.id
  } else {
    const { data: g } = await admin.from('groups').select('id')
      .eq('church_id', church.id).neq('name', 'First Timers')
      .order('created_at', { ascending: true }).limit(1).maybeSingle()
    groupId = g?.id ?? null
  }

  // ── Clean rows ────────────────────────────────────────────────────────────
  const cleaned = []
  let invalid = 0
  for (const r of incoming) {
    const c = cleanMemberRow(r)
    if (c) cleaned.push(c); else invalid++
  }
  if (cleaned.length === 0) {
    return NextResponse.json({ created: 0, duplicates: 0, attached: 0, invalid, members: [] })
  }

  // ── Existing members (for duplicate detection) ────────────────────────────
  const existing = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin.from('members')
      .select('id, name, phone, groupIds')
      .eq('church_id', church.id)
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) {
      console.error('[members/import] load existing', error.code, error.message)
      return NextResponse.json({ error: 'Could not check existing members' }, { status: 500 })
    }
    existing.push(...(data ?? []))
    if ((data?.length ?? 0) < PAGE) break
  }

  const { create, duplicates, inFile } = planImport(cleaned, existing)

  // ── One INSERT for every new member ───────────────────────────────────────
  let createdRows = []
  if (create.length) {
    const { data, error } = await admin.from('members')
      .insert(create.map(r => ({
        church_id: church.id,
        name:      r.name,
        phone:     r.phone,
        address:   r.address,
        birthday:  r.birthday,
        groupIds:  groupId ? [groupId] : [],
        status:    'active',
      })))
      .select()
    if (error) {
      console.error('[members/import] insert', error.code, error.message)
      return NextResponse.json({ error: 'Import failed. Nothing was saved for this batch.' }, { status: 500 })
    }
    createdRows = data ?? []
  }

  // ── Attach already-existing members to the target group ──────────────────
  const toAttach = groupId
    ? duplicates.map(d => d.existing).filter(m => !(m.groupIds ?? []).includes(groupId))
    : []
  const attachedRows = []
  for (let i = 0; i < toAttach.length; i += 25) {
    const results = await Promise.all(toAttach.slice(i, i + 25).map(m =>
      admin.from('members')
        .update({ groupIds: [...new Set([...(m.groupIds ?? []), groupId])] })
        .eq('id', m.id).eq('church_id', church.id)
        .select().single()
    ))
    for (const r of results) if (!r.error && r.data) attachedRows.push(r.data)
  }

  return NextResponse.json({
    created:    createdRows.length,
    duplicates: duplicates.length + inFile,
    attached:   attachedRows.length,
    invalid,
    members:    [...createdRows, ...attachedRows],
  })
})
