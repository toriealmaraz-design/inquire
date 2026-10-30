import { PageShell } from '@/components/page-shell'

export const metadata = { title: 'FAQ | Gemini Nexus' }

const faqs = [
  { q: 'How do I request work?', a: 'Open the intake portal on the homepage, choose a service track, describe your brief and scope, attach any files, and submit. You will receive a ticket number to track it.' },
  { q: 'How much does it cost?', a: 'Every project is quoted individually in Ghana Cedis (GHS) based on scope, complexity and urgency. There is no charge to submit a brief or receive a quote.' },
  { q: 'Do I need to pay a deposit?', a: 'No deposit is required to get a quote. Payment terms are confirmed with you before work begins.' },
  { q: 'How long will my work take?', a: 'You choose an urgency when you submit: Standard (3–5 business days), Express (24–48 hours), or Emergency (under 24 hours). Final timelines are confirmed in your quote.' },
  { q: 'How do I pay?', a: 'Once you accept a quote, our team shares the available payment options. Your ticket is only marked paid after payment is confirmed.' },
  { q: 'Is my information confidential?', a: 'Yes. Briefs and files are treated as confidential and shared only with the specialist assigned to your work. See our Privacy Policy for details.' },
  { q: 'Can I talk to someone directly?', a: 'Yes — use Live Chat at any time. If you already have a ticket number, include it so we can pull up your brief instantly.' },
  { q: 'What is the referral programme?', a: 'Agents receive a personal referral link. When a client arrives through that link and their paid work is completed, the referring agent earns a commission. Referral commission applies only to clients who genuinely come through the link.' },
]

export default function FaqPage() {
  return (
    <PageShell title="Frequently asked questions" subtitle="Quick answers to the questions we hear most. Still stuck? Start a Live Chat and we'll help.">
      <div className="space-y-4">
        {faqs.map((f) => (
          <details key={f.q} className="group rounded-2xl border border-white/10 bg-white/[0.04] p-5 open:bg-white/[0.06]">
            <summary className="cursor-pointer list-none text-base font-semibold text-white marker:hidden">
              <span className="flex items-center justify-between gap-4">{f.q}<span className="text-cyan-300 transition group-open:rotate-45">+</span></span>
            </summary>
            <p className="mt-3 text-sm leading-6 text-slate-400">{f.a}</p>
          </details>
        ))}
      </div>
    </PageShell>
  )
}
