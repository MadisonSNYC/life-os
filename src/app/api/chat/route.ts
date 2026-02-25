import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { parseFileToText } from '@/lib/file-parser'

// Force Node.js runtime (needed for xlsx + pdf-parse)
export const runtime = 'nodejs'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

const SYSTEM_PROMPT = `You are the AI assistant inside "Life OS", a personal task and life management app. You help the user organize their life by creating tasks, projects, and planning pages from natural language.

When the user describes something they want to do, you should:
1. Understand what they need
2. Help them think through it (research, options, considerations)
3. Extract actionable tasks
4. Organize everything clearly

The user can attach images and files to their messages. When they share screenshots, photos, or documents:
- Analyze the content thoroughly
- Extract any relevant information (prices, dates, names, tasks, etc.)
- Reference specific details you see in images
- If it's a screenshot of options/quotes/comparisons, organize the info into a structured format

IMPORTANT: At the end of every response where you identify actionable items, include a structured block wrapped in <life-os-actions> tags. This block tells the app what to create/modify. Format:

<life-os-actions>
{
  "create_space": {
    "name": "Space name",
    "emoji": "relevant emoji",
    "color": "blue|purple|green|orange|red|pink|yellow"
  },
  "create_project": {
    "name": "Project name",
    "emoji": "relevant emoji",
    "type": "standard|grocery|planning",
    "space": "Space name (existing or from create_space above)"
  },
  "move_project": {
    "project_name": "Name of project to move (fuzzy match)",
    "target_space": "Name of destination space"
  },
  "create_tasks": [
    {
      "title": "Task title",
      "priority": "none|low|medium|high|urgent",
      "due_date": "YYYY-MM-DD or null",
      "notes": "Additional context"
    }
  ],
  "update_tasks": [
    {
      "title_match": "Existing task title to find (fuzzy match)",
      "updates": {
        "title": "New title (optional)",
        "status": "todo|in_progress|done (optional)",
        "priority": "none|low|medium|high|urgent (optional)",
        "due_date": "YYYY-MM-DD or null (optional)",
        "notes": "New notes (optional)"
      }
    }
  ],
  "delete_tasks": [
    { "title_match": "Existing task title to find and delete (fuzzy match)" }
  ],
  "planning_page": {
    "title": "Page title",
    "content": "Full markdown content with research, comparisons, details, tables, etc."
  }
}
</life-os-actions>

Rules:
- Only include create_project if the user is discussing something that warrants a new project
- If a project_id is provided in context, add tasks to that project instead of creating a new one
- Always include a planning_page when there's substantial research or information to organize
- Use markdown tables, headers, and formatting in planning page content
- Be conversational and helpful, not robotic
- If the user is just chatting or asking a question, respond normally without actions
- Extract specific dates when mentioned (convert relative dates to absolute)
- Identify priorities from urgency cues in the message
- For grocery/shopping requests, use the grocery project type
- For event planning (like parties, trips), use the planning project type
- Use move_project when the user wants to reorganize projects between spaces
- Use create_space when the user references a space that doesn't exist yet (e.g. "move X to Burning Man" — create "Burning Man" space first)
- Use update_tasks to change existing task properties (status, priority, due_date, title, notes)
- Use delete_tasks to remove tasks the user no longer wants
- You CAN move projects, update tasks, delete tasks, create spaces — don't say you can't!
- For fuzzy matching: use the closest match to the task/project name. Include enough of the title to uniquely identify it.`

type Attachment = {
  url: string
  type: string
  name: string
}

async function buildMessageContent(text: string, attachments?: Attachment[]) {
  const content: any[] = []

  // Add image attachments as image_url blocks
  if (attachments && attachments.length > 0) {
    for (const att of attachments) {
      if (att.type.startsWith('image/')) {
        // Fetch the image and convert to base64 for Claude
        try {
          const imgResponse = await fetch(att.url)
          const buffer = await imgResponse.arrayBuffer()
          const base64 = Buffer.from(buffer).toString('base64')
          const mediaType = att.type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64,
            },
          })
        } catch (e) {
          console.error('Failed to fetch image:', e)
          content.push({
            type: 'text',
            text: `[Attached image: ${att.name} — could not load]`,
          })
        }
      } else {
        // Non-image files — parse content and include as text
        try {
          const fileText = await parseFileToText(att.url, att.type, att.name)
          content.push({
            type: 'text',
            text: `[File: ${att.name}]\n\n${fileText}`,
          })
        } catch (e) {
          console.error('Failed to parse file:', e)
          content.push({
            type: 'text',
            text: `[Attached file: ${att.name} (${att.type}) — could not parse content]`,
          })
        }
      }
    }
  }

  // Add the text message
  content.push({ type: 'text', text: text })

  return content
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { message, projectId, history, attachments, threadId } = await request.json()

  if (!message?.trim() && (!attachments || attachments.length === 0)) {
    return new Response('Message or attachment required', { status: 400 })
  }

  // Create or use existing thread
  let activeThreadId = threadId
  let threadTitle = ''
  if (!activeThreadId) {
    // Auto-create a thread with the first message as title
    threadTitle = (message || 'New Chat').substring(0, 80)
    const { data: newThread } = await supabase
      .from('chat_threads')
      .insert({
        user_id: user.id,
        project_id: projectId || null,
        title: threadTitle,
      })
      .select()
      .single()

    if (newThread) {
      activeThreadId = newThread.id
    }
  }

  // Save the user message with attachment metadata
  await supabase.from('chat_messages').insert({
    user_id: user.id,
    project_id: projectId || null,
    thread_id: activeThreadId || null,
    role: 'user',
    content: message || '',
    metadata: {
      attachments: attachments || [],
    },
  })

  // Build conversation history for Claude
  const historyMessages = []
  for (const msg of (history || [])) {
    if (msg.role === 'user' && msg.metadata?.attachments?.length > 0) {
      // Rebuild multimodal content for history messages with attachments
      const content = await buildMessageContent(msg.content, msg.metadata.attachments)
      historyMessages.push({ role: 'user', content })
    } else {
      historyMessages.push({ role: msg.role, content: msg.content })
    }
  }

  // Build current message (potentially with images)
  const currentContent = await buildMessageContent(message || 'Please analyze the attached file(s).', attachments)

  const messages = [
    ...historyMessages,
    { role: 'user', content: currentContent },
  ]

  // Add project context if we're in a project
  let systemPrompt = SYSTEM_PROMPT
  if (projectId) {
    const { data: project } = await supabase
      .from('projects')
      .select('*, space:spaces(*)')
      .eq('id', projectId)
      .single()

    const { data: items } = await supabase
      .from('items')
      .select('*')
      .eq('project_id', projectId)
      .order('position')

    if (project) {
      systemPrompt += `\n\nCurrent project context:
- Project: ${project.emoji} ${project.name} (type: ${project.type})
- Space: ${(project.space as any)?.name || 'Unknown'}
- Project ID: ${project.id}
- Existing tasks: ${items?.map(i => `[${i.status}] ${i.title}`).join(', ') || 'none'}

Since we're inside a project, add tasks to this project (don't create a new one) unless the user is clearly talking about something completely different.`
    }
  }

  // Call Claude API
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response('Anthropic API key not configured', { status: 500 })
  }

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Claude API error:', errText)
      return new Response(`Claude API error: ${response.status}`, { status: 500 })
    }

    const result = await response.json()
    const assistantContent = result.content[0]?.text || ''

    // Parse actions from response
    const actionsMatch = assistantContent.match(/<life-os-actions>([\s\S]*?)<\/life-os-actions>/)
    let actions = null
    let cleanContent = assistantContent

    if (actionsMatch) {
      try {
        actions = JSON.parse(actionsMatch[1])
        cleanContent = assistantContent.replace(/<life-os-actions>[\s\S]*?<\/life-os-actions>/, '').trim()
      } catch (e) {
        console.error('Failed to parse actions:', e)
      }
    }

    // Execute actions
    const createdItems: string[] = []
    let createdProjectId = projectId
    let movedProject = false
    let updatedTasks: string[] = []
    let deletedTasks: string[] = []

    if (actions) {
      // Fetch all user spaces (needed for multiple actions)
      const { data: spaces } = await supabase
        .from('spaces')
        .select('*')
        .eq('owner_id', user.id)

      // 1. Create space if needed
      if (actions.create_space) {
        const existingSpace = spaces?.find(s =>
          s.name.toLowerCase() === (actions.create_space.name || '').toLowerCase()
        )
        if (!existingSpace) {
          const maxPos = spaces?.reduce((max, s) => Math.max(max, s.position || 0), -1) ?? -1
          const { data: newSpace } = await supabase
            .from('spaces')
            .insert({
              owner_id: user.id,
              name: actions.create_space.name,
              emoji: actions.create_space.emoji || '📁',
              color: actions.create_space.color || 'blue',
              position: maxPos + 1,
            })
            .select()
            .single()
          if (newSpace) {
            spaces?.push(newSpace)
          }
        }
      }

      // 2. Move project to a different space
      if (actions.move_project) {
        const targetSpaceName = actions.move_project.target_space || ''
        const targetSpace = spaces?.find(s =>
          s.name.toLowerCase() === targetSpaceName.toLowerCase()
        )

        if (targetSpace) {
          // Find the project by fuzzy name match
          const projectName = actions.move_project.project_name || ''
          const { data: allProjects } = await supabase
            .from('projects')
            .select('id, name')
            .eq('owner_id', user.id)

          const matchedProject = allProjects?.find(p =>
            p.name.toLowerCase().includes(projectName.toLowerCase()) ||
            projectName.toLowerCase().includes(p.name.toLowerCase())
          )

          if (matchedProject) {
            await supabase
              .from('projects')
              .update({ space_id: targetSpace.id })
              .eq('id', matchedProject.id)
            movedProject = true
          }
        }
      }

      // 3. Create project
      if (actions.create_project && !projectId) {
        const targetSpace = spaces?.find(s =>
          s.name.toLowerCase() === (actions.create_project.space || '').toLowerCase()
        ) || spaces?.[0]

        if (targetSpace) {
          const { data: newProject } = await supabase
            .from('projects')
            .insert({
              space_id: targetSpace.id,
              owner_id: user.id,
              name: actions.create_project.name,
              emoji: actions.create_project.emoji || '📋',
              type: actions.create_project.type || 'standard',
              position: 0,
            })
            .select()
            .single()

          if (newProject) {
            createdProjectId = newProject.id
          }
        }
      }

      // 4. Create tasks
      if (actions.create_tasks && createdProjectId) {
        for (let i = 0; i < actions.create_tasks.length; i++) {
          const task = actions.create_tasks[i]
          const { data: newItem } = await supabase
            .from('items')
            .insert({
              project_id: createdProjectId,
              created_by: user.id,
              title: task.title,
              notes: task.notes || null,
              priority: task.priority || 'none',
              due_date: task.due_date || null,
              status: 'todo',
              position: i,
            })
            .select()
            .single()

          if (newItem) createdItems.push(newItem.id)
        }
      }

      // 5. Update existing tasks
      if (actions.update_tasks && createdProjectId) {
        const { data: existingItems } = await supabase
          .from('items')
          .select('*')
          .eq('project_id', createdProjectId)

        for (const taskUpdate of actions.update_tasks) {
          const match = existingItems?.find(item =>
            item.title.toLowerCase().includes(taskUpdate.title_match.toLowerCase()) ||
            taskUpdate.title_match.toLowerCase().includes(item.title.toLowerCase())
          )
          if (match) {
            const updates: any = {}
            if (taskUpdate.updates.title) updates.title = taskUpdate.updates.title
            if (taskUpdate.updates.status) {
              updates.status = taskUpdate.updates.status
              if (taskUpdate.updates.status === 'done') updates.completed_at = new Date().toISOString()
              else updates.completed_at = null
            }
            if (taskUpdate.updates.priority) updates.priority = taskUpdate.updates.priority
            if (taskUpdate.updates.due_date !== undefined) updates.due_date = taskUpdate.updates.due_date
            if (taskUpdate.updates.notes !== undefined) updates.notes = taskUpdate.updates.notes

            await supabase.from('items').update(updates).eq('id', match.id)
            updatedTasks.push(match.id)
          }
        }
      }

      // 6. Delete tasks
      if (actions.delete_tasks && createdProjectId) {
        const { data: existingItems } = await supabase
          .from('items')
          .select('*')
          .eq('project_id', createdProjectId)

        for (const taskDelete of actions.delete_tasks) {
          const match = existingItems?.find(item =>
            item.title.toLowerCase().includes(taskDelete.title_match.toLowerCase()) ||
            taskDelete.title_match.toLowerCase().includes(item.title.toLowerCase())
          )
          if (match) {
            await supabase.from('items').delete().eq('id', match.id)
            deletedTasks.push(match.id)
          }
        }
      }

      // 7. Planning page
      if (actions.planning_page && createdProjectId) {
        await supabase
          .from('planning_pages')
          .insert({
            project_id: createdProjectId,
            created_by: user.id,
            title: actions.planning_page.title,
            content: actions.planning_page.content,
            content_type: 'markdown',
          })
      }
    }

    // Update thread title if we created a project
    if (actions?.create_project && activeThreadId) {
      const projectName = actions.create_project.name || threadTitle
      await supabase
        .from('chat_threads')
        .update({ title: projectName })
        .eq('id', activeThreadId)
      threadTitle = projectName
    }

    // Save assistant message
    await supabase.from('chat_messages').insert({
      user_id: user.id,
      project_id: projectId || createdProjectId || null,
      thread_id: activeThreadId || null,
      role: 'assistant',
      content: cleanContent,
      metadata: {
        created_items: createdItems,
        created_project: actions?.create_project ? createdProjectId : null,
        has_planning_page: !!actions?.planning_page,
      },
    })

    return Response.json({
      message: cleanContent,
      threadId: activeThreadId,
      threadTitle: threadTitle,
      actions: actions ? {
        created_project_id: actions.create_project ? createdProjectId : null,
        created_space: actions.create_space?.name || null,
        moved_project: movedProject,
        created_items: createdItems,
        updated_tasks: updatedTasks,
        deleted_tasks: deletedTasks,
        has_planning_page: !!actions?.planning_page,
      } : null,
    })

  } catch (error: any) {
    console.error('Chat error:', error)
    return new Response(`Error: ${error.message}`, { status: 500 })
  }
}
