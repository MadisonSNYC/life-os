'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { v4 as uuidv4 } from 'uuid'

// ============================================
// SPACES
// ============================================

export async function getSpaces() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .eq('owner_id', user.id)
    .order('position')

  if (error) throw error
  return data
}

export async function createSpace(formData: { name: string; emoji: string; color: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: existing } = await supabase
    .from('spaces')
    .select('position')
    .eq('owner_id', user.id)
    .order('position', { ascending: false })
    .limit(1)

  const nextPos = existing && existing.length > 0 ? existing[0].position + 1 : 0

  const { error } = await supabase.from('spaces').insert({
    owner_id: user.id,
    name: formData.name,
    emoji: formData.emoji,
    color: formData.color,
    position: nextPos,
  })

  if (error) throw error
  revalidatePath('/dashboard')
}

export async function updateSpace(id: string, updates: { name?: string; emoji?: string; color?: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('spaces').update(updates).eq('id', id)
  if (error) throw error
  revalidatePath('/dashboard')
}

export async function deleteSpace(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('spaces').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/dashboard')
}

// ============================================
// PROJECTS
// ============================================

export async function getProjects(spaceId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  let query = supabase
    .from('projects')
    .select('*, space:spaces(*)')
    .order('position')

  if (spaceId) {
    query = query.eq('space_id', spaceId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getAllProjects() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get own projects
  const { data: ownProjects, error: ownError } = await supabase
    .from('projects')
    .select('*, space:spaces(*)')
    .eq('owner_id', user.id)
    .order('position')

  if (ownError) throw ownError

  // Get shared projects
  const { data: shares, error: shareError } = await supabase
    .from('project_shares')
    .select('*, project:projects(*, space:spaces(*))')
    .eq('invited_user_id', user.id)
    .eq('accepted', true)

  if (shareError) throw shareError

  const sharedProjects = shares?.map(s => s.project).filter(Boolean) || []

  return { ownProjects: ownProjects || [], sharedProjects }
}

export async function getProject(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select('*, space:spaces(*)')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createProject(formData: {
  space_id: string
  name: string
  emoji: string
  type: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: existing } = await supabase
    .from('projects')
    .select('position')
    .eq('space_id', formData.space_id)
    .order('position', { ascending: false })
    .limit(1)

  const nextPos = existing && existing.length > 0 ? existing[0].position + 1 : 0

  const { data, error } = await supabase.from('projects').insert({
    space_id: formData.space_id,
    owner_id: user.id,
    name: formData.name,
    emoji: formData.emoji,
    type: formData.type,
    position: nextPos,
  }).select().single()

  if (error) throw error
  revalidatePath('/dashboard')
  return data
}

export async function updateProject(id: string, updates: { name?: string; emoji?: string; type?: string }) {
  const supabase = await createClient()
  const { error } = await supabase.from('projects').update(updates).eq('id', id)
  if (error) throw error
  revalidatePath('/dashboard')
}

export async function deleteProject(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/dashboard')
}

// ============================================
// ITEMS
// ============================================

export async function getItems(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('project_id', projectId)
    .order('status', { ascending: true })
    .order('position')

  if (error) throw error
  return data
}

export async function getItemsByDate(startDate: string, endDate: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('items')
    .select('*, project:projects(*, space:spaces(*))')
    .gte('due_date', startDate)
    .lte('due_date', endDate)
    .order('due_date')
    .order('position')

  if (error) throw error
  return data
}

export async function getTodayItems() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('items')
    .select('*, project:projects(*, space:spaces(*))')
    .or(`due_date.eq.${today},and(due_date.lt.${today},status.neq.done)`)
    .order('due_date')
    .order('priority')
    .order('position')

  if (error) throw error
  return data
}

export async function createItem(formData: {
  project_id: string
  title: string
  notes?: string
  status?: string
  priority?: string
  due_date?: string
  tags?: string[]
  metadata?: Record<string, any>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: existing } = await supabase
    .from('items')
    .select('position')
    .eq('project_id', formData.project_id)
    .order('position', { ascending: false })
    .limit(1)

  const nextPos = existing && existing.length > 0 ? existing[0].position + 1 : 0

  const { data, error } = await supabase.from('items').insert({
    project_id: formData.project_id,
    created_by: user.id,
    title: formData.title,
    notes: formData.notes || null,
    status: formData.status || 'todo',
    priority: formData.priority || 'none',
    due_date: formData.due_date || null,
    tags: formData.tags || [],
    metadata: formData.metadata || {},
    position: nextPos,
  }).select().single()

  if (error) throw error
  revalidatePath('/dashboard')
  revalidatePath('/project')
  revalidatePath('/calendar')
  return data
}

export async function updateItem(id: string, updates: Partial<{
  title: string
  notes: string | null
  status: string
  priority: string
  due_date: string | null
  due_time: string | null
  tags: string[]
  metadata: Record<string, any>
  position: number
}>) {
  const supabase = await createClient()

  // If marking as done, set completed_at
  if (updates.status === 'done') {
    (updates as any).completed_at = new Date().toISOString()
  } else if (updates.status && updates.status !== 'done') {
    (updates as any).completed_at = null
  }

  const { error } = await supabase.from('items').update(updates).eq('id', id)
  if (error) throw error
  revalidatePath('/dashboard')
  revalidatePath('/project')
  revalidatePath('/calendar')
}

export async function toggleItem(id: string) {
  const supabase = await createClient()
  const { data: item, error: fetchError } = await supabase
    .from('items')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  const newStatus = item.status === 'done' ? 'todo' : 'done'
  const updates: any = {
    status: newStatus,
    completed_at: newStatus === 'done' ? new Date().toISOString() : null,
  }

  const { error } = await supabase.from('items').update(updates).eq('id', id)
  if (error) throw error
  revalidatePath('/dashboard')
  revalidatePath('/project')
  revalidatePath('/calendar')
}

export async function deleteItem(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/dashboard')
  revalidatePath('/project')
  revalidatePath('/calendar')
}

// ============================================
// SHARING
// ============================================

export async function createShareLink(projectId: string, role: 'view' | 'edit' = 'edit') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('project_shares')
    .insert({
      project_id: projectId,
      invited_by: user.id,
      role,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function acceptInvite(token: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Find the share
  const { data: share, error: findError } = await supabase
    .from('project_shares')
    .select('*')
    .eq('invite_token', token)
    .single()

  if (findError || !share) throw new Error('Invalid invite link')

  if (share.invited_user_id && share.invited_user_id !== user.id) {
    throw new Error('This invite has already been claimed')
  }

  const { error } = await supabase
    .from('project_shares')
    .update({
      invited_user_id: user.id,
      accepted: true,
    })
    .eq('id', share.id)

  if (error) throw error
  revalidatePath('/dashboard')
  return share.project_id
}

export async function getProjectShares(projectId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('project_shares')
    .select('*, invited_user:profiles!project_shares_invited_user_id_fkey(*)')
    .eq('project_id', projectId)

  if (error) throw error
  return data
}

export async function removeShare(shareId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('project_shares')
    .delete()
    .eq('id', shareId)

  if (error) throw error
  revalidatePath('/dashboard')
}

// ============================================
// PROFILE
// ============================================

export async function getProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) throw error
  return data
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/')
}
