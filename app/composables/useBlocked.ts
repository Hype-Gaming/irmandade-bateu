// Estado global de bloqueio do usuário (setado pelo heartbeat /api/track/session)
export const useBlocked = () => {
  const isBlocked = useState('app-blocked', () => false)
  const setBlocked = (value: boolean) => {
    isBlocked.value = value
  }
  return { isBlocked, setBlocked }
}
