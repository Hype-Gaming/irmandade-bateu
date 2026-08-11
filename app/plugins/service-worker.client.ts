// Registra o service worker (public/sw.js).
//
// Antes isto era um <script> dentro do `app.html` da raiz — arquivo que o Nuxt 4
// não lê, então o register() nunca rodava. Consequência: o cache offline não
// existia, as notificações push não chegavam e o UpdateNotification.vue ficava
// preso esperando por `navigator.serviceWorker.ready`, que nunca resolvia.
export default defineNuxtPlugin(() => {
  if (!import.meta.client || !('serviceWorker' in navigator)) return

  // Depois do load para não competir com os recursos da primeira tela.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registrado com sucesso:', registration.scope)
      })
      .catch((error) => {
        console.log('Falha ao registrar Service Worker:', error)
      })
  })
})
