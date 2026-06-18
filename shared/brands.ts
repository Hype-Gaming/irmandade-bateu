// Fonte única das marcas (login duplo / multi-marca).
// Em Nuxt 4 o diretório shared/ é importável tanto no client quanto no server.
// Para adicionar uma casa nova, basta incluir mais um item em BRANDS.

export interface BrandConfig {
  slug: string
  name: string
  baseDomain: string
  apiBaseUrl: string
  userCollection: string
  affiliateUrl: string // link de cadastro/afiliado da casa
}

export const BRANDS: BrandConfig[] = [
  {
    slug: 'esportiva',
    name: 'Esportiva',
    baseDomain: 'bet.br',
    apiBaseUrl: 'https://routes-eb.grupoautoma.com',
    userCollection: 'users_eb',
    affiliateUrl: 'https://go.aff.esportiva.bet/imo5e5c7'
  },
  {
    slug: 'bateu',
    name: 'Bateu Bet',
    baseDomain: 'bet.br',
    apiBaseUrl: 'https://routes-eb.grupoautoma.com',
    userCollection: 'users_bb',
    affiliateUrl: 'https://go.aff.bateu.bet.br/thotysdm'
  }
]

// Fallback fixo (primeira marca). Usado quando não há env/slug definido.
export const DEFAULT_BRAND: BrandConfig = BRANDS[0]!

// Marca padrão respeitando o slug ativo (ex.: NUXT_PUBLIC_APP_BRAND).
// Cai no fallback BRANDS[0] quando o slug é vazio ou desconhecido.
export const getDefaultBrand = (slug?: string | null): BrandConfig =>
  BRANDS.find((b) => b.slug === slug) || BRANDS[0]!

export const getBrand = (slug?: string | null): BrandConfig =>
  BRANDS.find((b) => b.slug === slug) || DEFAULT_BRAND
