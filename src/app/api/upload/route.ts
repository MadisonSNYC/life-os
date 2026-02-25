import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return new Response('No file provided', { status: 400 })
  }

  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    return new Response('File too large (max 10MB)', { status: 400 })
  }

  const ext = file.name.split('.').pop() || 'bin'
  const fileName = `${user.id}/${uuidv4()}.${ext}`

  const { data, error } = await supabase.storage
    .from('chat-attachments')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    console.error('Upload error:', error)
    return new Response(`Upload failed: ${error.message}`, { status: 500 })
  }

  const { data: urlData } = supabase.storage
    .from('chat-attachments')
    .getPublicUrl(data.path)

  return Response.json({
    url: urlData.publicUrl,
    path: data.path,
    name: file.name,
    type: file.type,
    size: file.size,
  })
}
