import { ExternalLink } from 'lucide-react';

interface Props {
  navigate: (to: string) => void;
}

const partners = [
  {
    name: 'Saintly Math',
    description:
      "Saintly Math is a free competition-math platform built by students, for students. It offers adaptive practice, real AMC problems, step-by-step solutions, practice tests, and in-depth topic guides to help students build their competition-math skills. Saintly's mission is to make high-quality competition math preparation accessible to everyone.",
    image: '/saintly-math-logo.svg',
    link: 'https://saintlymath.com',
  },
  {
    name: 'SolveFire',
    description:
      'SolveFire is a competitive mathematics platform offering weekly contests and a growing archive of problems ranging from AMC 8 to USAMO level. We feature a SolveFire weekly set right here on ZeroSet, bringing their contest problems directly to our solvers each week. With skill-based rankings, timed competitions, and opportunities to practice throughout the week, SolveFire gives math enthusiasts a fun and competitive way to challenge themselves and improve.',
    image: '/solvefire-logo.png',
    link: 'https://solvefire.com',
  },
];

export default function PartnersPage({ navigate }: Props) {
  return (
    <div className="relative min-h-screen bg-graph-paper">
      {/* Top banner */}
      <div className="border-b border-ink-300 bg-cream-200 px-4 pb-3 pt-16 text-center font-handwritten text-xs font-bold uppercase tracking-widest text-ink-600">
        ZeroSet — a nonprofit providing structured, weekly math practice
      </div>

      {/* Header */}
      <section className="relative overflow-hidden bg-graph-paper">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
          <h1 className="font-handwritten text-5xl font-bold leading-tight text-ink-950 sm:text-6xl">
            Our Partners
          </h1>

          <p className="mt-3 text-base text-ink-800">
            Collaborators and organizations we work with to bring you the best
            math challenges.
          </p>
        </div>
      </section>

      {/* Partner cards */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {partners.map((partner) => (
            <article
              key={partner.name}
              className="relative overflow-hidden border-2 border-ink-700 bg-cream-100 p-5 shadow-panel transition-shadow hover:shadow-lg sm:p-6"
              style={{
                borderRadius:
                  '255px 15px 225px 15px / 15px 225px 15px 255px',
              }}
            >
              {/* Logo area */}
              <div
                className="mb-4 flex h-32 items-center justify-center overflow-hidden border-b border-ink-300 bg-cream-200 pb-3"
              >
                <img
                  src={partner.image}
                  alt={`${partner.name} logo`}
                  className="max-h-full max-w-[85%] object-contain"
                />
              </div>

              {/* Name */}
              <h2 className="font-handwritten text-2xl font-bold text-ink-950">
                {partner.name}
              </h2>

              {/* Description */}
              <p className="mt-2 text-sm leading-relaxed text-ink-800">
                {partner.description}
              </p>

              {/* Link */}
              <a
                href={partner.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 font-handwritten text-sm font-bold text-accent-700 transition-colors hover:text-accent-600"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Visit site
              </a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
