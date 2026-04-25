/* SIA — Localization + Theme engine
   Toggles language (EN ↔ AR formal MSA) and theme (dark ↔ light).
   Strategy: walk visible text nodes once at load, keep originals on the node,
   swap to AR dictionary entries when language flips. Persists to localStorage.
*/
(function () {
  const STORE_LANG = 'sia.lang';
  const STORE_THEME = 'sia.theme';

  // === Translation dictionary ============================================
  // Keys are the EXACT trimmed English source string. Anything not in the
  // dictionary stays as-is (graceful degrade for tokens like "USD", "MDEC").
  const AR = {
    // NAV
    "The Corridor": "الممرّ",
    "Five Phases": "المراحل الخمس",
    "Network": "الشبكة",
    "Three Doors": "الأبواب الثلاثة",
    "Live": "مباشر",
    "Open a door": "افتح بابًا",
    "Pick your door": "اختر بابك",
    "Download framework": "حمّل الإطار",
    "PDF · 2.4MB": "PDF · ٢٫٤ ميغابايت",

    // HERO
    "SAUDI INTEGRATION ALLIANCE — ": "تحالف التكامل السعودي — ",
    "corridor live": "الممرّ مفعّل",
    "Two": "نظامان",
    "ecosystems.": "بيئيّان.",
    "Decades": "عقود",
    "of": "من",
    "proximity.": "التقارب.",
    "One": "ممرّ",
    "corridor.": "واحد.",
    "Saudi Arabia · Malaysia · Egypt": "المملكة العربية السعودية · ماليزيا · مصر",

    // SECTION TAGS
    "The corridor": "الممرّ",
    "The journey": "المسيرة",
    "Full corridor": "الممرّ الكامل",
    "The invitation": "الدعوة",

    // SECTION TITLES & SUBS
    "Three pillars.": "ثلاث ركائز.",
    "One operating frame.": "إطار تشغيلي واحد.",
    "Capital from the Gulf. Infrastructure in Malaysia. Operators in Egypt. Each pillar already cleared, already moving — what's new is the corridor that connects them.": "رأس المال من الخليج. البنية التحتية في ماليزيا. المشغّلون في مصر. كلّ ركيزة جاهزة ومتحرّكة بالفعل — الجديد هو الممرّ الذي يربط بينها.",

    "Five phases.": "خمس مراحل.",
    "From a single door": "من بابٍ واحد",
    "to nations moving as one.": "إلى أمم تتحرّك كواحدة.",
    "Each tier compounds on the previous. Service-level relationships become business-level structures, become company-level anchors, become regulatory frame, become diplomatic alignment.": "كلّ طبقة تتراكم على ما قبلها. علاقات على المستوى الخدمي تتحوّل إلى هياكل على المستوى التجاري، فإلى مرتكزات على مستوى الشركات، فإلى إطار تنظيمي، فإلى توافق دبلوماسي.",

    "All five tiers,": "جميع الطبقات الخمس،",
    "live.": "مباشرة.",
    "Hover any node. Every element represents a relationship that has already been initiated — an access point confirmed, a program that already exists, or a structure in motion.": "مرّر فوق أيّ عقدة. كلّ عنصر يُمثّل علاقة تمّ الشروع بها فعلًا — نقطة وصول مؤكّدة، أو برنامج قائم، أو هيكل في طور التنفيذ.",

    "Three doors.": "ثلاثة أبواب.",
    "One corridor.": "ممرّ واحد.",
    "The corridor opens differently depending on who you are. Pick the door that describes your role — each leads to a tailored intake, not a generic form.": "الممرّ ينفتح بشكل مختلف بحسب هويّتك. اختر الباب الذي يصف دورك — كلّ باب يقود إلى استمارة مخصّصة، لا نموذجًا عامًّا.",

    // PILLARS
    "01 / GCC": "٠١ / دول الخليج",
    "02 / MY": "٠٢ / ماليزيا",
    "03 / EG": "٠٣ / مصر",
    "Capital.": "رأس المال.",
    "Infrastructure.": "البنية التحتية.",
    "Operations.": "العمليات.",
    "Saudi Arabia, the GCC at large, and Vision 2030-aligned investors. Embassy bridge, ministerial access, Maybank Islamic financing. Capital is structured, not solicited.": "المملكة العربية السعودية، ومنطقة الخليج عمومًا، والمستثمرون المتوافقون مع رؤية ٢٠٣٠. جسر السفارة، والوصول الوزاري، والتمويل الإسلامي عبر ماي بنك. رأس المال مُهيكل لا مُلتمس.",
    "Cyberjaya data centers, AI companies, MDEC Digital Status, MOU framework, 5-year residency. Malaysia is the platform layer — pre-cleared and live.": "مراكز بيانات سايبرجايا، وشركات الذكاء الاصطناعي، ومنزلة Digital Status من MDEC، وإطار مذكّرات التفاهم، وإقامة لخمس سنوات. ماليزيا هي طبقة المنصّة — مُجازة مسبقًا ومفعّلة.",
    "Talent pipeline, AI teams, frontline execution. Models trained once, deployed as permanent revenue-generating assets across the corridor. The operational engine that turns capital and infrastructure into recurring output.": "خط إمداد الكفاءات، وفِرَق الذكاء الاصطناعي، والتنفيذ في الخطوط الأمامية. تُدرَّب النماذج مرّة واحدة وتُنشَر بوصفها أصولًا دائمة مُدِرّة للدخل عبر الممرّ. المحرّك التشغيلي الذي يحوّل رأس المال والبنية التحتية إلى مُخرَجات متكرّرة.",

    // PHASE TIERS
    "Tier 1 · Service-Level": "الطبقة ١ · المستوى الخدمي",
    "Tier 2 · Business-Level": "الطبقة ٢ · المستوى التجاري",
    "Tier 3 · Company-Level": "الطبقة ٣ · مستوى الشركات",
    "Tier 4 · Regulatory-Level": "الطبقة ٤ · المستوى التنظيمي",
    "Tier 5 · Diplomatic-Level": "الطبقة ٥ · المستوى الدبلوماسي",
    "A door opens.": "بابٌ يُفتَح.",
    "They build together.": "يبنيان معًا.",
    "The anchor.": "المرتكز.",
    "The rules.": "القواعد.",
    "Nations move as one.": "الأمم تتحرّك كواحدة.",

    "One investor. One data center. One opportunity — matched by intelligence, confirmed by both sides. The first transaction proves the corridor works before any structure has to be built.": "مستثمرٌ واحد. مركز بيانات واحد. فرصة واحدة — يجري المطابقة بينها بذكاء، ويؤكّدها الطرفان. أوّل صفقة تُثبت أنّ الممرّ يعمل قبل أن يُبنى أيّ هيكل.",
    "MOUs, joint projects, shared assets. Both sides own the same infrastructure. The single transaction becomes a repeatable structure — one capital partner, one infrastructure partner, one shared cap table.": "مذكّرات تفاهم، ومشاريع مشتركة، وأصول مشتركة. يمتلك الطرفان البنية التحتية ذاتها. تتحوّل الصفقة الواحدة إلى هيكل قابل للتكرار — شريك رأس مال واحد، وشريك بنية تحتية واحد، وجدول ملكيّة مشترك.",
    "Three founders — Egypt, Saudi Arabia, Malaysia — formally merged. 5-year MDEC residency locks it in. The bilateral structure becomes a tri-national company with a single operating cadence and three home jurisdictions.": "ثلاثة مؤسّسين — مصر، والمملكة العربية السعودية، وماليزيا — مدمَجون رسميًّا. إقامة MDEC لخمس سنوات تُثبّت الهيكل. تتحوّل البنية الثنائية إلى شركة ثلاثية الجنسيات بإيقاع تشغيلي واحد وثلاث ولايات قضائية.",
    "Level A: allocate existing frameworks (PDPL · PDPA · MDEC Digital Status · Maybank halal financing) to the companies in the corridor. Level B: governments create new exceptions, visa pathways, and incentive structures that did not exist before SIA.": "المستوى أ: تخصيص الأطر القائمة (PDPL · PDPA · منزلة MDEC الرقمية · التمويل الحلال من ماي بنك) للشركات داخل الممرّ. المستوى ب: تُنشئ الحكومات استثناءات جديدة، ومسارات تأشيرات، وهياكل حوافز لم تكن قائمة قبل SIA.",
    "National programs align. Golden Residency across three countries. The circuit completes. What started as one transaction is now bilateral infrastructure that outlives the founders who built it.": "البرامج الوطنية تتوافق. إقامة ذهبية عبر ثلاث دول. تكتمل الدائرة. ما بدأ كصفقة واحدة أصبح بنية تحتية ثنائية تتجاوز عمر مؤسّسيها.",

    "Datapoint": "بيانات",
    "Mechanics": "الآلية",
    "Stack": "البِنية",
    "Two-tier regulatory frame": "إطار تنظيمي ثنائي المستوى",
    "Embassy bridge live": "جسر السفارة مفعّل",

    "Cyberjaya data center market growing from": "سوق مراكز البيانات في سايبرجايا ينمو من",
    "to": "إلى",
    "Google, AWS, and TotalEnergies are already anchored in Cyberjaya.": "جوجل، وAWS، وتوتال إنرجيز مرتكزون في سايبرجايا بالفعل.",
    "MOU engine routes capital deployment through pre-cleared": "محرّك مذكّرات التفاهم يوجّه نشر رأس المال عبر",
    "shared-asset structures": "هياكل أصول مشتركة مُجازة مسبقًا",
    "Joint ownership recorded across both jurisdictions, executable in days not quarters.": "تُسجَّل الملكيّة المشتركة في كلتا الولايتين القضائيّتين، وتُنفَّذ في أيّام لا في أرباع سنوية.",
    "Wider Labs": "وايدر لابز",
    "as the research backbone. Tri-national legal structure means a single PR-cleared founder team holds residency across all three countries on day one.": "بوصفها العمود الفقري للبحث. الهيكل القانوني الثلاثي يعني أنّ فريق مؤسّسين واحدًا مُجازًا للإقامة الدائمة يحمل الإقامة في الدول الثلاث منذ اليوم الأول.",
    "Level A — optimize existing.": "المستوى أ — تحسين القائم.",
    "No new rules required.": "لا حاجة لقواعد جديدة.",
    "Level B — new frontier.": "المستوى ب — جبهة جديدة.",
    "Both governments create exceptions, visa pathways, and incentive structures that did not exist before SIA.": "تُنشئ الحكومتان استثناءات، ومسارات تأشيرات، وهياكل حوافز لم تكن قائمة قبل SIA.",
    "Saudi embassy in Malaysia has a": "السفارة السعودية في ماليزيا لديها",
    "dedicated budget": "ميزانية مخصّصة",
    "for bilateral business and events. Direct access to Minister of Trade and Minister of Technology.": "للأعمال والفعاليات الثنائية. وصول مباشر إلى وزير التجارة ووزير التكنولوجيا.",
    "5-year Malaysian residency": "إقامة ماليزية لخمس سنوات",
    "for qualified co-founders through MDEC.": "للمؤسّسين المشاركين المؤهّلين عبر MDEC.",

    // SUB BADGES
    "EGYPT · Talent pipeline, AI teams, frontline execution": "مصر · خط إمداد الكفاءات، فِرَق الذكاء الاصطناعي، التنفيذ الأمامي",
    "SAUDI · Fast national programs, minimal conditions": "السعودية · برامج وطنية سريعة، شروط أدنى",
    "MALAYSIA · MDEC, ministerial access, 5-yr residency": "ماليزيا · MDEC، وصول وزاري، إقامة لخمس سنوات",

    // NETWORK BANDS
    "TIER 1 · SERVICE-LEVEL": "الطبقة ١ · المستوى الخدمي",
    "TIER 2 · BUSINESS-LEVEL": "الطبقة ٢ · المستوى التجاري",
    "TIER 3 · COMPANY-LEVEL": "الطبقة ٣ · مستوى الشركات",
    "TIER 4 · REGULATORY-LEVEL": "الطبقة ٤ · المستوى التنظيمي",
    "TIER 5 · DIPLOMATIC-LEVEL": "الطبقة ٥ · المستوى الدبلوماسي",
    "PHASE 01": "المرحلة ٠١",
    "PHASE 02": "المرحلة ٠٢",
    "PHASE 03": "المرحلة ٠٣",
    "PHASE 04": "المرحلة ٠٤",
    "PHASE 05": "المرحلة ٠٥",
    "← GCC / SAUDI ARABIA": "← الخليج / السعودية",
    "MALAYSIA →": "ماليزيا →",
    "FULL CORRIDOR · ALL TIERS LIVE · HOVER A NODE": "الممرّ الكامل · جميع الطبقات مفعّلة · مرّر فوق عقدة",
    "CORRIDOR SLICE": "شريحة الممرّ",
    "GCC / SAUDI": "الخليج / السعودية",
    "MALAYSIA": "ماليزيا",
    "NODES": "عُقد",
    "LINKS": "روابط",
    "LIVE": "مباشر",

    // NETWORK NODES (filtered)
    "Saudi Investors": "مستثمرون سعوديون",
    "Saudi VCs": "صناديق رأس مال جريء سعودية",
    "Saudi Corporates": "شركات سعودية",
    "SIA Portal": "بوّابة SIA",
    "Data Centers": "مراكز البيانات",
    "AI Companies": "شركات الذكاء الاصطناعي",
    "Solar Farms": "مزارع شمسية",
    "Saudi Embassy": "السفارة السعودية",
    "Vision 2030": "رؤية ٢٠٣٠",
    "MOU Engine": "محرّك مذكّرات التفاهم",
    "Shared Assets": "أصول مشتركة",
    "MDEC": "MDEC",
    "Ministries": "الوزارات",
    "Saudi Co-founder": "مؤسّس مشارك سعودي",
    "Egypt — Operations": "مصر — العمليات",
    "Company Integration": "تكامل الشركات",
    "Malaysian Co-founder": "مؤسّس مشارك ماليزي",
    "5-Year Residency": "إقامة لخمس سنوات",
    "Regulatory Level A": "المستوى التنظيمي أ",
    "PDPL · PDPA": "PDPL · PDPA",
    "Compliance Hub": "مركز الامتثال",
    "Regulatory Level B": "المستوى التنظيمي ب",
    "Maybank Islamic": "ماي بنك الإسلامي",
    "Saudi Programs": "البرامج السعودية",
    "Embassy Bridge": "جسر السفارة",
    "Bilateral Axis": "المحور الثنائي",
    "Golden Residency": "الإقامة الذهبية",
    "Malaysian Programs": "البرامج الماليزية",
    "Ecosystem": "المنظومة",

    // COMPLETION
    "not a roadmap": "ليس خارطة طريق",
    ". Every element represents a relationship that has already been initiated, an access point confirmed, a program that already exists, or a structure in motion.": ". كلّ عنصر يُمثّل علاقة بدأت بالفعل، أو نقطة وصول مؤكّدة، أو برنامجًا قائمًا، أو هيكلًا في طور التنفيذ.",
    "The SIA integration corridor is not being built. It is being formalized.": "لا يُبنى ممرّ تكامل SIA. بل يُجرى تقنينه.",
    "MDEC has facilitated over USD 402 million in technology investment between 2020 and 2023": "يسّرت MDEC ما يزيد عن ٤٠٢ مليون دولار من الاستثمار التكنولوجي بين عامَي ٢٠٢٠ و٢٠٢٣",
    "— this infrastructure is live.": "— هذه البنية التحتية مفعّلة.",

    // DOORS
    "DOOR 01": "الباب ٠١",
    "DOOR 02": "الباب ٠٢",
    "DOOR 03": "الباب ٠٣",
    "CAPITAL · GCC": "رأس المال · الخليج",
    "INFRASTRUCTURE · MY": "البنية التحتية · ماليزيا",
    "FOUNDERS · TRI-NAT": "المؤسّسون · ثلاثي الجنسيات",
    "For capital.": "لرأس المال.",
    "For infrastructure.": "للبنية التحتية.",
    "For founders.": "للمؤسّسين.",
    "Saudi private investors, VCs, family offices, corporates.": "مستثمرون سعوديون من القطاع الخاص، وصناديق رأس مال جريء، ومكاتب عائلية، وشركات.",
    "Cyberjaya operators, AI companies, ministries, MDEC partners.": "مشغّلو سايبرجايا، وشركات الذكاء الاصطناعي، والوزارات، وشركاء MDEC.",
    "Egypt · Saudi Arabia · Malaysia — operators ready to merge.": "مصر · السعودية · ماليزيا — مشغّلون مستعدّون للاندماج.",
    "Allocate into Malaysian digital infrastructure through a corridor that has already cleared ministerial, MDEC, and embassy-level access. Halal-financing rails available.": "وزّع رأس المال على البنية التحتية الرقمية الماليزية عبر ممرّ تخطّى مسبقًا الوصول الوزاري، وMDEC، ومستوى السفارة. مسارات تمويل حلال متاحة.",
    "Pre-vetted GCC investment partners aligned to Vision 2030 — Saudi embassy budget, ministerial access, and corporate co-investment already in place.": "شركاء استثمار خليجيون مُحقَّق منهم مسبقًا ومتوافقون مع رؤية ٢٠٣٠ — ميزانية السفارة السعودية، والوصول الوزاري، والاستثمار المشترك للشركات جاهزة بالفعل.",
    "Build across three countries on day one. Egypt operations, Saudi capital, Malaysian platform — three founders, one company, one residency package, one regulatory frame.": "ابنِ عبر ثلاث دول من اليوم الأول. عمليات في مصر، ورأس مال سعودي، ومنصّة ماليزية — ثلاثة مؤسّسين، شركة واحدة، حزمة إقامة واحدة، إطار تنظيمي واحد.",
    "Investor-to-asset matching via SIA Portal": "مطابقة المستثمر بالأصل عبر بوّابة SIA",
    "MDEC Digital Status pre-confirmed": "منزلة MDEC الرقمية مؤكّدة مسبقًا",
    "Maybank Islamic financing": "تمويل ماي بنك الإسلامي",
    "GCC partners pre-cleared": "شركاء خليجيون مُجازون مسبقًا",
    "Vision 2030 program alignment": "توافق مع برامج رؤية ٢٠٣٠",
    "Cross-border MOU framework live": "إطار مذكّرات التفاهم العابر للحدود مفعّل",
    "5-year MDEC residency": "إقامة MDEC لخمس سنوات",
    "Tri-national legal structure": "هيكل قانوني ثلاثي الجنسيات",
    "Wider Labs research backbone": "العمود الفقري البحثي لوايدر لابز",
    "Open the capital door": "افتح باب رأس المال",
    "Open the infrastructure door": "افتح باب البنية التحتية",
    "Open the founder door": "افتح باب المؤسّسين",

    // CLOSING
    "The corridor isn't": "الممرّ لا",
    "being built. It's being": "يُبنى. بل يُجرى",
    "formalized.": "تقنينه.",
    "Pick a door. We'll route you to a tailored intake — not a generic form. Capital, infrastructure, or founders.": "اختر بابًا. سنوجّهك إلى استمارة مخصّصة، لا نموذج عام. رأس مال، أو بنية تحتية، أو مؤسّسون.",
    "Download integration framework (PDF)": "حمّل إطار التكامل (PDF)",

    // FOOTER (catch-all common items)
    "© 2025 Saudi Integration Alliance. All access pre-cleared.": "© ٢٠٢٥ تحالف التكامل السعودي. جميع نقاط الوصول مُجازة مسبقًا.",
    "Built across Riyadh · Kuala Lumpur · Cairo": "صُنع عبر الرياض · كوالالمبور · القاهرة",
    "Status": "الحالة",
    "Operational across all three jurisdictions": "تشغيلي في جميع الولايات القضائية الثلاث",
    "Contact": "التواصل",
    "Operating cadence": "الإيقاع التشغيلي",
    "Single cadence · three home jurisdictions": "إيقاع واحد · ثلاث ولايات قضائية",

    // Small UI bits
    "/ 01": "/ ٠١",
    "/ 02": "/ ٠٢",
    "/ 03": "/ ٠٣",
    "/ 04": "/ ٠٤",
    "/ 05": "/ ٠٥",
    "→": "←",
  };

  // === Number conversion (Western → Eastern Arabic numerals) =============
  const E_DIGITS = ['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
  const W_DIGITS = ['0','1','2','3','4','5','6','7','8','9'];
  function toEastern(s) { return s.replace(/[0-9]/g, d => E_DIGITS[+d]); }
  function toWestern(s) { return s.replace(/[٠-٩]/g, d => W_DIGITS[E_DIGITS.indexOf(d)]); }

  // === Walk DOM and snapshot original text on every text node ============
  function snapshotOriginals(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = p.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT;
        if (p.closest('[data-i18n-skip]')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(node => {
      if (!node.__sia_orig) node.__sia_orig = node.nodeValue;
    });
    return nodes;
  }

  function applyLang(lang) {
    const root = document.body;
    const nodes = snapshotOriginals(root);
    nodes.forEach(node => {
      const orig = node.__sia_orig;
      if (lang === 'ar') {
        const trimmed = orig.trim();
        const lead = orig.match(/^\s*/)[0];
        const trail = orig.match(/\s*$/)[0];
        let translated = AR[trimmed];
        if (translated == null) {
          // try with surrounding spaces preserved
          translated = AR[orig];
          if (translated == null) {
            // numerals-only string? convert numerals
            if (/^[\d\s.,$\-/·:]+$/.test(trimmed)) {
              translated = toEastern(trimmed);
            } else {
              translated = trimmed; // leave untranslated content as-is
            }
          }
          translated = lead + translated + trail;
        } else {
          translated = lead + translated + trail;
        }
        node.nodeValue = translated;
      } else {
        node.nodeValue = orig;
      }
    });
    document.documentElement.setAttribute('lang', lang === 'ar' ? 'ar' : 'en');
    document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('data-lang', lang);
    localStorage.setItem(STORE_LANG, lang);
    updateToggleUI();
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORE_THEME, theme);
    updateToggleUI();
  }

  function updateToggleUI() {
    const lang = document.documentElement.getAttribute('data-lang') || 'en';
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    document.querySelectorAll('[data-lang-opt]').forEach(b => {
      b.classList.toggle('is-active', b.dataset.langOpt === lang);
    });
    document.querySelectorAll('[data-theme-opt]').forEach(b => {
      b.classList.toggle('is-active', b.dataset.themeOpt === theme);
    });
  }

  // === Boot ==============================================================
  document.addEventListener('DOMContentLoaded', () => {
    const savedLang = localStorage.getItem(STORE_LANG) || 'en';
    const savedTheme = localStorage.getItem(STORE_THEME) || 'dark';

    // Build snapshot first while DOM is still in EN — defer to after main scripts
    requestAnimationFrame(() => {
      snapshotOriginals(document.body);
      if (savedLang !== 'en') applyLang(savedLang);
      applyTheme(savedTheme);

      document.querySelectorAll('[data-lang-opt]').forEach(btn => {
        btn.addEventListener('click', () => applyLang(btn.dataset.langOpt));
      });
      document.querySelectorAll('[data-theme-opt]').forEach(btn => {
        btn.addEventListener('click', () => applyTheme(btn.dataset.themeOpt));
      });
      updateToggleUI();
    });
  });
})();
