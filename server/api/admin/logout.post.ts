import { COOKIE_NAME } from '../../utils/adminAuth'

export default defineEventHandler((event) => {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
  return { success: true }
})
