import { PageShell, Block } from '@/components/page-shell'

export const metadata = { title: 'About | Gemini Nexus' }

export default function AboutPage() {
  return (
    <PageShell
      title="About Gemini Nexus"
      subtitle="A Ghana-based digital operations network connecting clients with vetted specialists for academic research, visual media, and technical systems work."
    >
      <Block heading="Who we are">
        <p>
          Gemini Nexus is a specialist services platform operating in Ghana. We provide a single, secure intake line
          where individuals and organisations can request high-quality academic research, presentations and visual media,
          and software, IT and web systems work. Every brief is routed to a specialist matched to the task.
        </p>
      </Block>
      <Block heading="What we do">
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong className="text-slate-200">Academic &amp; Research</strong> — essays, case studies, literature reviews and structured reports.</li>
          <li><strong className="text-slate-200">Presentations &amp; Visuals</strong> — defense decks, infographics and media design.</li>
          <li><strong className="text-slate-200">Software, IT &amp; Hands-on</strong> — coding, web systems, databases and technical support.</li>
        </ul>
      </Block>
      <Block heading="How we work">
        <p>
          You submit a brief through our intake portal with the scope, requirements and any files. A specialist reviews it
          and sends a custom quote in Ghana Cedis (GHS) — no deposit is required to receive a quote. Work begins once the
          quote is accepted, and you receive progress updates throughout. You can reach us any time through Live Chat.
        </p>
      </Block>
      <Block heading="Our commitment">
        <p>
          We deliver original, tailored work and treat every brief as confidential. Our specialists are accountable for
          quality and deadlines, and our support team is available to keep your project moving.
        </p>
      </Block>
    </PageShell>
  )
}
