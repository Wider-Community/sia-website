/**
 * Static Arabic translations for ISO 4217 currency codes.
 *
 * Used by the reference-data refresher to enrich API-fetched currencies
 * (which arrive English-only) with Arabic labels for the most common
 * currencies. Coverage is intentionally pragmatic — GCC, MENA, G20, BRICS,
 * and Southeast Asia. Currencies not in this map remain English-only and
 * can be filled in manually via the Reference Data tab.
 */

export const CURRENCY_ARABIC_LABELS: Record<string, string> = {
  // ── GCC + Saudi-Malaysia corridor priorities ─────────────────────────────
  SAR: 'ريال سعودي',
  AED: 'درهم إماراتي',
  BHD: 'دينار بحريني',
  KWD: 'دينار كويتي',
  OMR: 'ريال عُماني',
  QAR: 'ريال قطري',
  MYR: 'رينغيت ماليزي',
  SGD: 'دولار سنغافوري',
  IDR: 'روبية إندونيسية',

  // ── G7 / Major reserve currencies ────────────────────────────────────────
  USD: 'دولار أمريكي',
  EUR: 'يورو',
  GBP: 'جنيه إسترليني',
  JPY: 'ين ياباني',
  CHF: 'فرنك سويسري',
  CAD: 'دولار كندي',
  AUD: 'دولار أسترالي',
  NZD: 'دولار نيوزيلندي',

  // ── BRICS / major emerging economies ─────────────────────────────────────
  CNY: 'يوان صيني',
  INR: 'روبية هندية',
  RUB: 'روبل روسي',
  BRL: 'ريال برازيلي',
  ZAR: 'راند جنوب أفريقي',
  TRY: 'ليرة تركية',

  // ── MENA + Africa ────────────────────────────────────────────────────────
  EGP: 'جنيه مصري',
  JOD: 'دينار أردني',
  LBP: 'ليرة لبنانية',
  SYP: 'ليرة سورية',
  IQD: 'دينار عراقي',
  YER: 'ريال يمني',
  MAD: 'درهم مغربي',
  TND: 'دينار تونسي',
  DZD: 'دينار جزائري',
  LYD: 'دينار ليبي',
  SDG: 'جنيه سوداني',
  NGN: 'نايرا نيجيرية',
  KES: 'شلن كيني',
  ETB: 'بير إثيوبي',
  GHS: 'سيدي غاني',

  // ── Asia ─────────────────────────────────────────────────────────────────
  KRW: 'وون كوري جنوبي',
  THB: 'بات تايلاندي',
  VND: 'دونغ فيتنامي',
  PHP: 'بيزو فلبيني',
  PKR: 'روبية باكستانية',
  BDT: 'تاكا بنغلاديشية',
  LKR: 'روبية سريلانكية',
  HKD: 'دولار هونغ كونغي',
  TWD: 'دولار تايواني',

  // ── Europe (non-Euro) ────────────────────────────────────────────────────
  SEK: 'كرونة سويدية',
  NOK: 'كرونة نرويجية',
  DKK: 'كرونة دانماركية',
  PLN: 'زلوتي بولندي',
  CZK: 'كرونة تشيكية',
  HUF: 'فورنت مجري',

  // ── Latin America ────────────────────────────────────────────────────────
  MXN: 'بيزو مكسيكي',
  ARS: 'بيزو أرجنتيني',
  CLP: 'بيزو تشيلي',
  COP: 'بيزو كولومبي',
  PEN: 'سول بيروفي',
};
