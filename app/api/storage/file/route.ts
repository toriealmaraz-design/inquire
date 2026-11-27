import { createDownloadUrl, isValidStorageKey } from '@/lib/storage/r2'

export const runtime = 'nodejs'

// Stable, same-origin link: a short-lived signed URL is resolved at request time
// so stored fileUrls never expire. No R2 secrets ever reach the response.
export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get('key')
  if (!isValidStorageKey(key)) {
    return new Response(JSON.stringify({ error: 'Invalid storage key.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  }

  try {
    const url = await createDownloadUrl(key!)
    return new Response(null, {
      status: 302,
      headers: { Location: url, 'Cache-Control': 'no-store, max-age=0' },
    })
  } catch (error) {
    console.error('File redirect failed:', error)
    return new Response(JSON.stringify({ error: 'Could not open file.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  }
}
