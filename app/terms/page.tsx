import { PageShell, Block } from '@/components/page-shell'

export const metadata = { title: 'Terms of Service | Gemini Nexus' }

export default function TermsPage() {
  return (
    <PageShell title="Terms of Service" subtitle="Last updated: October 2026. By using Gemini Nexus you agree to these terms.">
      <Block heading="1. Overview">
        <p>Gemini Nexus (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;the platform&rdquo;) connects clients with specialists for academic, media and technical services. These Terms govern your use of our website and services. If you do not agree, please do not use the platform.</p>
      </Block>
      <Block heading="2. Services and quotes">
        <p>Submitting a brief is a request for a quote, not a binding order. We provide a custom quote in Ghana Cedis (GHS). Work begins only after you accept a quote and payment terms are agreed. Quotes are valid for the period stated in them.</p>
      </Block>
      <Block heading="3. Payments">
        <p>Fees are as stated in your accepted quote. Unless otherwise agreed in writing, payment is due as set out at the time of acceptance. A project is treated as paid only once payment has been confirmed by us. Prices are quoted and payable in GHS.</p>
      </Block>
      <Block heading="4. Client responsibilities">
        <p>You agree to provide accurate information and the materials needed to complete your brief, to hold the rights to any content you submit, and to use deliverables lawfully and in line with the policies of any institution you are affiliated with. You are responsible for how you use the work we provide.</p>
      </Block>
      <Block heading="5. Revisions and delivery">
        <p>Delivery timelines reflect the urgency you select and are confirmed in your quote. Reasonable revisions within the agreed scope are included; work beyond the original scope may require a new quote.</p>
      </Block>
      <Block heading="6. Referral programme">
        <p>Registered agents receive a unique referral link. Referral commission is earned only when a client reaches the platform through that link and their resulting work is completed and paid. Self-referrals and commission on an agent&rsquo;s own assigned work do not qualify. We may adjust commission rates and withhold commission for abuse or fraud.</p>
      </Block>
      <Block heading="7. Intellectual property">
        <p>Upon full payment, deliverables are provided to you for your intended use. We may retain anonymised records for our own operations. You may not resell platform access or misrepresent our services.</p>
      </Block>
      <Block heading="8. Acceptable use">
        <p>You may not use the platform for unlawful purposes, to submit malicious files, or to harass our staff. We may suspend or terminate access for breaches of these Terms.</p>
      </Block>
      <Block heading="9. Limitation of liability">
        <p>Services are provided on a reasonable-efforts basis. To the fullest extent permitted by law, our liability for any claim is limited to the amount you paid for the specific work giving rise to the claim.</p>
      </Block>
      <Block heading="10. Changes and contact">
        <p>We may update these Terms from time to time; continued use means you accept the changes. Questions about these Terms can be sent through Live Chat or the contact channels listed on our site.</p>
      </Block>
    </PageShell>
  )
}
