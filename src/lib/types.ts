export type Space = {
  id: string
  owner_id: string
  name: string
  emoji: string
  color: string
  position: number
  created_at: string
}

export type ProjectType = 'standard' | 'grocery' | 'workout' | 'recipe' | 'planning'

export type Project = {
  id: string
  space_id: string
  owner_id: string
  name: string
  emoji: string
  type: ProjectType
  position: number
  created_at: string
  items?: Item[]
  space?: Space
  item_count?: number
  done_count?: number
}

export type ItemStatus = 'todo' | 'in_progress' | 'done'
export type ItemPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent'

export type Item = {
  id: string
  project_id: string
  created_by: string
  title: string
  notes: string | null
  status: ItemStatus
  priority: ItemPriority
  due_date: string | null
  due_time: string | null
  is_recurring: boolean
  recurrence_rule: string | null
  tags: string[]
  position: number
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  completed_at: string | null
  project?: Project
}

export type ShareRole = 'view' | 'edit'

export type ProjectShare = {
  id: string
  project_id: string
  invited_by: string
  invited_user_id: string | null
  role: ShareRole
  invite_token: string
  accepted: boolean
  created_at: string
  project?: Project
}

export type Profile = {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  created_at: string
}

export type ChatMessage = {
  id: string
  user_id: string
  project_id: string | null
  role: 'user' | 'assistant'
  content: string
  metadata: {
    attachments?: Array<{ url: string; type: string; name: string; preview?: string }>
    created_items?: string[]
    created_project?: string | null
    has_planning_page?: boolean
  }
  created_at: string
}

export type PlanningPage = {
  id: string
  project_id: string
  created_by: string
  title: string
  content: string
  content_type: 'markdown' | 'html'
  metadata: Record<string, any>
  position: number
  created_at: string
  updated_at: string
}
