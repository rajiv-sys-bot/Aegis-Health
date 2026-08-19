import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronDown,
  Clock3,
  DatabaseZap,
  EyeOff,
  Fingerprint,
  FileCheck2,
  HeartPulse,
  KeyRound,
  Landmark,
  LockKeyhole,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Timer,
  Zap,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Reveal } from "@/components/reveal";
import { WalletConnectButton } from "@/components/wallet-connect-button";
import { CONTRACT_ID, EXPLORER_URL } from "@/lib/stellar-config";

const STATS = [
  {
    value: "0",
    label: "plaintext records on-chain",
    detail: "Only SHA-256 integrity proofs reach Soroban.",
  },
  {
    value: "100%",
    label: "patient-held signing keys",
    detail: "Every grant is signed by your own wallet.",
  },
  {
    value: "<2s",
    label: "median consent verification",
    detail: "Gateway checks grants against live ledger state.",
  },
  {
    value: "24/7",
    label: "tamper-evident audit trail",
    detail: "Typed events for every grant, fetch, revoke.",
  },
] as const;

const FEATURES = [
  {
    icon: DatabaseZap,
    title: "Bytes never touch the chain",
    copy: "Records are encrypted off-chain. Soroban receives a hash and permission metadata — nothing readable, ever.",
  },
  {
    icon: Fingerprint,
    title: "Wallet-native identity",
    copy: "Your Stellar keypair is your login and your signature. No passwords to leak, no separate identity provider.",
  },
  {
    icon: Timer,
    title: "Time-bound grants",
    copy: "Every permission carries an expiry enforced by the contract itself — access lapses even if nobody remembers to revoke.",
  },
  {
    icon: EyeOff,
    title: "Instant revocation",
    copy: "One signature kills a grant. The gateway refuses every subsequent fetch, mid-session or not.",
  },
  {
    icon: ScrollText,
    title: "Immutable audit log",
    copy: "Grants, verifications and revocations emit typed events you can replay years later — proof, not promises.",
  },
  {
    icon: Zap,
    title: "Atomic claim settlement",
    copy: "Approved claims pay providers in stablecoin within the same flow — no invoicing limbo, no reconciliation teams.",
  },
] as const;

const ROLES = [
  {
    icon: HeartPulse,
    name: "Patients",
    href: "/dashboard/patient",
    cta: "Open patient dashboard",
    bullets: [
      "One encrypted record across every clinic",
      "Grant precise, time-boxed access in two clicks",
      "See exactly who read what, and when",
    ],
    featured: true,
  },
  {
    icon: Stethoscope,
    name: "Clinics",
    href: "/dashboard/doctor",
    cta: "Open clinic console",
    bullets: [
      "Verify a live grant before touching a chart",
      "Publish records straight into the patient's vault",
      "Zero liability for custody you never had",
    ],
    featured: false,
  },
  {
    icon: Landmark,
    name: "Insurers",
    href: "/claims",
    cta: "Review claims queue",
    bullets: [
      "Approve claims against tamper-proof evidence",
      "Settle providers atomically in stablecoin",
      "Auditable trail for every payout decision",
    ],
    featured: false,
  },
] as const;

const SECURITY_CHECKS = [
  "AES-256 encryption happens client-side, before any byte leaves you",
  "Only SHA-256 integrity proofs are published to Soroban",
  "Grant expiry is enforced by the contract, not by trust",
  "The gateway re-verifies the live grant on every single fetch",
  "Revocation takes effect instantly — no waiting on hospital IT",
] as const;

const GATEWAY_LOG = [
  { label: "GET", detail: "/records/r_8f42 · clinic request", tone: "text-ink-secondary" },
  { label: "GRANT", detail: "live · expires in 23h 41m", tone: "text-success" },
  { label: "KEYVER", detail: "v3 matches grant version", tone: "text-success" },
  { label: "SHA256", detail: "integrity proof verified on-chain", tone: "text-success" },
  { label: "200 OK", detail: "encrypted payload released", tone: "text-info" },
] as const;

const FAQS = [
  {
    q: "Where do my medical files actually live?",
    a: "In encrypted storage, sealed client-side before anything leaves your device. Neither Aegis nor the clinics hold plaintext copies you didn't explicitly hand over through a live grant.",
  },
  {
    q: "What exactly gets written to the Stellar ledger?",
    a: "Only what's needed for verification: SHA-256 integrity hashes of encrypted records, permission grants with recipient and expiry, revocations, and typed events for claims. No names, no diagnoses, no documents.",
  },
  {
    q: "Can a clinic still read my record after I revoke access?",
    a: "No. Every fetch requires a live grant at the moment of download — revoked means the gateway refuses immediately. Anything previously viewed under an active grant remains their clinical responsibility, as with paper charts today.",
  },
  {
    q: "Do I need a specific wallet?",
    a: "Aegis works with Freighter out of the box on Stellar testnet today. Your wallet key signs every grant and revoke, so custody stays entirely with you.",
  },
  {
    q: "What do approved claims settle in?",
    a: "Providers are paid atomically in stablecoin through the same Soroban contract that recorded the consent — approval and payment can't drift apart.",
  },
] as const;

export default function Home() {
  return (
    <main>
      {/* ---------------------------------------------------------- hero */}
      <section className="relative overflow-hidden bg-[#073F3F] text-white">
        <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:48px_48px]" />
        <div className="absolute -top-24 right-[8%] size-[420px] rounded-full bg-[#1B8C7A]/25 blur-3xl animate-float-slow" />
        <div className="absolute bottom-[-180px] left-[-140px] size-[480px] rounded-full bg-[#67D9BD]/12 blur-3xl animate-float" />

        <div className="relative mx-auto grid max-w-[1280px] gap-14 px-5 pt-16 pb-20 sm:px-8 sm:pt-24 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:px-12 lg:pt-28 lg:pb-28">
          <div>
            <div className="animate-fade-up mb-6 inline-flex items-center gap-2 rounded-full border border-[#5FA99C]/40 bg-[#0A4D4D] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#BDE8DF]">
              <span className="relative inline-flex size-1.5 rounded-full bg-[#67D9BD] text-[#67D9BD] pulse-ring" />
              Live on Stellar testnet
            </div>
            <h1
              className="animate-fade-up max-w-3xl text-[43px] leading-[1.03] font-semibold tracking-[-0.055em] sm:text-6xl lg:text-[72px]"
              style={{ animationDelay: "120ms" }}
            >
              Your health history.
              <br />
              <span className="text-[#9ED9CE]">Under your signature.</span>
            </h1>
            <p
              className="animate-fade-up mt-6 max-w-xl text-base leading-7 text-[#C2DCD7] sm:text-lg"
              style={{ animationDelay: "240ms" }}
            >
              Carry one encrypted record across clinics. Grant precise,
              time-bound access. Revoke permission without waiting on hospital
              systems.
            </p>
            <div
              className="animate-fade-up mt-8 flex flex-col gap-3 sm:flex-row"
              style={{ animationDelay: "360ms" }}
            >
              <WalletConnectButton />
              <Link
                href="/dashboard/patient"
                className="group inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#6FA99F]/50 px-4 text-sm font-bold text-[#E0F1EE] transition hover:bg-white/10"
              >
                Explore dashboard{" "}
                <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
            <div
              className="animate-fade-up mt-9 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-[#A8CBC5]"
              style={{ animationDelay: "480ms" }}
            >
              {[
                "Encrypted off-chain",
                "Consent on-chain",
                "Revocable by patient",
              ].map((item) => (
                <span key={item} className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-[#62D1B7]" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div
            className="animate-fade-up relative mx-auto w-full max-w-[560px]"
            style={{ animationDelay: "320ms" }}
          >
            {/* floating accent chips */}
            <div className="animate-float absolute -top-7 -right-4 z-10 hidden items-center gap-2 rounded-full border border-white/15 bg-[#0B4949]/95 px-3.5 py-2 text-xs font-bold text-[#B9F4E4] shadow-[0_16px_40px_rgba(0,20,20,.35)] backdrop-blur lg:inline-flex">
              <BadgeCheck className="size-4 text-[#67D9BD]" />
              New grant signed · 2m ago
            </div>
            <div className="animate-float-delayed absolute -bottom-6 -left-5 z-10 hidden items-center gap-2 rounded-full border border-white/15 bg-[#0B4949]/95 px-3.5 py-2 text-xs font-bold text-[#FFE8AE] shadow-[0_16px_40px_rgba(0,20,20,.35)] backdrop-blur lg:inline-flex">
              <LockKeyhole className="size-4" />
              AES-256 sealed
            </div>

            <div className="relative overflow-hidden rounded-[26px] border border-white/15 bg-[#0B4949]/90 p-5 shadow-[0_30px_80px_rgba(0,20,20,.35)] backdrop-blur sm:p-7">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#87C7BB]">
                    Consent pulse
                  </p>
                  <p className="mt-1 text-sm font-bold">
                    One record · three proofs
                  </p>
                </div>
                <span className="rounded-full bg-[#0F654F] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#B9F4E4]">
                  Protected
                </span>
              </div>
              <div className="mt-6 space-y-0">
                {[
                  {
                    icon: LockKeyhole,
                    label: "Record encrypted",
                    detail: "Cardiology report · AES-256",
                    tone: "bg-[#BDE8DF] text-[#07584D]",
                  },
                  {
                    icon: Fingerprint,
                    label: "Patient signed",
                    detail: "Consent expires in 23h 42m",
                    tone: "bg-[#FFE8AE] text-[#8A5700]",
                  },
                  {
                    icon: ShieldCheck,
                    label: "Clinic verified",
                    detail: "Soroban ledger #5,491,882",
                    tone: "bg-white text-[#0B5D5D]",
                  },
                ].map(({ icon: Icon, label, detail, tone }, index) => (
                  <div
                    key={label}
                    className="relative grid grid-cols-[44px_1fr] gap-4 pb-7 last:pb-0 before:absolute before:top-10 before:bottom-0 before:left-[21px] before:w-px before:bg-[#6CB5A8]/40 last:before:hidden"
                  >
                    <span
                      className={`relative z-10 grid size-11 place-items-center rounded-2xl ${tone}`}
                    >
                      <Icon className="size-5" />
                    </span>
                    <div className="pt-0.5">
                      <div className="flex items-center gap-2">
                        <p className="font-bold">{label}</p>
                        <span
                          className={`size-1.5 rounded-full ${index === 1 ? "bg-[#F8B532]" : "bg-[#54D0B2]"}`}
                        />
                      </div>
                      <p className="mt-1 text-xs text-[#9FC5BE]">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-7 flex items-center justify-between rounded-xl bg-[#063939] px-4 py-3">
                <span className="font-mono text-[10px] text-[#85B9B0]">
                  {CONTRACT_ID
                    ? `${CONTRACT_ID.slice(0, 10)}…${CONTRACT_ID.slice(-8)}`
                    : "contract not deployed yet"}
                </span>
                {CONTRACT_ID ? (
                  <a
                    href={`${EXPLORER_URL}/contract/${CONTRACT_ID}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold uppercase tracking-wider text-[#A9E4D8]"
                  >
                    View contract ↗
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- trust strip */}
      <section className="border-b border-[#D5E7E3] bg-white">
        <div className="mx-auto grid max-w-[1280px] divide-y divide-[#DDEBE8] px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8 lg:px-12">
          {[
            {
              icon: ShieldCheck,
              title: "Auditable consent",
              copy: "Every grant and revoke produces a typed Soroban event.",
            },
            {
              icon: DatabaseZap,
              title: "Records stay private",
              copy: "Only integrity hashes and permissions reach the public ledger.",
            },
            {
              icon: Sparkles,
              title: "Settlement without delay",
              copy: "Approved claims pay providers atomically in stablecoin.",
            },
          ].map(({ icon: Icon, title, copy }, index) => (
            <Reveal key={title} delay={index * 110} y={14}>
              <div className="group flex h-full gap-4 py-7 transition-colors duration-300 hover:bg-[#F6FBFA] sm:px-6 first:pl-0 last:pr-0">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-[#E6F4F1] transition-colors duration-300 group-hover:bg-[#0B5D5D] group-hover:text-white">
                  <Icon className="size-4.5 text-[#0B6D65] transition-colors duration-300 group-hover:text-white" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-[#244945]">{title}</h2>
                  <p className="mt-1 text-xs leading-5 text-[#6A807C]">{copy}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- stats band */}
      <section className="border-b border-[#D5E7E3] bg-white px-5 py-16 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1280px] gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map(({ value, label, detail }, index) => (
            <Reveal key={label} delay={index * 90}>
              <div className="border-l-2 border-[#CFE7E2] pl-5 transition-colors duration-300 hover:border-brand-500">
                <p className="font-mono text-4xl font-bold tracking-tight text-[#0B5D5D]">
                  {value}
                </p>
                <p className="mt-2 text-sm font-bold text-[#244743]">{label}</p>
                <p className="mt-1.5 text-xs leading-5 text-[#687E7A]">
                  {detail}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------- how it works */}
      <section id="how-it-works" className="bg-[#F3FAF8] px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1280px]">
          <Reveal>
            <div className="mb-12 max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-[#4D7A72]">
                Care without data silos
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#163D3D] sm:text-4xl">
                Built around consent, not custody.
              </h2>
              <p className="mt-4 text-base leading-7 text-[#55706C]">
                Three moves take a record from a scanner in one building to a
                specialist in another — with the patient signing every hop.
              </p>
            </div>
          </Reveal>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                icon: FileCheck2,
                step: "01",
                title: "Encrypt once",
                copy: "Clinic encrypts record off-chain. Contract receives only SHA-256 integrity proof.",
              },
              {
                icon: KeyRound,
                step: "02",
                title: "Grant deliberately",
                copy: "Choose recipient and expiry. Sign permission with your own Stellar wallet.",
              },
              {
                icon: ShieldCheck,
                step: "03",
                title: "Verify every fetch",
                copy: "Gateway checks live grant and matching key version before releasing bytes.",
              },
            ].map(({ icon: Icon, step, title, copy }, index) => (
              <Reveal key={step} delay={index * 130}>
                <article className="group h-full rounded-2xl border border-[#D5E6E2] bg-white p-6 shadow-[0_10px_30px_rgba(25,74,68,.04)] transition-all duration-300 hover:-translate-y-1 hover:border-brand-400/60 hover:shadow-pop">
                  <div className="flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-xl bg-[#E6F4F1] text-[#0B5D5D] transition-colors duration-300 group-hover:bg-[#0B5D5D] group-hover:text-white">
                      <Icon className="size-5" />
                    </span>
                    <span className="font-mono text-xs font-bold text-[#8AA09C]">
                      {step}
                    </span>
                  </div>
                  <h3 className="mt-7 text-lg font-bold text-[#244743]">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#687E7A]">{copy}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- feature grid */}
      <section id="features" className="border-y border-[#D5E7E3] bg-white px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1280px]">
          <Reveal>
            <div className="mb-12 max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-[#4D7A72]">
                Platform
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#163D3D] sm:text-4xl">
                Everything consent touches, we hardened.
              </h2>
            </div>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, copy }, index) => (
              <Reveal key={title} delay={(index % 3) * 110}>
                <article className="group h-full rounded-2xl border border-[#DCEBE8] bg-[#FBFEFD] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-400/60 hover:bg-white hover:shadow-pop">
                  <span className="grid size-11 place-items-center rounded-xl bg-[#E6F4F1] text-[#0B5D5D] transition-colors duration-300 group-hover:bg-[#0B5D5D] group-hover:text-white">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 text-base font-bold text-[#244743]">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#687E7A]">{copy}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- role split */}
      <section id="roles" className="bg-[#F3FAF8] px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-[1280px]">
          <Reveal>
            <div className="mb-12 max-w-2xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-[#4D7A72]">
                One ledger, three seats
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#163D3D] sm:text-4xl">
                Same contract. Different superpowers.
              </h2>
            </div>
          </Reveal>
          <div className="grid gap-4 lg:grid-cols-3">
            {ROLES.map(({ icon: Icon, name, href, cta, bullets, featured }, index) => (
              <Reveal key={name} delay={index * 130}>
                <article
                  className={
                    featured
                      ? "relative h-full overflow-hidden rounded-2xl bg-[#073F3F] p-7 text-white shadow-[0_24px_60px_rgba(7,63,63,.25)]"
                      : "h-full rounded-2xl border border-[#D5E6E2] bg-white p-7 shadow-[0_10px_30px_rgba(25,74,68,.04)]"
                  }
                >
                  {featured && (
                    <>
                      <div className="absolute -top-20 -right-16 size-56 rounded-full bg-[#1B8C7A]/30 blur-3xl" />
                      <span className="relative mb-6 inline-flex items-center gap-1.5 rounded-full bg-[#0F654F] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#B9F4E4]">
                        Start here
                      </span>
                    </>
                  )}
                  <div className="relative flex items-center gap-3">
                    <span
                      className={
                        featured
                          ? "grid size-11 place-items-center rounded-xl bg-white/10 text-[#B9F4E4]"
                          : "grid size-11 place-items-center rounded-xl bg-[#E6F4F1] text-[#0B5D5D]"
                      }
                    >
                      <Icon className="size-5" />
                    </span>
                    <h3
                      className={`text-lg font-bold ${featured ? "text-white" : "text-[#244743]"}`}
                    >
                      {name}
                    </h3>
                  </div>
                  <ul className="relative mt-6 space-y-3">
                    {bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className={`flex items-start gap-2.5 text-sm leading-6 ${
                          featured ? "text-[#C2DCD7]" : "text-[#55706C]"
                        }`}
                      >
                        <Check
                          className={`mt-1 size-4 shrink-0 ${featured ? "text-[#62D1B7]" : "text-[#0B6D65]"}`}
                        />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={href}
                    className={`group/link relative mt-7 inline-flex items-center gap-1.5 text-sm font-bold transition-colors ${
                      featured
                        ? "text-[#9ED9CE] hover:text-white"
                        : "text-[#0B6D65] hover:text-[#073F3F]"
                    }`}
                  >
                    {cta}
                    <ArrowRight className="size-4 transition-transform duration-300 group-hover/link:translate-x-1" />
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ security */}
      <section id="security" className="border-y border-[#D5E7E3] bg-white px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1280px] items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-[#4D7A72]">
                Security model
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#163D3D] sm:text-4xl">
                Private by architecture, not by policy.
              </h2>
              <p className="mt-4 max-w-lg text-base leading-7 text-[#55706C]">
                Privacy here isn&apos;t a settings page — it&apos;s what the
                system is physically unable to do. The ledger literally never
                sees your data.
              </p>
              <ul className="mt-8 space-y-4">
                {SECURITY_CHECKS.map((check) => (
                  <li
                    key={check}
                    className="flex items-start gap-3 text-sm leading-6 font-medium text-[#2C4B47]"
                  >
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#E2F4EA] text-success">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                    {check}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={160} className="relative">
            <div className="animate-float absolute -top-6 -right-3 z-10 hidden rounded-full border border-line-strong bg-white px-3.5 py-2 text-xs font-bold text-[#0B5D5D] shadow-card lg:inline-flex">
              <ShieldCheck className="mr-1.5 size-4 text-brand-600" />
              Zero plaintext stored
            </div>
            <div className="overflow-hidden rounded-2xl border border-[#D5E6E2] bg-[#0B3B3B] p-6 shadow-[0_24px_60px_rgba(7,40,40,.22)] sm:p-7">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <p className="font-mono text-xs font-bold text-[#9ED9CE]">
                  gateway · live check
                </p>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#B9F4E4]">
                  <Clock3 className="size-3.5" /> real-time
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {GATEWAY_LOG.map(({ label, detail, tone }, index) => (
                  <Reveal key={label} delay={index * 180} y={12}>
                    <div className="flex items-center gap-3 rounded-lg bg-white/5 px-3.5 py-2.5">
                      <span
                        className={`w-16 shrink-0 font-mono text-[11px] font-bold ${tone === "text-success" ? "text-[#67D9BD]" : tone === "text-info" ? "text-[#8AB8FF]" : "text-[#9FC5BE]"}`}
                      >
                        {label}
                      </span>
                      <span className="truncate font-mono text-[11px] text-[#C2DCD7]">
                        {detail}
                      </span>
                      <span className="ml-auto size-1.5 shrink-0 rounded-full bg-[#54D0B2]" />
                    </div>
                  </Reveal>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between rounded-xl bg-[#063939] px-4 py-3">
                <span className="font-mono text-[10px] text-[#85B9B0]">
                  {CONTRACT_ID
                    ? `${CONTRACT_ID.slice(0, 12)}…${CONTRACT_ID.slice(-6)}`
                    : "soroban testnet"}
                </span>
                {CONTRACT_ID ? (
                  <a
                    href={`${EXPLORER_URL}/contract/${CONTRACT_ID}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-bold uppercase tracking-wider text-[#A9E4D8] transition-colors hover:text-white"
                  >
                    Inspect ↗
                  </a>
                ) : null}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------------- FAQ */}
      <section id="faq" className="bg-[#F3FAF8] px-5 py-20 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <Reveal>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-[#4D7A72]">
                FAQ
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#163D3D] sm:text-4xl">
                Questions patients ask us first.
              </h2>
              <p className="mt-4 max-w-md text-base leading-7 text-[#55706C]">
                Still curious? Open the audit log and watch the contract work —
                every answer is on-chain.
              </p>
              <Link
                href="/audit"
                className="mt-6 inline-flex h-10 items-center gap-2 rounded-full border border-[#C4DAD6] bg-white px-4 text-sm font-bold text-[#0B5D5D] transition hover:border-brand-400 hover:shadow-card"
              >
                View audit log <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={140}>
            <div className="space-y-3">
              {FAQS.map(({ q, a }) => (
                <details
                  key={q}
                  className="group rounded-2xl border border-[#D5E6E2] bg-white px-5 transition-colors duration-300 open:border-brand-400/60 open:shadow-card"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-bold text-[#244743] [&::-webkit-details-marker]:hidden">
                    {q}
                    <ChevronDown className="faq-chevron size-4 shrink-0 text-[#8AA09C] transition-colors group-open:text-[#0B5D5D]" />
                  </summary>
                  <div className="faq-body pb-5 pr-8 text-sm leading-6 text-[#55706C]">
                    {a}
                  </div>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ----------------------------------------------------------- CTA */}
      <section className="bg-white px-5 py-20 sm:px-8 lg:px-12">
        <Reveal>
          <div className="relative mx-auto max-w-[1280px] overflow-hidden rounded-[32px] bg-[#073F3F] px-6 py-16 text-center text-white sm:px-12 sm:py-20">
            <div className="absolute -top-32 left-1/2 size-[420px] -translate-x-1/2 rounded-full bg-[#1B8C7A]/30 blur-3xl animate-float-slow" />
            <div className="absolute inset-0 opacity-15 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:48px_48px]" />
            <div className="relative">
              <p className="text-[11px] font-bold uppercase tracking-[0.17em] text-[#87C7BB]">
                Ready when you are
              </p>
              <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Your records. Your rules.
                <span className="block text-[#9ED9CE]">Starting now.</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-[#C2DCD7]">
                Connect a Freighter wallet on testnet and walk the full flow —
                encrypt, grant, verify, settle — in under five minutes.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <WalletConnectButton />
                <Link
                  href="/dashboard/patient"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#6FA99F]/50 px-4 text-sm font-bold text-[#E0F1EE] transition hover:bg-white/10"
                >
                  Explore dashboard <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* -------------------------------------------------------- footer */}
      <footer className="border-t border-white/5 bg-[#062B2B] text-white">
        <div className="mx-auto max-w-[1280px] px-5 pt-16 pb-8 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-[1.3fr_.7fr_.7fr_.9fr]">
            <div>
              <BrandMark inverted />
              <p className="mt-5 max-w-xs text-sm leading-6 text-[#8FB5AF]">
                Patient-owned health records with consent enforcement secured by
                Stellar Soroban smart contracts.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#5FA99C]/30 bg-[#0A3D3D] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#BDE8DF]">
                <span className="relative inline-flex size-1.5 rounded-full bg-[#67D9BD] text-[#67D9BD] pulse-ring" />
                Stellar testnet · demo
              </div>
            </div>

            <nav aria-label="Product">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.17em] text-[#6E9891]">
                Product
              </h3>
              <ul className="mt-5 space-y-3 text-sm">
                {[
                  { href: "/dashboard/patient", label: "My records" },
                  { href: "/dashboard/doctor", label: "Clinic console" },
                  { href: "/claims", label: "Claims & payouts" },
                  { href: "/audit", label: "Audit log" },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-[#A9CBC5] transition-colors hover:text-white"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Learn more">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.17em] text-[#6E9891]">
                Learn
              </h3>
              <ul className="mt-5 space-y-3 text-sm">
                {[
                  { href: "#features", label: "Features" },
                  { href: "#security", label: "Security model" },
                  { href: "#faq", label: "FAQ" },
                  { href: "#how-it-works", label: "How it works" },
                ].map(({ href, label }) => (
                  <li key={href}>
                    <a
                      href={href}
                      className="text-[#A9CBC5] transition-colors hover:text-white"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label="Network">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.17em] text-[#6E9891]">
                Network
              </h3>
              <ul className="mt-5 space-y-3 text-sm">
                {(CONTRACT_ID
                  ? [
                      {
                        href: `${EXPLORER_URL}/contract/${CONTRACT_ID}`,
                        label: "View contract ↗",
                      },
                      { href: `${EXPLORER_URL}`, label: "Block explorer ↗" },
                    ]
                  : []
                ).map(({ href, label }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#A9CBC5] transition-colors hover:text-white"
                    >
                      {label}
                    </a>
                  </li>
                ))}
                {[
                  {
                    href: "https://developers.stellar.org/docs/smart-contracts",
                    label: "Soroban docs ↗",
                  },
                  { href: "https://www.freighter.app/", label: "Freighter wallet ↗" },
                ].map(({ href, label }) => (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#A9CBC5] transition-colors hover:text-white"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-[#7FA8A2]">
              © {new Date().getFullYear()} Aegis Health · Built on Stellar
              Soroban
            </p>
            <p className="max-w-md text-[11px] leading-5 text-[#5E8883]">
              Demo deployment on testnet. Not medical advice, not a covered
              health service — no real patient data, please.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
