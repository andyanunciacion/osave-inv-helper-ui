import type { ReactNode } from "react";

const DATA_CONTROLLER = "Andy Anunciacion";
const CONTACT_NAME = "Andy Anunciacion";
const CONTACT_EMAIL = "andyanunciacion@gmail.com";
const LAST_UPDATED = "October 19, 2026";

// Thin: static copy only. Describes what the app and its backend actually
// handle (store login, receipt photos sent to OCR, delivery records, request
// logs, on-phone storage) — keep it in step when that changes.
export function PrivacyNotice() {
  return (
    <article className="flex flex-col gap-6 text-sm leading-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Privacy notice</h1>
        <p className="text-muted-foreground">Last updated {LAST_UPDATED}</p>
      </header>

      <p>
        Inventory Helper lets store staff photograph delivery receipts, check what was read
        from them, and search past deliveries. This notice explains what information the app
        handles and why, in line with the Data Privacy Act of 2012 (Republic Act No. 10173).
      </p>

      <Section title="What the app handles">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>
            <strong className="font-medium">Store sign-in.</strong> The store code and the shared
            store passcode. There are no personal accounts: the app never asks for your name,
            email or phone number.
          </li>
          <li>
            <strong className="font-medium">Receipt photos.</strong> When you upload a receipt,
            the photo is sent to a text-recognition service to read it. The photo is not saved
            by this app. Only the text you confirm is kept. A receipt may show a name or
            signature (for example, who received the delivery), so it is visible to the
            text-recognition service while it is read.
          </li>
          <li>
            <strong className="font-medium">Delivery records.</strong> The details you confirm
            from each receipt: delivery number, dates, warehouse, store, items, quantities and
            prices, plus any notes and quantity-correction reasons you type in.
          </li>
          <li>
            <strong className="font-medium">Technical logs.</strong> For each request to the
            server: the time, the page or action, the store code, whether it worked, and your
            device&apos;s IP address. These are used to keep the service running and to spot
            misuse. Passcodes and receipt contents are never written to these logs.
          </li>
          <li>
            <strong className="font-medium">Camera.</strong> Used only when you choose to take a
            receipt photo or scan a store QR code. The QR scanner reads the code on your phone
            and doesn&apos;t send the camera feed anywhere.
          </li>
        </ul>
        <p>
          Please don&apos;t type personal information (names, phone numbers and so on) into
          delivery notes or correction reasons. They are only meant for delivery details.
        </p>
      </Section>

      <Section title="What is stored on your phone">
        <p>
          The app saves the store code and passcode on your phone so you stay signed in, and
          keeps a copy of recent searches and uploads so they open without a connection. There
          are no advertising or tracking cookies and no analytics. Signing out removes the saved
          sign-in. Clearing the browser&apos;s site data removes everything.
        </p>
      </Section>

      <Section title="Who else handles the data">
        <p>The app relies on these service providers to run:</p>
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>Google Cloud Vision, which reads the text on receipt photos</li>
          <li>Supabase, which holds the database of delivery records</li>
          <li>Railway, which runs the server and keeps its technical logs</li>
          <li>Vercel, which hosts the app itself</li>
        </ul>
        <p>
          Some of these providers may process data outside the Philippines. The information is
          not sold or shared with anyone else.
        </p>
      </Section>

      <Section title="How long it is kept">
        <p>
          Delivery records are kept while the store uses the app, so past deliveries can still
          be searched. Technical logs are kept only for the hosting provider&apos;s limited log
          retention period. Receipt photos are not kept at all.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          Under the Data Privacy Act you can ask what information about you is held, have it
          corrected, object to its use, or ask for it to be deleted. You can also complain to the
          National Privacy Commission (privacy.gov.ph).
        </p>
      </Section>

      <Section title="Who is responsible">
        <p>
          {DATA_CONTROLLER} is responsible for the information handled by this app. Questions or
          requests about it go to the contact below.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          {CONTACT_NAME}
          <br />
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary underline underline-offset-4">
            {CONTACT_EMAIL}
          </a>
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}
