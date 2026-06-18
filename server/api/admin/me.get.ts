import { requireAdminSession } from '../../utils/adminAuth'

export default defineEventHandler((event) => {
  const session = requireAdminSession(event)
  return { success: true, adminEmail: session.email }
})
