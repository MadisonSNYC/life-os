import { getProfile } from '@/lib/actions'
import { SettingsView } from '@/components/settings-view'

export default async function SettingsPage() {
  const profile = await getProfile()
  return (
    <div className="px-4 pt-6">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>
      <SettingsView profile={profile} />
    </div>
  )
}
