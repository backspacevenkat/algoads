import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How AlgoAds (Algo Thinker) collects, uses, and protects your data, including data retrieved via the Google Ads API.",
};

export default function PrivacyPage() {
  return (
    <article className="prose prose-neutral max-w-3xl mx-auto space-y-6">
      <header className="space-y-2 pt-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground">
          Effective date: 2026-04-16 · Last updated: 2026-04-16
        </p>
      </header>

      <Section title="Who we are">
        <p>
          This Privacy Policy describes how <strong>Algo Thinker</strong>{" "}
          (&quot;we&quot;, &quot;our&quot;, or &quot;AlgoAds&quot;) collects,
          uses, and protects personal data when you use the AlgoAds campaign
          automation tool hosted at <code>algo-thinker.com</code>. Algo Thinker
          is an independent business operated by Venkat Ghanta.
        </p>
        <p>
          For any privacy-related question, contact us at{" "}
          <a href="mailto:privacy@algo-thinker.com" className="text-cyan-700 hover:text-cyan-600">
            privacy@algo-thinker.com
          </a>
          .
        </p>
      </Section>

      <Section title="What we collect">
        <p>We collect only the minimum data needed to run the tool.</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Account data:</strong> your email address, display name, and
            a hashed OAuth subject identifier provided by Google when you sign
            in with Google.
          </li>
          <li>
            <strong>Google Ads credentials:</strong> an OAuth 2.0 refresh token
            and the Google Ads customer ID you authorize. These are stored
            encrypted at rest and are used only to call the Google Ads API on
            your explicit behalf.
          </li>
          <li>
            <strong>Campaign references:</strong> IDs, names, creation
            timestamps, and statuses of the campaigns you create through
            AlgoAds. Live metrics (impressions, clicks, cost) are queried from
            the Google Ads API on demand and are not stored in our database.
          </li>
          <li>
            <strong>Assets you upload:</strong> YouTube video references and
            logo images you add to your ads. These are uploaded to your own
            Google Ads account and deleted from our systems once the ad is
            created.
          </li>
          <li>
            <strong>Usage logs:</strong> standard server logs (IP address,
            user-agent, timestamps, request paths) retained for up to 30 days
            for security and debugging purposes.
          </li>
        </ul>
      </Section>

      <Section title="How we use Google user data">
        <p>
          Data obtained through your Google Ads OAuth grant is used{" "}
          <strong>exclusively</strong> to:
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            Create and manage Google Ads campaigns that you explicitly initiate
            through our interface.
          </li>
          <li>
            Read back your own campaign metadata and performance metrics to
            display in your dashboard.
          </li>
          <li>
            Maintain an authenticated session so you do not need to re-authorize
            on every visit.
          </li>
        </ul>
        <p>We do not:</p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li>Sell, rent, or share your Google user data with third parties.</li>
          <li>
            Use your Google Ads data to train advertising or machine learning
            models.
          </li>
          <li>
            Access customer-level data (conversions, audience members, email
            lists) from your Google Ads account.
          </li>
          <li>
            Aggregate your data with other users&apos; data for any kind of
            benchmarking or analytics product.
          </li>
        </ul>
        <p>
          AlgoAds&apos; use of information received from Google APIs will adhere
          to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-700 hover:text-cyan-600"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
      </Section>

      <Section title="Third-party services we use">
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            <strong>Google Ads API &amp; OAuth 2.0</strong> — for campaign
            creation and authentication.
          </li>
          <li>
            <strong>Google Gemini API</strong> — for generating ad copy
            suggestions from the YouTube video URL you submit. We send only the
            public video metadata to Gemini. We do not send any of your
            account&apos;s personal data.
          </li>
          <li>
            <strong>Vercel</strong> — our hosting provider. Standard request
            logs are retained by Vercel under their own privacy terms.
          </li>
          <li>
            <strong>InsForge</strong> — our backend authentication and database
            platform. Data stored there is encrypted at rest and access is
            restricted to the AlgoAds server process.
          </li>
        </ul>
      </Section>

      <Section title="Data retention and deletion">
        <ul className="list-disc pl-6 space-y-1.5">
          <li>
            Account and credential data is retained for as long as your AlgoAds
            account is active.
          </li>
          <li>
            You can revoke AlgoAds&apos; access to your Google Ads account at
            any time from your{" "}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-700 hover:text-cyan-600"
            >
              Google account permissions page
            </a>
            . Revocation immediately invalidates the refresh token we hold.
          </li>
          <li>
            You can request deletion of your AlgoAds account and all associated
            data by emailing{" "}
            <a
              href="mailto:privacy@algo-thinker.com"
              className="text-cyan-700 hover:text-cyan-600"
            >
              privacy@algo-thinker.com
            </a>
            . We will respond within 14 days.
          </li>
        </ul>
      </Section>

      <Section title="Security">
        <p>
          OAuth refresh tokens and other credentials are encrypted at rest using
          our database provider&apos;s encryption. Communication with AlgoAds
          uses HTTPS exclusively. Access to production systems is restricted to
          the founder and authorized maintainers.
        </p>
      </Section>

      <Section title="International users">
        <p>
          AlgoAds is operated from the United States. By using the service you
          consent to the processing of your data in the United States and any
          other country where our service providers operate.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If we make material changes to this policy we will update the
          &quot;Last updated&quot; date above and, where appropriate, notify you
          via email.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Privacy inquiries:{" "}
          <a
            href="mailto:privacy@algo-thinker.com"
            className="text-cyan-700 hover:text-cyan-600"
          >
            privacy@algo-thinker.com
          </a>
          <br />
          API &amp; developer compliance:{" "}
          <a
            href="mailto:api@algo-thinker.com"
            className="text-cyan-700 hover:text-cyan-600"
          >
            api@algo-thinker.com
          </a>
          <br />
          General:{" "}
          <a
            href="mailto:venkat@algo-thinker.com"
            className="text-cyan-700 hover:text-cyan-600"
          >
            venkat@algo-thinker.com
          </a>
        </p>
        <p className="text-sm text-muted-foreground pt-4">
          See also our{" "}
          <Link href="/terms" className="text-cyan-700 hover:text-cyan-600 font-medium">
            Terms of Service
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
