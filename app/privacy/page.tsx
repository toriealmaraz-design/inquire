import { PageShell, Block } from '@/components/page-shell'

export const metadata = { title: 'Privacy Policy | Gemini Nexus' }

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy" subtitle="Last updated: October 2026. This policy explains what we collect and how we use it.">
      <Block heading="1. Information we collect">
        <p>We collect the information you give us when you submit a brief or chat with us: your name or contact details (phone or email), your project brief and scope, and any files you upload. For staff and agents, we also store account details needed to operate the platform. We automatically collect basic technical data such as device and usage information to keep the service running.</p>
      </Block>
      <Block heading="2. How we use your information">
        <p>We use your information to prepare quotes, deliver the work you request, communicate with you about your project, process payments, operate the referral programme, and improve and secure our services. We do not sell your personal information.</p>
      </Block>
      <Block heading="3. Sharing">
        <p>Your brief and files are shared only with the specialist assigned to your work and the staff needed to support it. We may use trusted service providers (for example, hosting, database and payment processors) who handle data on our behalf under appropriate safeguards. We may disclose information where required by law.</p>
      </Block>
      <Block heading="4. File storage and retention">
        <p>Uploaded files are stored securely and retained only as long as needed for your project and our records, after which they are removed in line with our retention settings. You may ask us to delete your data where we are not required to keep it.</p>
      </Block>
      <Block heading="5. Cookies and local storage">
        <p>We use cookies and browser local storage to keep you signed in, remember a referral link for a limited period, and understand site usage. You can control cookies through your browser settings, though some features may not work without them.</p>
      </Block>
      <Block heading="6. Security">
        <p>We use reasonable technical and organisational measures to protect your information. No method of transmission or storage is completely secure, but we work to safeguard your data and limit access to those who need it.</p>
      </Block>
      <Block heading="7. Your rights">
        <p>You may request access to, correction of, or deletion of your personal information, subject to legal and operational limits. To make a request, contact us through Live Chat or the channels listed on our site.</p>
      </Block>
      <Block heading="8. Changes and contact">
        <p>We may update this policy from time to time and will post the new version here. For any privacy questions, reach us through Live Chat or our listed contact channels.</p>
      </Block>
    </PageShell>
  )
}
