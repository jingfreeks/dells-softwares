import Image from "next/image";

const STORE_NAME = "Dell's Sari-Sari Store";

const ADDRESS_LINE_1 = "P-13A Villahermosa, Brgy. Wangan, Calinan, Davao City";
const PHONE = "+63 921 233 7636 / +63 991 214 1979";
const FACEBOOK = "Dell's Sari-Sari Store";

const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Products", href: "#products" },
  { label: "Hours & Location", href: "#visit" },
  { label: "Contact", href: "#contact" },
];

const HOURS = [
  { days: "Mon – Fri", time: "6:00 AM – 10:00 PM" },
  { days: "Saturday", time: "6:00 AM – 10:00 PM" },
  { days: "Sunday", time: "7:00 AM – 9:00 PM" },
];

const CATEGORIES = [
  {
    mark: "SC",
    title: "Snacks & Chips",
    description: "Chichirya, biscuits, candies, and merienda favorites.",
    image: "/images/snacks-chips-v2.jpg",
  },
  {
    mark: "CG",
    title: "Canned Goods",
    description: "Sardines, corned beef, and pantry staples for any meal.",
    image: undefined as string | undefined,
  },
  {
    mark: "DB",
    title: "Drinks & Beverages",
    description: "Softdrinks, juices, coffee, and cold refreshments.",
    image: undefined as string | undefined,
  },
  {
    mark: "LE",
    title: "Load & E-load",
    description: "Prepaid load, data promos, and e-padala services.",
    image: undefined as string | undefined,
  },
  {
    mark: "HE",
    title: "Household Essentials",
    description: "Detergent, soap, tissue, and everyday home needs.",
    image: undefined as string | undefined,
  },
  {
    mark: "RG",
    title: "Rice & Basic Goods",
    description: "Rice by the kilo, sugar, oil, and cooking basics.",
    image: undefined as string | undefined,
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 font-[family-name:var(--font-tag)] text-xs uppercase tracking-[0.2em] text-[var(--color-sari-red)]">
      <span aria-hidden className="h-2 w-2 bg-[var(--color-sari-red)]" />
      {children}
    </span>
  );
}

function PlankButton({
  href,
  children,
  variant = "solid",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "solid" | "outline" | "ghost";
}) {
  const base =
    "inline-flex items-center gap-2 border-2 px-6 py-3 font-[family-name:var(--font-tag)] text-sm font-bold uppercase tracking-wide transition-transform hover:-translate-y-0.5";
  const style = {
    clipPath:
      "polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px)",
  };
  const variants = {
    solid: "border-[var(--color-grille)] bg-[var(--color-sari-red)] text-[var(--color-paper)]",
    outline: "border-[var(--color-grille)] bg-[var(--color-paper)] text-[var(--color-ink)]",
    ghost: "border-[var(--color-paper)]/60 bg-transparent text-[var(--color-paper)]",
  };
  return (
    <a href={href} className={`${base} ${variants[variant]}`} style={style}>
      {children}
    </a>
  );
}

export default function Home() {
  const mapQuery = encodeURIComponent(ADDRESS_LINE_1);

  return (
    <div className="flex flex-col flex-1">
      <header className="sticky top-0 z-20 bg-[var(--color-paper)]">
        <div className="flex items-center justify-between px-6 py-4 sm:px-10">
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo-badge.jpg"
              alt=""
              width={40}
              height={40}
              className="rounded-full"
            />
            <span className="font-[family-name:var(--font-display)] text-xl tracking-wide">
              {STORE_NAME}
            </span>
          </div>
          <nav className="hidden gap-8 font-[family-name:var(--font-tag)] text-xs uppercase tracking-wide text-[var(--color-ink)]/70 lg:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="hover:text-[var(--color-sari-red)]"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <PlankButton href="#visit">Visit Us</PlankButton>
        </div>
        <div aria-hidden className="grille-divider" />
      </header>

      {/* ---- Opening type statement, cropped/bleeding like a hand-painted signboard ---- */}
      <section id="about" className="overflow-x-clip px-6 pt-16 pb-6 sm:px-10">
        <div className="mx-auto flex max-w-6xl items-start justify-between font-[family-name:var(--font-tag)] text-[11px] uppercase tracking-[0.2em] text-[var(--color-ink)]/60">
          <span>Sari-Sari &amp; E-load</span>
          <span className="text-right">Suki-Friendly Since Day One</span>
        </div>
        <h1 className="-mt-2 text-[clamp(3rem,15vw,15rem)] leading-[0.88] tracking-wide font-[family-name:var(--font-display)] whitespace-nowrap">
          Dell&apos;s Sari-Sari
        </h1>
      </section>

      <section className="relative overflow-hidden">
        <div className="relative aspect-[16/10] w-full sm:aspect-[21/9]">
          <Image
            src="/images/store-hero-v2.jpg"
            alt="Dell's Sari-Sari Store storefront, stocked with snacks and everyday essentials"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
        <p
          aria-hidden
          className="pointer-events-none absolute -bottom-6 right-4 select-none text-[clamp(3rem,12vw,10rem)] text-[var(--color-sari-red)] font-[family-name:var(--font-script)] sm:right-10"
        >
          Suki.
        </p>
      </section>

      <div aria-hidden className="grille-divider" />

      {/* ---- Our story: centered statement with script overlay ---- */}
      <section className="overflow-x-clip bg-[var(--color-paper)] px-6 py-24 text-center sm:px-10">
        <Eyebrow>Kwento &middot; Our Story</Eyebrow>
        <p className="mx-auto mt-6 max-w-3xl font-[family-name:var(--font-display)] text-2xl leading-snug tracking-wide sm:text-3xl">
          {STORE_NAME} IS A NEIGHBORHOOD TINDAHAN BUILT ON TRUST, RUNNING ON
          FAIR PRICES AND FAMILIAR FACES.
        </p>
        <p className="mt-4 max-w-2xl mx-auto whitespace-nowrap overflow-visible text-[clamp(3rem,10vw,7rem)] leading-none text-[var(--color-sari-red)]/90 font-[family-name:var(--font-script)]">
          Small store, big kwentuhan
        </p>
        <p className="mx-auto mt-6 max-w-xl font-[family-name:var(--font-body)] text-[var(--color-ink)]/70">
          No frills, no long lines — just everyday essentials, fair prices,
          and a friendly &ldquo;kamusta&rdquo; every time you walk in.
        </p>
        <div className="mt-10 flex justify-center">
          <Image
            src="/images/logo-badge.jpg"
            alt="Dell's Sari-Sari Store medallion badge — Your Neighborhood, Your Store."
            width={200}
            height={200}
            className="rounded-full shadow-lg"
          />
        </div>
      </section>

      {/* ---- Products: editorial grid, no icon cards ---- */}
      <section
        id="products"
        className="overflow-x-clip bg-[var(--color-wood-light)]/20 px-6 py-24 sm:px-10"
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <Eyebrow>Paninda &middot; What We Sell</Eyebrow>
            <h2 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-wide sm:text-5xl">
              Everything you need
            </h2>
            <p className="mt-1 whitespace-nowrap text-[clamp(2.5rem,8vw,5.5rem)] leading-none text-[var(--color-sari-red)]/85 font-[family-name:var(--font-script)]">
              just steps away
            </p>
          </div>
          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((category, i) => (
              <div key={category.title} className="group">
                <div
                  className="grille-frame relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-[var(--color-wood)] transition-transform duration-200 group-hover:-translate-y-1"
                  style={{
                    backgroundColor:
                      i % 2 === 0 ? "var(--color-wood)" : "var(--color-grille)",
                  }}
                >
                  {category.image ? (
                    <Image
                      src={category.image}
                      alt={category.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <span className="font-[family-name:var(--font-display)] text-6xl tracking-wide text-[var(--color-paper)]/25">
                      {category.mark}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-[family-name:var(--font-display)] text-xl tracking-wide">
                  {category.title}
                </h3>
                <p className="mt-1 text-sm text-[var(--color-ink)]/60">
                  {category.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Dark spotlight section ---- */}
      <section className="relative overflow-hidden bg-[var(--color-grille)] px-6 py-24 text-[var(--color-paper)] sm:px-10">
        <div className="mx-auto max-w-6xl text-center">
          <Eyebrow>Paalala Mula Kay Dell &middot; A Note From The Owner</Eyebrow>
          <p className="mt-4 whitespace-nowrap text-[clamp(3rem,11vw,8rem)] leading-none text-[var(--color-sari-red)] font-[family-name:var(--font-script)]">
            Dear Suki,
          </p>
        </div>
        <div className="relative mx-auto mt-10 max-w-4xl">
          <div className="relative aspect-[16/9] w-full overflow-hidden">
            <Image
              src="/images/store-hero-v2.jpg"
              alt="Inside Dell's Sari-Sari Store, shelves stocked with snacks and daily goods"
              fill
              sizes="(max-width: 768px) 100vw, 800px"
              className="object-cover brightness-[0.65]"
            />
          </div>
          <p className="absolute bottom-6 left-6 max-w-sm font-[family-name:var(--font-display)] text-2xl leading-tight tracking-wide sm:text-3xl">
            Small store. Big kwentuhan.
          </p>
        </div>
      </section>

      {/* ---- Visit us: two-tone CTA panel ---- */}
      <section id="visit" className="grid sm:grid-cols-2">
        <div className="flex flex-col justify-center gap-6 bg-[var(--color-paper)] px-6 py-20 sm:px-10">
          <Eyebrow>Bisitahin &middot; Visit Us</Eyebrow>
          <h2 className="font-[family-name:var(--font-display)] text-4xl leading-[0.95] tracking-wide sm:text-5xl">
            Halika, dumalaw ka.
          </h2>
          <p className="max-w-sm text-[var(--color-ink)]/70">
            It would be our pleasure to have you at the counter — whether
            it&apos;s a quick top-up or a long &ldquo;kamusta.&rdquo;
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <PlankButton href="#contact">See Store Hours</PlankButton>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-6 bg-[var(--color-wood)] px-6 py-20 text-[var(--color-paper)] sm:px-10">
          <div className="border-2 border-[var(--color-roof)]/40 bg-[var(--color-grille)]/30 p-5">
            <p className="font-[family-name:var(--font-tag)] text-xs uppercase tracking-[0.2em] text-[var(--color-roof)]">
              Store Hours
            </p>
            <dl className="mt-3 divide-y divide-[var(--color-paper)]/15 font-[family-name:var(--font-tag)] text-sm">
              {HOURS.map((row) => (
                <div key={row.days} className="flex justify-between py-2">
                  <dt className="text-[var(--color-paper)]/70">{row.days}</dt>
                  <dd>{row.time}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div
            id="contact"
            className="border-2 border-[var(--color-roof)]/40 bg-[var(--color-grille)]/30 p-5"
          >
            <p className="font-[family-name:var(--font-tag)] text-xs uppercase tracking-[0.2em] text-[var(--color-roof)]">
              Address
            </p>
            <p className="mt-2 text-sm">{ADDRESS_LINE_1}</p>
          </div>
          <div className="grille-frame overflow-hidden bg-[var(--color-paper)] p-2 shadow-lg">
            <iframe
              title="Store location map"
              className="h-56 w-full"
              loading="lazy"
              src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
            />
          </div>
        </div>
      </section>

      <footer className="bg-[var(--color-grille)] px-6 py-10 text-center text-sm text-[var(--color-paper)]/80">
        <div className="mx-auto flex w-fit items-center justify-center">
          <Image
            src="/images/logo-badge.jpg"
            alt=""
            width={44}
            height={44}
            className="rounded-full"
          />
        </div>
        <p className="mt-3 font-[family-name:var(--font-display)] tracking-wide text-[var(--color-paper)]">
          {STORE_NAME}
        </p>
        <p className="mt-2 font-[family-name:var(--font-tag)] text-xs">
          {PHONE} &nbsp;&middot;&nbsp; {FACEBOOK}
        </p>
        <p className="mt-4 text-xs text-[var(--color-paper)]/50">
          © {new Date().getFullYear()} {STORE_NAME}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
