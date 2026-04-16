import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of service for AlgoAds — the Google Ads campaign automation tool at algo-thinker.com.",
};

export default function TermsPage() {
  return (
    <article className="prose prose-neutral max-w-3xl mx-auto space-y-6">
      <header className="space-y-2 pt-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
          Terms of Service
        </h1>
        <p className="text-sm text-muted-foreground">
          Effective date: 2026-04-16 · Last updated: 2026-04-16
        </p>
      </header>

      <Section title="1. The service">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your use of AlgoAds,
          a campaign automation tool operated by Algo Thinker (Venkat Ghanta)
          and hosted at <code>algo-thinker.com</code>. By creating an account or
          connecting your Google Ads account, you agree to these Terms.
        </p>
      </Section>

      <Section title="2. What AlgoAds does and does not do">
        <p>
          AlgoAds lets you create and manage Google Ads Demand Gen video
          campaigns using your own Google Ads account, your own budget, and
          your own ad creative.
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            AlgoAds is <strong>not</strong> a Google Ads reseller.
          </li>
          <li>
            AlgoAds does <strong>not</strong> manage your billing or handle
            payments to Google on your behalf.
          </li>
          <li>
            AlgoAds does <strong>not</strong> guarantee any particular campaign
            performance, reach, cost per click, or conversion rate.
          </li>
        </ul>
      </Section>

      <Section title="3. Your account and Google Ads connection">
        <p>
          You are responsible for the Google Ads account you connect to
          AlgoAds, for complying with Google Ads&apos;{" "}
          <a
            href="https://support.google.com/adspolicy/answer/6008942"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-700 hover:text-cyan-600"
          >
            Advertising Policies
          </a>
          , and for the content of the ads you launch through AlgoAds. You
          confirm that you have the authority to run ads from the Google Ads
          account you connect.
        </p>
        <p>
          You may revoke AlgoAds&apos; OAuth access at any time from your{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-700 hover:text-cyan-600"
          >
            Google account permissions page
          </a>
          . Revocation does not affect campaigns already created.
        </p>
      </Section>

      <Section title="4. Acceptable use">
        <p>You agree not to use AlgoAds to:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            Create ads that violate Google Ads policies or applicable law.
          </li>
          <li>
            Submit content (including YouTube videos or logo images) that you
            do not have the right to use.
          </li>
          <li>
            Attempt to reverse-engineer, probe, or overload the service, or
            circumvent rate limits.
          </li>
          <li>
            Operate on behalf of another party without that party&apos;s
            authorization.
          </li>
        </ul>
      </Section>

      <Section title="5. Fees">
        <p>
          AlgoAds is provided at no charge during beta. Google Ads spend is
          billed directly from Google to the payment method on your Google Ads
          account — AlgoAds never charges you for ad spend. If AlgoAds
          introduces paid plans in the future, we will give you notice before
          any charges apply.
        </p>
      </Section>

      <Section title="6. Intellectual property">
        <p>
          You retain all rights to the content you submit (videos, logos, ad
          copy). You grant AlgoAds a limited license to process your content
          solely for the purpose of creating and managing the campaigns you
          request. AlgoAds&apos; own software, design, and documentation remain
          the property of Algo Thinker.
        </p>
      </Section>

      <Section title="7. Disclaimers">
        <p>
          AlgoAds is provided &quot;as is&quot; without warranty of any kind,
          express or implied, including merchantability, fitness for a
          particular purpose, or non-infringement. We do not warrant that the
          service will be uninterrupted, error-free, or that any particular
          campaign will achieve any particular outcome.
        </p>
      </Section>

      <Section title="8. Limitation of liability">
        <p>
          To the maximum extent permitted by law, Algo Thinker shall not be
          liable for any indirect, incidental, special, consequential, or
          punitive damages, or for any loss of profits, revenue, or data,
          arising out of or related to your use of AlgoAds. Our total
          cumulative liability in any matter arising out of these Terms is
          limited to USD 100.
        </p>
      </Section>

      <Section title="9. Termination">
        <p>
          You may stop using AlgoAds and request account deletion at any time
          by emailing{" "}
          <a
            href="mailto:privacy@algo-thinker.com"
            className="text-cyan-700 hover:text-cyan-600"
          >
            privacy@algo-thinker.com
          </a>
          . We may suspend or terminate accounts that violate these Terms or
          pose a security or policy risk.
        </p>
      </Section>

      <Section title="10. Changes to these Terms">
        <p>
          We may update these Terms from time to time. Material changes will be
          communicated via email or through a notice in the product. Continued
          use of the service after a change constitutes acceptance of the new
          Terms.
        </p>
      </Section>

      <Section title="11. Governing law">
        <p>
          These Terms are governed by the laws of the State of California, USA,
          without regard to conflict-of-law rules. Any dispute arising out of
          these Terms shall be resolved in the state or federal courts located
          in San Francisco County, California.
        </p>
      </Section>

      <Section title="12. Contact">
        <p>
          Questions about these Terms?{" "}
          <a
            href="mailto:venkat@algo-thinker.com"
            className="text-cyan-700 hover:text-cyan-600"
          >
            venkat@algo-thinker.com
          </a>
        </p>
        <p className="text-sm text-muted-foreground pt-4">
          See also our{" "}
          <Link href="/privacy" className="text-cyan-700 hover:text-cyan-600 font-medium">
            Privacy Policy
          </Link>{" "}
          and the{" "}
          <Link href="/ads-api" className="text-cyan-700 hover:text-cyan-600 font-medium">
            Google Ads API use case
          </Link>{" "}
          document.
        </p>
      </Section>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 pt-4">
      <h2 className="text-xl sm:text-2xl font-semibold text-foreground">
        {title}
      </h2>
      <div className="text-[15px] text-muted-foreground leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}
