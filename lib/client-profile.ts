/** Repeat-client details kept only in this browser — never sent as a separate field. */
export type ClientProfile = {
  name: string
  whatsapp: string
  university: string
  department: string
}

const KEY = 'inquire_client_profile'

const asText = (value: unknown) => (typeof value === 'string' ? value : '')

export function readClientProfile(): ClientProfile | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as Partial<ClientProfile>
    return {
      name: asText(saved.name),
      whatsapp: asText(saved.whatsapp),
      university: asText(saved.university),
      department: asText(saved.department),
    }
  } catch {
    return null
  }
}

export function saveClientProfile(profile: ClientProfile) {
  if (!Object.values(profile).some((value) => value.trim())) return false
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile))
    return true
  } catch {
    return false
  }
}
