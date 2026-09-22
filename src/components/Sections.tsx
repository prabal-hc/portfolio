import CaseSlider from "./CaseSlider";
import Reveal from "./Reveal";
import { about, contact, experience, hero, profile, projects, skills } from "@/data/content";

/**
 * Two layouts (see isSideLayout in lib/layout.ts and the `side:` variant in globals.css):
 *  – stacked (phones, portrait tablets): the bike is parked in the top part of the screen and each section's text sits
 *    underneath on a soft panel, so it stays readable as it scrolls up over the bike.
 *  – side (laptops, desktops, landscape tablets): text beside the bike.
 * Type is fluid (clamp) so it scales from a 360px phone to a 2560px monitor, and also respects short screens.
 */

type Side = "left" | "right";

/** `side` is where the text sits in the side layout — the bike takes the opposite side (see KEYS in lib/cameraPath.ts). */
function Section({ id, side, children }: { id: string; side: Side; children: React.ReactNode }) {
  const align = side === "right" ? "side:ml-auto" : "side:mr-auto";
  return (
    <section
      id={id}
      // side layout: the right margin is a little wider so the fuel indicator on the right edge (see Hud.tsx) never sits on the text
      className="relative flex items-end px-5 pb-[10svh] pt-[50svh] sm:px-8 side:items-center side:pl-[clamp(2rem,5vw,9rem)] side:pr-[clamp(5rem,6.6vw,9rem)] side:py-[7svh] side:min-h-[62svh]"
    >
      <Reveal
        side={side}
        // no card behind the text; a soft shadow keeps it readable when it scrolls up over the bike
        className={`relative w-full [text-shadow:0_1px_16px_rgba(0,0,0,0.85),0_0_2px_rgba(0,0,0,0.6)] side:w-[42%] side:max-w-[clamp(28rem,44vw,60rem)] side:[text-shadow:none] ${align}`}
      >
        {children}
      </Reveal>
    </section>
  );
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.3em] text-accent side:mb-4 side:text-[clamp(11px,0.8vw,15px)]">
    {children}
  </p>
);

const Title = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-5 font-display text-[clamp(2rem,9vw,3.4rem)] font-bold uppercase leading-[0.95] tracking-[-0.01em] side:mb-6 side:text-[clamp(2.4rem,min(4.4vw,8svh),6.5rem)]">
    {children}
  </h2>
);

const body = "text-[15px] leading-relaxed text-muted side:text-[clamp(16px,1.05vw,21px)]";

export default function Sections() {
  return (
    <main className="relative z-10">
      {/* 00 — hero: bike above, name and welcome hug the bottom */}
      <section
        id="hero"
        // stacked: the text starts just under the bike instead of being pinned to the bottom of the screen
        className="relative flex min-h-[100svh] items-start justify-center px-5 pb-[8svh] pt-[47svh] text-center sm:px-8 side:items-end side:pb-[7svh] side:pt-0"
      >
        <Reveal side="right" className="w-full max-w-4xl [text-shadow:0_1px_16px_rgba(0,0,0,0.85)] side:[text-shadow:none]">
          <p className="flex items-center justify-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-accent sm:text-[11px] sm:tracking-[0.4em] side:text-[clamp(11px,0.85vw,15px)]">
            <span className="h-px w-6 bg-accent/60 sm:w-8" />
            {hero.eyebrow}
            <span className="h-px w-6 bg-accent/60 sm:w-8" />
          </p>
          <p className="mt-3 text-lg font-light tracking-wide text-fg/75 sm:text-xl side:mt-4 side:text-[clamp(1.5rem,2vw,3rem)] [@media(max-height:520px)]:hidden">
            {hero.intro}
          </p>
          <h1 className="mt-1 font-display text-[clamp(2.2rem,10.5vw,4.2rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.01em] side:text-[clamp(3.2rem,min(6vw,11.5svh),8.5rem)]">
            {hero.headline}
            <span className="text-accent">.</span>
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted sm:mt-4 sm:text-base side:max-w-[clamp(28rem,34vw,48rem)] side:text-[clamp(16px,1.05vw,21px)] [@media(max-height:520px)]:hidden">
            {hero.tagline}
          </p>
        </Reveal>
      </section>

      {/* 01 — bike left, text right */}
      <Section id="about" side="right">
        <Label>{about.label}</Label>
        <Title>{about.title}</Title>
        <div className={`space-y-4 ${body}`}>
          {about.body.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
        <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5 side:mt-8 side:gap-4 side:pt-6">
          {about.stats.map((s) => (
            <div key={s.k}>
              <dd className="font-display text-4xl font-extrabold leading-none sm:text-5xl side:text-[clamp(2.5rem,3vw,4.2rem)]">{s.v}</dd>
              <dt className="mt-1 font-mono text-[9px] uppercase tracking-widest text-muted sm:text-[10px] side:text-[clamp(10px,0.7vw,13px)]">
                {s.k}
              </dt>
            </div>
          ))}
        </dl>
      </Section>

      {/* 02 — bike right, text left */}
      <Section id="skills" side="left">
        <Label>{skills.label}</Label>
        <Title>{skills.title}</Title>
        <div className="space-y-3 side:space-y-4">
          {skills.groups.map((g) => (
            <div key={g.name} className="border-t border-line pt-3">
              <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-muted side:text-[clamp(11px,0.8vw,14px)]">{g.name}</h3>
              <ul className="flex flex-wrap gap-1.5 side:gap-2">
                {g.items.map((i) => (
                  <li
                    key={i}
                    className="rounded-full border border-line px-3 py-1 text-[12px] transition-colors hover:border-accent hover:text-accent sm:text-[13px] side:px-3.5 side:text-[clamp(13px,0.9vw,17px)]"
                  >
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      {/* 03 — bike left, text right */}
      <Section id="work" side="right">
        <Label>{projects.label}</Label>
        <Title>{projects.title}</Title>
        <CaseSlider
          items={projects.items.map((p) => ({
            key: p.name,
            eyebrow: p.tag,
            title: p.name,
            detail: p.blurb,
            href: p.href,
            linkLabel: p.href ? "Visit the site" : undefined,
          }))}
        />
      </Section>

      {/* 04 — bike right, text left */}
      <Section id="journey" side="left">
        <Label>{experience.label}</Label>
        <Title>{experience.title}</Title>
        <CaseSlider
          items={experience.items.map((e) => ({
            key: e.what,
            eyebrow: e.when,
            title: e.what,
            meta: e.where,
            metaHref: e.whereHref,
            detail: e.point,
          }))}
        />
        <p className="mt-5 border-t border-line pt-4 font-mono text-[10px] uppercase tracking-widest text-muted side:mt-6 side:text-[clamp(10px,0.7vw,13px)]">
          {experience.education}
        </p>
      </Section>

      {/* 05 — closing wide shot, text at the bottom */}
      <section
        id="contact"
        className="relative flex min-h-[100svh] items-start justify-center px-5 pb-[8svh] pt-[47svh] text-center sm:px-8 side:items-end side:pb-[7svh] side:pt-0"
      >
        <Reveal side="right" className="w-full max-w-3xl [text-shadow:0_1px_16px_rgba(0,0,0,0.85)] side:max-w-[clamp(40rem,52vw,80rem)] side:[text-shadow:none]">
          <Label>{contact.label}</Label>
          <h2 className="font-display text-[clamp(2rem,9vw,3.8rem)] font-bold uppercase leading-[0.95] tracking-[-0.01em] side:text-[clamp(3rem,min(4.4vw,8svh),6.5rem)]">
            {contact.title}
          </h2>
          <p className={`mx-auto mt-3 max-w-md ${body} side:max-w-[clamp(28rem,34vw,48rem)]`}>{contact.body}</p>
          <a
            href={`mailto:${profile.email}`}
            className="mt-5 inline-block max-w-full break-all rounded-full bg-accent px-5 py-3 font-mono text-[11px] uppercase tracking-[0.15em] text-black transition-transform hover:scale-105 sm:px-8 sm:text-xs sm:tracking-[0.25em] side:mt-6 side:text-[clamp(12px,0.85vw,16px)]"
          >
            {profile.email}
          </a>
          <div className="mt-5 flex justify-center gap-6 font-mono text-[11px] uppercase tracking-widest text-muted side:mt-6 side:text-[clamp(11px,0.8vw,15px)]">
            {profile.links.map((l) => (
              <a key={l.label} href={l.href} className="transition-colors hover:text-accent">
                {l.label}
              </a>
            ))}
          </div>
        </Reveal>
      </section>
    </main>
  );
}
