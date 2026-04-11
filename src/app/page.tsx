import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowRight, Cpu, Film, Globe, Youtube } from "lucide-react";

export const metadata = {
  title: "Algo Thinker — Documentaries on AI, Autonomous Systems & Emerging Tech",
  description:
    "Long-form visual documentaries about AI, machine learning, autonomous systems, and the engineering behind the technologies redefining modern life.",
  openGraph: {
    title: "Algo Thinker",
    description:
      "Long-form documentaries about AI, autonomous systems, and emerging technologies.",
    url: "https://algo-thinker.com",
    type: "website",
    images: ["/og-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Algo Thinker",
    description:
      "Long-form documentaries about AI, autonomous systems, and emerging technologies.",
    images: ["/og-image.png"],
  },
};

// Static page — no data fetching, safe to prerender
export const dynamic = "auto";

export default function LandingPage() {
  return (
    <div className="space-y-24">
      {/* ─── Hero ───────────────────────────────────────────── */}
      <section className="pt-12 pb-8 relative">
        {/* Subtle radial glow behind the hero — matches the cyan/amber palette */}
        <div
          className="absolute inset-0 -z-10 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(57, 198, 255, 0.12), transparent 60%), radial-gradient(ellipse 60% 40% at 20% 80%, rgba(255, 181, 71, 0.06), transparent 60%)",
          }}
        />
        <Image
          src="/logo-icon.png"
          alt="Algo Thinker"
          width={120}
          height={120}
          className="mb-6 drop-shadow-[0_0_40px_rgba(57,198,255,0.25)]"
          priority
        />
        <div className="inline-block mb-5 px-3.5 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/[0.08]">
          <span className="font-mono text-[11px] font-semibold tracking-[0.15em] uppercase text-cyan-400">
            Documentary · AI · Engineering
          </span>
        </div>
        <h1 className="text-[clamp(2.5rem,6vw,4.25rem)] font-extrabold leading-[1.05] tracking-tight max-w-4xl">
          <span className="bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
            Decoding how the{" "}
          </span>
          <span className="bg-gradient-to-br from-cyan-400 to-amber-400 bg-clip-text text-transparent">
            machines
          </span>
          <span className="bg-gradient-to-b from-foreground to-muted-foreground bg-clip-text text-transparent">
            {" "}
            that shape our world actually work.
          </span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl leading-relaxed">
          Algo Thinker produces long-form visual documentaries about artificial
          intelligence, autonomous systems, and the engineering behind the
          technologies redefining modern life — from Tesla&apos;s Full
          Self-Driving to the X recommendation algorithm.
        </p>
        <div className="mt-8 flex gap-3 flex-wrap">
          <a
            href="https://www.youtube.com/@AlgoThinker"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="lg" className="bg-cyan-500 text-neutral-950 hover:bg-cyan-400">
              <Youtube className="size-4" />
              Watch on YouTube
              <ArrowRight className="size-4" />
            </Button>
          </a>
          <a href="#contact">
            <Button size="lg" variant="outline">
              Get in touch
            </Button>
          </a>
        </div>

        {/* Stats bar */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 border-y border-border">
          <Stat value="20+" label="Documentaries" />
          <Stat value="25 min" label="Avg. episode length" />
          <Stat value="AI · ML · AV" label="Focus areas" />
        </div>
      </section>

      {/* ─── About ──────────────────────────────────────────── */}
      <section id="about" className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">What we do</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl text-base leading-relaxed">
            We break down the most consequential engineering decisions of our
            era — the ones that shape how billions of people travel, communicate,
            and interact with intelligent systems.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard
            icon={<Cpu className="size-5" />}
            title="Technical depth"
            body="Original research, paper reviews, and reverse-engineering of production AI systems — presented with custom animations and architectural diagrams."
          />
          <FeatureCard
            icon={<Film className="size-5" />}
            title="Cinematic storytelling"
            body="Documentary-style pacing, multi-layer sound design, and visual language inspired by the best science explainers — without losing engineering rigor."
          />
          <FeatureCard
            icon={<Globe className="size-5" />}
            title="Global audience"
            body="Content designed for engineers, computer science students, and technology enthusiasts worldwide — from Silicon Valley to Bengaluru."
          />
        </div>
      </section>

      {/* ─── Featured work ──────────────────────────────────── */}
      <section id="work" className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Featured work</h2>
          <p className="mt-3 text-muted-foreground max-w-2xl text-base leading-relaxed">
            Each documentary takes weeks of research, custom animation, and
            engineering breakdown — distilled into 20-30 minute episodes that
            explain how things actually work under the hood.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <WorkCard
            tag="Tesla FSD"
            title="The $75,000 Mistake: The Greatest Engineering Gamble of Our Generation"
            body="A full architectural breakdown of Tesla Full Self-Driving — from the 22-millisecond photon-to-steering pipeline to the shadow-mode data flywheel that trains on every Tesla on the road."
            href="https://www.youtube.com/watch?v=1M_CusUnAPI"
          />
          <WorkCard
            tag="X / Twitter"
            title="How the X Algorithm Actually Picks What You See"
            body="A deep dive into the open-sourced Twitter recommendation algorithm — tracing every signal, every neural network, and every ranking decision from tweet to feed."
            href="https://www.youtube.com/@AlgoThinker"
          />
        </div>
      </section>

      {/* ─── Contact ────────────────────────────────────────── */}
      <section id="contact" className="text-center space-y-6 py-12">
        <Separator />
        <h2 className="text-3xl font-bold tracking-tight pt-8">Get in touch</h2>
        <p className="text-muted-foreground max-w-xl mx-auto text-base leading-relaxed">
          For collaborations, press inquiries, or partnership opportunities —
          reach out directly.
        </p>
        <a
          href="mailto:venkat@algo-thinker.com"
          className="inline-block font-mono text-xl text-cyan-400 px-6 py-4 rounded-lg border border-cyan-500/20 bg-cyan-500/[0.06] hover:bg-cyan-500/[0.1] hover:border-cyan-500/40 transition-colors"
        >
          venkat@algo-thinker.com
        </a>
        <div className="pt-6 space-y-1 text-sm text-muted-foreground">
          <div>
            <span className="text-foreground/80">Founder:</span> Venkat Ghanta
          </div>
          <div>
            <span className="text-foreground/80">Channel:</span>{" "}
            <a
              href="https://www.youtube.com/@AlgoThinker"
              className="text-cyan-400 hover:text-cyan-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              @AlgoThinker
            </a>
          </div>
          <div>
            <span className="text-foreground/80">Location:</span> Remote
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-border pt-8 pb-4 text-center text-sm text-muted-foreground">
        © 2026 Algo Thinker · Founded by Venkat Ghanta ·{" "}
        <a
          href="mailto:venkat@algo-thinker.com"
          className="hover:text-foreground transition-colors"
        >
          venkat@algo-thinker.com
        </a>
        {" · "}
        <Link href="/campaigns" className="hover:text-foreground transition-colors">
          Admin
        </Link>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-5 py-8 border-r border-border last:border-r-0">
      <div className="font-mono text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-[0.15em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card className="hover:border-cyan-500/30 transition-colors">
      <CardContent className="pt-7 pb-6">
        <div className="size-10 rounded-lg grid place-items-center bg-cyan-500/[0.12] text-cyan-400 mb-4">
          {icon}
        </div>
        <h3 className="text-base font-bold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </CardContent>
    </Card>
  );
}

function WorkCard({
  tag,
  title,
  body,
  href,
}: {
  tag: string;
  title: string;
  body: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
    >
      <Card className="h-full hover:border-cyan-500/30 transition-colors">
        <CardContent className="pt-7 pb-6">
          <div className="font-mono text-[11px] font-semibold tracking-[0.15em] uppercase text-amber-400 mb-3">
            {tag}
          </div>
          <h3 className="text-lg font-bold mb-3 leading-snug">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
          <div className="mt-4 text-sm font-semibold text-cyan-400 inline-flex items-center gap-1.5">
            Watch on YouTube <ArrowRight className="size-3.5" />
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
