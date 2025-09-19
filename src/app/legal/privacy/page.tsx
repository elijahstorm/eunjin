"use client";

/**
 * CODE INSIGHT
 * This code's use case is to render the Privacy Policy page with a modern, accessible layout,
 * in-page navigation, and rich content tailored to the application's functionality (audio capture,
 * transcripts, highlights, sharing, and integrations). It links to related pages across the app
 * (e.g., Terms, Help, Dashboard, Sessions, Integrations, Org Security/Retention) and offers
 * quick actions like back-to-home. No server/database calls are performed here.
 */

import React from "react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/utils/utils";

type Section = {
  id: string;
  title: string;
};

const sections: Section[] = [
  { id: "overview", title: "Overview" },
  { id: "key-points", title: "Key Points" },
  { id: "data-we-collect", title: "Data We Collect" },
  { id: "how-we-use-data", title: "How We Use Data" },
  { id: "consent-and-recordings", title: "Consent & Recordings" },
  { id: "integrations", title: "Third‑Party Integrations" },
  { id: "sharing", title: "Sharing & Disclosure" },
  { id: "retention", title: "Retention & Deletion" },
  { id: "security", title: "Security" },
  { id: "international", title: "International Transfers" },
  { id: "your-rights", title: "Your Rights" },
  { id: "children", title: "Children’s Privacy" },
  { id: "changes", title: "Changes to This Policy" },
  { id: "contact", title: "Contact Us" },
];

export default function PrivacyPolicyPage() {
  const [activeId, setActiveId] = React.useState<string>(sections[0].id);
  const sectionRefs = React.useRef<Record<string, HTMLElement | null>>({});
  const [tocOpen, setTocOpen] = React.useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      {
        root: null,
        rootMargin: "0px 0px -65% 0px",
        threshold: [0, 0.25, 0.5, 1],
      }
    );

    sections.forEach((s) => {
      const el = sectionRefs.current[s.id] || document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const onJump = (id: string) => {
    const el = sectionRefs.current[id] || document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTocOpen(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        {/* In-page navigation (desktop) */}
        <aside className="sticky top-24 hidden h-fit w-64 shrink-0 lg:block">
          <div className="rounded-lg border bg-card p-4 text-sm text-card-foreground">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              On this page
            </div>
            <nav aria-label="Table of contents" className="space-y-1">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onJump(s.id)}
                  className={cn(
                    "block w-full text-left rounded-md px-2 py-1.5 transition-colors",
                    activeId === s.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted text-foreground"
                  )}
                >
                  {s.title}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <section className="min-w-0 flex-1">
          <header className="mb-6">
            <div className="mb-2 text-sm text-muted-foreground">Last updated: 2025-09-19</div>
            <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="mt-2 text-muted-foreground">
              This Privacy Policy explains how we collect, use, and protect your information when you
              use our real-time meeting and lecture transcription, highlights, and summarization service.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center rounded-md bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground shadow-sm hover:bg-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                ← Back to Home
              </Link>
              <Link
                href="/legal/terms"
                className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                View Terms of Service
              </Link>
              <Link
                href="/help"
                className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Help Center
              </Link>
            </div>
          </header>

          {/* In-page navigation (mobile) */}
          <div className="mb-6 lg:hidden">
            <Collapsible open={tocOpen} onOpenChange={setTocOpen}>
              <div className="flex items-center justify-between rounded-lg border bg-card p-3">
                <div className="text-sm font-medium">On this page</div>
                <CollapsibleTrigger className="rounded-md px-3 py-1.5 text-sm hover:bg-muted">
                  {tocOpen ? "Hide" : "Show"}
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent>
                <nav className="mt-2 grid grid-cols-1 gap-1 rounded-lg border bg-card p-2" aria-label="Table of contents mobile">
                  {sections.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onJump(s.id)}
                      className={cn(
                        "w-full rounded-md px-2 py-1.5 text-left text-sm",
                        activeId === s.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      )}
                    >
                      {s.title}
                    </button>
                  ))}
                </nav>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <Alert className="mb-6 border-primary/30 bg-primary/5">
            <AlertTitle>We respect your privacy</AlertTitle>
            <AlertDescription>
              We do not sell your personal information. We use industry-standard security to protect
              recordings, transcripts, highlights, and summaries. For terms governing your use of the
              service, please review our <Link href="/legal/terms" className="underline">Terms of Service</Link>.
            </AlertDescription>
          </Alert>

          <article className="prose prose-neutral max-w-none dark:prose-invert">
            <Section id="overview" refMap={sectionRefs}>
              <h2>Overview</h2>
              <p>
                We provide tools to capture audio in real time, generate transcripts, identify speakers,
                mark highlights, and produce summaries. This policy describes the data we process and the
                choices you have. If you do not agree, please refrain from using the service and consult the
                <Link href="/legal/terms" className="underline"> Terms of Service</Link>.
              </p>
            </Section>

            <Separator className="my-8" />

            <Section id="key-points" refMap={sectionRefs}>
              <h2>Key Points</h2>
              <ul>
                <li>Purpose: transcription, diarization, highlights, and summarization for your meetings and lectures.</li>
                <li>Control: you can manage sessions and content from your <Link href="/dashboard" className="underline">Dashboard</Link> and <Link href="/sessions" className="underline">Sessions</Link>.</li>
                <li>Consent: ensure all participants consent to recording. Create and share consent from <Link href="/consent" className="underline">Consent</Link>.</li>
                <li>Integrations: optional Zoom and Microsoft Teams connections at <Link href="/integrations/zoom" className="underline">Zoom</Link> and <Link href="/integrations/teams" className="underline">Teams</Link>.</li>
                <li>Retention: organization policies at <Link href="/org/retention" className="underline">Org Retention</Link>.</li>
                <li>Security: review controls at <Link href="/org/security" className="underline">Org Security</Link> and personal settings at <Link href="/settings/profile" className="underline">Profile Settings</Link>.</li>
                <li>Offline: limited PWA features may work <Link href="/offline" className="underline">offline</Link> and sync when you reconnect.</li>
              </ul>
            </Section>

            <Separator className="my-8" />

            <Section id="data-we-collect" refMap={sectionRefs}>
              <h2>Data We Collect</h2>
              <h3>Account & Organization</h3>
              <ul>
                <li>Account info: name, email, password (hashed), and authentication events.</li>
                <li>Organization data: org name, members, roles, and policy settings.</li>
              </ul>
              <h3>Recordings & Transcripts</h3>
              <ul>
                <li>Audio input: microphone audio captured via your browser when you start a session.</li>
                <li>Transcripts and segments: text output of ASR with timestamps and speaker labels (when available).</li>
                <li>Highlights & notes: your markers, timestamps, and any uploaded highlight files.</li>
                <li>Summaries: generated documents based on full transcripts and/or highlights.</li>
              </ul>
              <h3>Usage & Device</h3>
              <ul>
                <li>Device/technical data: browser type, device, OS, IP (approximate location), and app version.</li>
                <li>Usage events: feature interactions, errors, and performance metrics to improve reliability.</li>
              </ul>
              <h3>Cookies & Local Storage</h3>
              <ul>
                <li>Authentication and session persistence (e.g., to keep you signed in).</li>
                <li>Preferences (e.g., language, UI settings) and offline queue for PWA synchronization.</li>
              </ul>
            </Section>

            <Separator className="my-8" />

            <Section id="how-we-use-data" refMap={sectionRefs}>
              <h2>How We Use Data</h2>
              <ul>
                <li>To provide and operate features like real‑time transcription, diarization, highlights, and summaries.</li>
                <li>To process uploads and third‑party recordings you import from Zoom or Teams.</li>
                <li>To improve accuracy and user experience, including formatting, sentence restoration, and latency reduction.</li>
                <li>To secure the service, detect abuse, and comply with legal obligations.</li>
                <li>To communicate about account activity, product updates, and service‑related notices.</li>
              </ul>
              <p>
                Where required, we rely on your consent (e.g., capturing audio) and legitimate interests
                (e.g., securing the service). You can adjust notifications at <Link href="/settings/notifications" className="underline">Notification Settings</Link>.
              </p>
            </Section>

            <Separator className="my-8" />

            <Section id="consent-and-recordings" refMap={sectionRefs}>
              <h2>Consent & Recordings</h2>
              <p>
                You are responsible for obtaining all required consents from meeting participants. Our
                product offers tools to track consent status and share consent forms. See <Link href="/consent" className="underline">Consent</Link> to create, manage, and share consent records.
              </p>
              <ul>
                <li>You can start/stop capture from <Link href="/sessions" className="underline">Sessions</Link> or <Link href="/sessions/new" className="underline">New Session</Link>.</li>
                <li>For existing sessions, manage live transcription at <span className="whitespace-nowrap">/sessions/[sessionId]/live</span>.</li>
                <li>You can upload recordings from supported platforms or files for processing.</li>
              </ul>
            </Section>

            <Separator className="my-8" />

            <Section id="integrations" refMap={sectionRefs}>
              <h2>Third‑Party Integrations</h2>
              <p>
                You may connect third‑party services (e.g., Zoom, Microsoft Teams) to import recordings.
                When you connect an integration, we receive tokens necessary to access the specific data you
                authorize. Manage integrations at <Link href="/integrations" className="underline">Integrations</Link>,
                including <Link href="/integrations/zoom" className="underline">Zoom</Link> and <Link href="/integrations/teams" className="underline">Teams</Link>.
              </p>
              <p>
                We only retrieve the files and metadata needed for transcription and summarization and store them
                according to your organization’s retention settings.
              </p>
            </Section>

            <Separator className="my-8" />

            <Section id="sharing" refMap={sectionRefs}>
              <h2>Sharing & Disclosure</h2>
              <ul>
                <li>Within your organization: access is governed by roles and policies configured by org admins.</li>
                <li>Service providers: cloud infrastructure, ASR, and processing partners who support our product under contractual confidentiality and security obligations.</li>
                <li>Legal: when required by law, regulation, or valid legal process.</li>
                <li>With your direction: when you share links to transcripts or summaries, access follows the link settings you choose.</li>
              </ul>
            </Section>

            <Separator className="my-8" />

            <Section id="retention" refMap={sectionRefs}>
              <h2>Retention & Deletion</h2>
              <p>
                Retention periods can be configured by organization administrators at
                <Link href="/org/retention" className="underline"> Org Retention</Link>. By default, we retain account data for as long as your
                account is active, and content data as dictated by your organization’s policy. You can request deletion
                of sessions or documents from the relevant session view or by contacting support.
              </p>
            </Section>

            <Separator className="my-8" />

            <Section id="security" refMap={sectionRefs}>
              <h2>Security</h2>
              <ul>
                <li>Encryption in transit (TLS) and at rest for stored content.</li>
                <li>Access controls and role‑based permissions; review settings at <Link href="/org/security" className="underline">Org Security</Link>.</li>
                <li>Monitoring, logging, and safeguards to detect abuse and anomalous activity.</li>
                <li>PWA offline queues encrypt sensitive payloads before sync where applicable.</li>
              </ul>
              <p>
                While we implement reasonable and appropriate safeguards, no system can be 100% secure. Please use
                strong passwords and enable organization‑level controls. Manage your profile at
                <Link href="/settings/profile" className="underline"> Profile Settings</Link>.
              </p>
            </Section>

            <Separator className="my-8" />

            <Section id="international" refMap={sectionRefs}>
              <h2>International Transfers</h2>
              <p>
                Your information may be processed in countries different from where you reside. We implement
                appropriate safeguards for cross‑border transfers, such as standard contractual clauses or equivalent
                mechanisms, where required.
              </p>
            </Section>

            <Separator className="my-8" />

            <Section id="your-rights" refMap={sectionRefs}>
              <h2>Your Rights</h2>
              <p>
                Depending on your location, you may have rights to access, correct, delete, or port your data, object
                to processing, or withdraw consent. You can:
              </p>
              <ul>
                <li>Access and manage data in <Link href="/dashboard" className="underline">Dashboard</Link> and <Link href="/sessions" className="underline">Sessions</Link>.</li>
                <li>Update your profile and preferences at <Link href="/settings/profile" className="underline">Profile Settings</Link> and <Link href="/settings/notifications" className="underline">Notifications</Link>.</li>
                <li>If you can’t access your account, use <Link href="/auth/reset-password" className="underline">Reset Password</Link> or contact support via <Link href="/help" className="underline">Help Center</Link>.</li>
              </ul>
              <p>
                To exercise additional rights, please contact us. We will verify your request and respond within
                applicable legal timelines.
              </p>
            </Section>

            <Separator className="my-8" />

            <Section id="children" refMap={sectionRefs}>
              <h2>Children’s Privacy</h2>
              <p>
                Our services are not directed to children under the age where consent is required without parental
                approval in your jurisdiction. If we learn we have collected such data without proper consent, we will
                take steps to delete it.
              </p>
            </Section>

            <Separator className="my-8" />

            <Section id="changes" refMap={sectionRefs}>
              <h2>Changes to This Policy</h2>
              <p>
                We may update this policy to reflect changes in our services or legal requirements. We will post any
                changes on this page and update the “Last updated” date. Where required, we will provide additional
                notice. Continued use of the service after changes indicates acceptance of the updated policy.
              </p>
            </Section>

            <Separator className="my-8" />

            <Section id="contact" refMap={sectionRefs}>
              <h2>Contact Us</h2>
              <p>
                For questions about this policy or your data, please reach out through the
                <Link href="/help" className="underline"> Help Center</Link>. If you need to manage your account access, visit
                <Link href="/auth/sign-in" className="underline"> Sign In</Link> or <Link href="/auth/sign-up" className="underline"> Sign Up</Link>.
              </p>
            </Section>
          </article>

          {/* Page actions footer (within main content) */}
          <div className="mt-10 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                Need more details? See our <Link href="/legal/terms" className="underline">Terms of Service</Link>.
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/"
                  className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  ← Back to Home
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Section({ id, children, refMap }: { id: string; children: React.ReactNode; refMap: React.MutableRefObject<Record<string, HTMLElement | null>> }) {
  return (
    <section
      id={id}
      ref={(el) => {
        refMap.current[id] = el;
      }}
      className="scroll-mt-24"
    >
      {children}
    </section>
  );
}
