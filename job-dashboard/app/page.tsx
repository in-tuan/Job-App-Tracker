import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data: applications } = await supabase.from('applications').select('*');

  return (
    <main className="p-8 font-sans">
      <h1 className="text-2xl font-bold mb-4">Job Applications</h1>
      <pre>{JSON.stringify(applications, null, 2)}</pre>
      {applications?.length === 0 && <p className="text-gray-500">No applications found in database yet.</p>}
    </main>
  )
}

