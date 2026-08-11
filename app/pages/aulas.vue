<template>
  <main class="minicurso-page">
    <header class="site-header">
      <NuxtLink to="/" class="brand" :aria-label="`Voltar para a página inicial do ${APP_NAME}`">
        <img src="/logo.png" :alt="APP_NAME" />
      </NuxtLink>
      <NuxtLink to="/" class="back-link">
        <Icon name="ph:arrow-left-bold" />
        Voltar ao clube
      </NuxtLink>
    </header>

    <section class="hero">
      <div class="hero__glow"></div>
      <p class="eyebrow">{{ APP_NAME }} apresenta</p>
      <h1>Minicurso<br><span>Comece do zero.</span></h1>
      <p class="hero__description">
        Aprenda o passo a passo para começar com mais segurança: cadastro, operação e gerenciamento de banca.
      </p>
      <a href="#aulas" class="hero__button">
        Ver aulas
        <Icon name="ph:arrow-down-bold" />
      </a>
    </section>

    <section id="aulas" class="course" aria-labelledby="course-title">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Seu conteúdo</p>
          <h2 id="course-title">Aulas do minicurso</h2>
        </div>
        <p>Assista na ordem indicada e avance no seu ritmo.</p>
      </div>

      <div class="lesson-stack">
        <article
          v-for="(aula, index) in aulas"
          :key="aula.title"
          class="lesson"
          :class="[{ 'lesson--reverse': index % 2 }, `lesson--${aula.orientation}`]"
        >
          <button
            class="lesson__media"
            :class="[`lesson__media--${aula.orientation}`, { 'lesson__media--placeholder': !aula.cover }]"
            type="button"
            :aria-label="`Assistir ${aula.title}`"
            @click="openLesson(aula)"
          >
            <img v-if="aula.cover" :src="aula.cover" :alt="`Capa da ${aula.title}`" />
            <!-- Sem capa publicada: bloco com número e título no lugar da arte,
                 pra aula poder ir ao ar antes da imagem ficar pronta. -->
            <span v-else class="lesson__media-fallback">
              <span class="lesson__media-fallback-number">{{ lessonNumber(index) }}</span>
              <span class="lesson__media-fallback-title">{{ aula.title }}</span>
            </span>
            <span class="play-badge"><Icon name="ph:play-fill" /></span>
          </button>
          <div class="lesson__content">
            <span class="lesson__number">Aula {{ lessonNumber(index) }}</span>
            <h3>{{ aula.title }}</h3>
            <p>{{ aula.description }}</p>
            <div class="lesson__actions">
              <button class="watch-button" type="button" @click="openLesson(aula)">
                Clique e assista
                <Icon name="ph:play-fill" />
              </button>
              <NuxtLink
                v-if="aula.actionLink && !isExternal(aula.actionLink.url)"
                class="lesson__link-pill"
                :to="aula.actionLink.url"
              >
                <Icon :name="aula.actionLink.icon" />
                {{ aula.actionLink.label }}
              </NuxtLink>
              <a
                v-else-if="aula.actionLink"
                class="lesson__link-pill"
                :href="aula.actionLink.url"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon :name="aula.actionLink.icon" />
                {{ aula.actionLink.label }}
              </a>
            </div>
          </div>
        </article>
      </div>
    </section>

    <section class="support">
      <div>
        <p class="eyebrow">Precisa de ajuda?</p>
        <h2>Conte com a gente.</h2>
        <p>Se surgir alguma dúvida durante o minicurso, fale com o suporte do {{ APP_NAME }}.</p>
      </div>
      <a :href="supportUrl" target="_blank" rel="noopener noreferrer" class="support__button">
        <Icon name="ph:whatsapp-logo-bold" />
        Falar com o suporte
      </a>
    </section>

    <footer>Conteúdo educativo. Jogue com responsabilidade. Proibido para menores de 18 anos.</footer>

    <Teleport to="body">
      <div
        v-if="selectedLesson"
        class="modal"
        role="dialog"
        aria-modal="true"
        :aria-label="selectedLesson.title"
        @click.self="closeLesson"
      >
        <div class="modal__content" :class="hasPlayer ? `modal__content--${playerOrientation}` : null">
          <button class="modal__close" type="button" aria-label="Fechar" @click="closeLesson">
            <Icon name="ph:x-bold" />
          </button>

          <!-- playsinline é obrigatório: sem ele o Safari no iOS joga o vídeo
               no player fullscreen nativo e ignora este modal.
               preload="metadata" busca duração/dimensões sem baixar o arquivo. -->
          <video
            v-if="showVideo"
            :src="videoUrl(selectedLesson.videoKey || '')"
            :poster="selectedLesson.cover"
            controls
            playsinline
            preload="metadata"
            @error="videoFailed = true"
          ></video>

          <div v-else-if="showEmbed" class="modal__embed">
            <iframe
              :src="selectedLesson.embedUrl"
              :title="selectedLesson.title"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowfullscreen
            ></iframe>
          </div>

          <template v-else>
            <img v-if="selectedLesson.cover" :src="selectedLesson.cover" :alt="`Capa da ${selectedLesson.title}`" />
            <div class="modal__notice">
              <span>{{ videoFailed ? 'Erro ao carregar' : 'Em breve' }}</span>
              <h2>{{ selectedLesson.title }}</h2>
              <p v-if="videoFailed">Não conseguimos carregar o vídeo agora. Tente novamente em instantes.</p>
              <p v-else>O vídeo desta aula será disponibilizado aqui.</p>
            </div>
          </template>
        </div>
      </div>
    </Teleport>
  </main>
</template>

<script setup lang="ts">
import { APP_NAME } from '../../shared/app'
import { videoUrl } from '../../shared/videos'
import { SUPPORT_WHATSAPP_URL } from '../../shared/support'
import { AULAS, type Aula } from '../constants/aulas'

useHead({ title: `Minicurso - ${APP_NAME}` })

const aulas = AULAS
const supportUrl = SUPPORT_WHATSAPP_URL
const selectedLesson = ref<Aula | null>(null)
const videoFailed = ref(false)

const lessonNumber = (index: number) => String(index + 1).padStart(2, '0')

// Link do card: '/gestao' navega pelo router; http(s) abre em nova aba.
const isExternal = (url: string) => /^https?:\/\//i.test(url)

// Player nativo (R2): só com chave presente, base configurada em shared/videos.ts
// e sem falha de carregamento — "ainda não subiu" e "não carregou" caem no mesmo aviso.
const showVideo = computed(() =>
  Boolean(selectedLesson.value?.videoKey && videoUrl(selectedLesson.value.videoKey)) && !videoFailed.value
)

// Fallback pro conteúdo que já está no YouTube.
const showEmbed = computed(() => !showVideo.value && Boolean(selectedLesson.value?.embedUrl) && !videoFailed.value)

const hasPlayer = computed(() => showVideo.value || showEmbed.value)

// Embed do YouTube é sempre 16:9, independente do que a aula declara.
const playerOrientation = computed(() =>
  showEmbed.value ? 'horizontal' : (selectedLesson.value?.orientation || 'horizontal')
)

const openLesson = (aula: Aula) => {
  // Reseta o flag: uma falha numa aula não deve contaminar a próxima.
  videoFailed.value = false
  selectedLesson.value = aula
}
const closeLesson = () => { selectedLesson.value = null }
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');

.minicurso-page { min-height: 100vh; overflow: hidden; color: #fff7fb; background: #090308; font-family: Manrope, sans-serif; }
.site-header { width: min(1180px, calc(100% - 32px)); height: 80px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; position: relative; z-index: 2; }
.brand img { display: block; width: auto; height: 42px; object-fit: contain; }
.back-link, .hero__button, .watch-button, .lesson__link-pill, .support__button { display: inline-flex; align-items: center; justify-content: center; gap: 9px; border-radius: 999px; font-weight: 800; text-decoration: none; transition: transform .2s ease, filter .2s ease; }
.back-link { padding: 11px 16px; color: #fff; border: 1px solid rgba(255,255,255,.2); font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
.back-link:hover, .hero__button:hover, .watch-button:hover, .lesson__link-pill:hover, .support__button:hover { transform: translateY(-3px); filter: brightness(1.12); }
.hero { width: min(1180px, calc(100% - 32px)); min-height: 530px; margin: 0 auto; padding: 95px 0 120px; position: relative; isolation: isolate; }
.hero::before { content: ''; position: absolute; z-index: -2; width: 650px; height: 650px; right: -115px; top: -115px; border-radius: 50%; background: radial-gradient(circle, rgba(255,0,118,.36), transparent 65%); filter: blur(10px); }
.hero__glow { position: absolute; z-index: -1; inset: 40px 0 auto auto; width: 52%; height: 370px; border-radius: 48% 52% 44% 56%; background: linear-gradient(135deg, rgba(255, 5, 119, .26), rgba(98, 0, 41, .03)); filter: blur(2px); transform: rotate(-12deg); }
.eyebrow { margin: 0 0 18px; color: #ff53a8; font-size: 12px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
h1, h2, h3 { font-family: 'Space Grotesk', Manrope, sans-serif; }
.hero h1 { max-width: 800px; margin: 0; font-size: clamp(52px, 8vw, 105px); line-height: .9; letter-spacing: -.07em; }
.hero h1 span { color: #fa1685; text-shadow: 0 0 38px rgba(255, 0, 125, .35); }
.hero__description { max-width: 570px; margin: 28px 0; color: #d6bac8; font-size: 17px; line-height: 1.65; }
.hero__button, .watch-button { border: 0; cursor: pointer; background: linear-gradient(135deg, #ff57af, #e80070); box-shadow: 0 14px 30px rgba(235, 0, 107, .28); color: #fff; }
.hero__button { padding: 15px 23px; }
.course { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 90px 0; }
.section-heading { display: flex; align-items: end; justify-content: space-between; gap: 30px; margin-bottom: 42px; }
.section-heading h2, .support h2 { margin: 0; font-size: clamp(36px, 4vw, 58px); line-height: .96; letter-spacing: -.055em; }
.section-heading > p { max-width: 360px; margin: 0; color: #bdaab4; line-height: 1.65; }
.lesson-stack { display: grid; gap: 32px; }
.lesson { display: grid; grid-template-columns: minmax(280px, .95fr) minmax(280px, 1fr); align-items: center; gap: clamp(25px, 5vw, 80px); padding: clamp(18px, 3vw, 38px); border: 1px solid rgba(255,255,255,.13); border-radius: 30px; background: radial-gradient(circle at 0 0, rgba(255, 0, 122, .19), transparent 42%), linear-gradient(145deg, rgba(41, 12, 32, .92), rgba(12, 5, 10, .94)); box-shadow: 0 25px 60px rgba(0,0,0,.28); }
.lesson--vertical { grid-template-columns: minmax(220px, .72fr) minmax(280px, 1fr); }
.lesson--reverse .lesson__media { order: 2; }
.lesson__media { position: relative; padding: 0; overflow: hidden; border: 1px solid rgba(255,255,255,.18); border-radius: 20px; background: #150710; cursor: pointer; }
.lesson__media img { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; transition: transform .35s ease; }
.lesson__media--vertical { box-sizing: border-box; justify-self: center; width: min(100%, 340px); aspect-ratio: 9 / 16; padding: 9px; border: 1px solid rgba(255, 209, 96, .78); border-radius: 32px; background: linear-gradient(135deg, #4c3216 0%, #d5a845 40%, #6a4317 72%, #f1cd73 100%); box-shadow: 0 0 0 3px rgba(18, 7, 13, .92), 0 22px 45px rgba(0,0,0,.48), 0 0 30px rgba(224, 171, 65, .18); }
.lesson__media--vertical::after { content: ''; position: absolute; z-index: 1; inset: 12px; border: 1px solid rgba(255, 236, 172, .24); border-radius: 23px; pointer-events: none; }
.lesson__media--vertical img { height: 100%; aspect-ratio: auto; border-radius: 22px; object-fit: cover; object-position: center; }
.lesson__media:hover img { transform: scale(1.035); }

/* Placeholder de capa: mesma caixa da imagem, sem arte inventada. */
.lesson__media-fallback { display: flex; flex-direction: column; align-items: flex-start; justify-content: flex-end; gap: 6px; width: 100%; aspect-ratio: 16 / 9; padding: 22px; text-align: left; background: radial-gradient(circle at 78% 18%, rgba(255, 20, 147, .32), transparent 58%), linear-gradient(145deg, #240a1a 0%, #12060f 100%); }
.lesson__media--vertical .lesson__media-fallback { height: 100%; aspect-ratio: auto; border-radius: 22px; }
.lesson__media-fallback-number { font-family: 'Space Grotesk', Manrope, sans-serif; font-size: clamp(44px, 6vw, 72px); font-weight: 700; line-height: .9; letter-spacing: -.06em; color: rgba(255, 122, 200, .55); }
.lesson__media-fallback-title { max-width: 80%; color: #ffc3e3; font-size: 14px; font-weight: 700; line-height: 1.3; }

.play-badge { position: absolute; z-index: 2; left: 17px; bottom: 17px; display: grid; place-items: center; width: 55px; height: 55px; border-radius: 50%; background: #fa167f; color: white; font-size: 23px; box-shadow: 0 8px 25px rgba(255,0,124,.5); }
.lesson__media--placeholder .play-badge { left: auto; right: 17px; top: 17px; bottom: auto; }
.lesson__content { display: flex; flex-direction: column; align-items: flex-start; }
.lesson__number { padding: 7px 11px; border: 1px solid rgba(255,83,168,.42); border-radius: 999px; color: #ff75b8; font-size: 11px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
.lesson h3 { margin: 18px 0 14px; font-size: clamp(34px, 4vw, 53px); line-height: .96; letter-spacing: -.055em; }
.lesson p { max-width: 440px; margin: 0 0 24px; color: #c8b3be; font-size: 16px; line-height: 1.6; }
.lesson__actions { display: flex; flex-wrap: wrap; gap: 10px; }
.watch-button { padding: 13px 18px; font-size: 14px; }
.lesson__link-pill { padding: 12px 16px; border: 1px solid rgba(255, 118, 183, .52); color: #ffc3e3; background: rgba(255, 44, 145, .1); font-size: 13px; }
.support { width: min(1180px, calc(100% - 32px)); display: flex; align-items: end; justify-content: space-between; gap: 30px; margin: 30px auto 75px; padding: 45px; border: 1px solid rgba(255, 71, 158, .28); border-radius: 28px; background: radial-gradient(circle at 92% 12%, rgba(255, 0, 126, .28), transparent 28%), #190611; }
.support p:not(.eyebrow) { max-width: 520px; margin: 16px 0 0; color: #c7aebb; line-height: 1.6; }
.support__button { flex: 0 0 auto; padding: 15px 20px; background: linear-gradient(135deg, #2bea73, #16a34a); color: #fff; box-shadow: 0 10px 25px rgba(37, 211, 102, .28); }
footer { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 28px 0 44px; border-top: 1px solid rgba(255,255,255,.12); color: #836d79; font-size: 12px; text-align: center; }
.modal { position: fixed; z-index: 100; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(0,0,0,.82); backdrop-filter: blur(9px); }
.modal__content { position: relative; overflow: hidden; width: min(900px, 100%); max-height: 92vh; border: 1px solid rgba(255,255,255,.2); border-radius: 24px; background: #190711; }
/* O container padrão (900px) serve a capa 16:9 do aviso "Em breve" e o vídeo
   horizontal; só o vertical encolhe, senão sobrariam faixas laterais enormes. */
.modal__content--vertical { width: min(420px, 100%); }
.modal__content > img { display: block; width: 100%; max-height: 67vh; object-fit: contain; background: #080306; aspect-ratio: 16 / 9; border: 0; }
/* contain (e não cover): vídeo que não bata exatamente com a proporção encaixa
   com barra, em vez de cortar o rosto de quem está falando. */
.modal video { display: block; width: 100%; object-fit: contain; background: #080306; border: 0; }
.modal__content--vertical video { max-height: 80vh; aspect-ratio: 9 / 16; }
.modal__content--horizontal video { max-height: 67vh; aspect-ratio: 16 / 9; }
.modal__embed { position: relative; width: 100%; aspect-ratio: 16 / 9; max-height: 67vh; background: #080306; }
.modal__embed iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.modal__close { position: absolute; z-index: 2; top: 12px; right: 12px; display: grid; place-items: center; width: 42px; height: 42px; border: 0; border-radius: 50%; background: #fff; color: #1b0611; cursor: pointer; font-size: 20px; }
.modal__notice { padding: 26px; text-align: center; }.modal__notice span { color: #ff64ad; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .14em; }.modal__notice h2 { margin: 8px 0; }.modal__notice p { margin: 0; color: #c9b5be; }
@media (prefers-reduced-motion: reduce) {
  .back-link, .hero__button, .watch-button, .lesson__link-pill, .support__button, .lesson__media img { transition: none; }
  .back-link:hover, .hero__button:hover, .watch-button:hover, .lesson__link-pill:hover, .support__button:hover { transform: none; }
  .lesson__media:hover img { transform: none; }
}
@media (max-width: 700px) { .site-header { height: 70px; }.brand img { height: 32px; }.back-link { padding: 9px 11px; font-size: 10px; }.hero { min-height: 480px; padding: 70px 0 80px; }.hero__glow { width: 85%; opacity: .8; }.section-heading, .support { align-items: flex-start; flex-direction: column; }.course { padding: 70px 0; }.lesson, .lesson--reverse { grid-template-columns: 1fr; gap: 24px; }.lesson--reverse .lesson__media { order: 0; }.lesson { padding: 16px; border-radius: 23px; }.lesson h3 { font-size: 39px; }.lesson__content { padding: 5px 5px 12px; }.support { padding: 30px 25px; margin-bottom: 45px; }.support__button { width: 100%; }.hero__description { font-size: 15px; } }
</style>
