export const metadata = { title: 'Privacy Policy — ChurchTrakr' }

const LAST_UPDATED = 'September 2026'
const CONTACT_EMAIL = 'privacy@churchtrakr.com'

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '2rem 1.25rem 5rem', fontFamily: 'inherit' }}>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, fontWeight: 700, color: '#1a3a2a', marginBottom: 6 }}>
        Privacy Policy
      </h1>
      <p style={{ fontSize: 13, color: '#8a9e90', marginBottom: '2rem' }}>Last updated: {LAST_UPDATED}</p>

      <Section title="What this is">
        ChurchTrakr is an attendance and follow-up management tool for churches and ministry groups. This policy explains what personal data we collect, why we collect it, how it is protected, and your rights over it. We have written this in plain language, not legal jargon.
      </Section>

      <Section title="Who controls your data">
        ChurchTrakr operates as a data processor on behalf of the church or ministry group that creates an account (the data controller). The church admin is responsible for ensuring that members whose data is entered have given appropriate consent for it to be stored and used for pastoral follow-up purposes.
      </Section>

      <Section title="What personal data we store">
        <p style={{ marginBottom: 10 }}>When a church admin uses ChurchTrakr, the following data about their congregation members may be stored:</p>
        <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, color: '#4a4a4a', fontSize: 14 }}>
          <li><strong>Name</strong> — used to identify members in attendance lists</li>
          <li><strong>Phone number</strong> — used to send SMS follow-up messages and enable direct calling</li>
          <li><strong>Address</strong> — optional, for pastoral visits</li>
          <li><strong>Birthday</strong> — optional, for birthday reminders</li>
          <li><strong>Attendance records</strong> — which services a member attended or missed</li>
          <li><strong>Follow-up notes</strong> — notes written by leaders after following up with a member</li>
          <li><strong>Group membership</strong> — which ministry group a member belongs to</li>
        </ul>
        <p style={{ marginTop: 10 }}>We also store data about the church account itself: the admin's name, email address, phone number, church name, and location.</p>
      </Section>

      <Section title="Why we collect this data">
        Every piece of data collected has a specific, legitimate purpose:
        <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, color: '#4a4a4a', fontSize: 14, marginTop: 8 }}>
          <li><strong>Names and phone numbers</strong> — to enable follow-up contact when a member is absent</li>
          <li><strong>Attendance records</strong> — to identify who needs to be contacted and track pastoral care over time</li>
          <li><strong>Follow-up notes</strong> — to provide context to leaders doing pastoral care</li>
          <li><strong>Birthdays and addresses</strong> — to enable personal care by leaders who choose to use these features</li>
        </ul>
        We do not sell this data. We do not use it for advertising. We do not share it with any third party except the SMS provider (Termii) when you choose to send SMS messages.
      </Section>

      <Section title="Who can see your data">
        <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, color: '#4a4a4a', fontSize: 14 }}>
          <li>Only the church admin and any team members they give access to can see member data</li>
          <li>One church cannot see another church's data — this is enforced at the database level</li>
          <li>ChurchTrakr staff can access account data only to provide technical support, and only when necessary</li>
          <li>Termii (our SMS provider) receives phone numbers and message text when you send SMS messages</li>
          <li>Supabase (our database and auth provider) hosts the data on encrypted servers in the EU</li>
        </ul>
      </Section>

      <Section title="How we protect your data">
        <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, color: '#4a4a4a', fontSize: 14 }}>
          <li>All data is encrypted at rest and in transit (TLS)</li>
          <li>Database access is controlled by Row Level Security — every query is scoped to a single church</li>
          <li>Passwords are never stored in our database — we use Supabase Auth (bcrypt)</li>
          <li>Our servers never log phone numbers, message content, or other personal data to system logs</li>
          <li>Admin access to the platform requires a separate secure credential</li>
        </ul>
      </Section>

      <Section title="How long we keep your data">
        <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, color: '#4a4a4a', fontSize: 14 }}>
          <li>Member data is kept for as long as your church account is active</li>
          <li>When you delete your account, all member data, attendance records, follow-up notes, and SMS logs are permanently deleted immediately</li>
          <li>We do not keep backups of deleted account data beyond 30 days</li>
        </ul>
      </Section>

      <Section title="Your rights (and your members' rights)">
        Under Nigeria's NDPR and the GDPR, individuals have the right to:
        <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, color: '#4a4a4a', fontSize: 14, marginTop: 8 }}>
          <li><strong>Access</strong> — know what data is held about them</li>
          <li><strong>Correction</strong> — have incorrect data fixed</li>
          <li><strong>Deletion</strong> — have their data removed (right to be forgotten)</li>
          <li><strong>Portability</strong> — receive their data in a readable format</li>
        </ul>
        <p style={{ marginTop: 10 }}>Church admins can delete individual member records from the Members page at any time. If a congregation member wishes to have their data removed from a church's account, they should contact the church admin directly. If you cannot resolve a data request with your church admin, contact us at <strong>{CONTACT_EMAIL}</strong>.</p>
      </Section>

      <Section title="Deleting your account">
        You can permanently delete your ChurchTrakr account and all associated data from <strong>Settings → Delete Account</strong>. This action is immediate and irreversible. All member data, attendance records, follow-up notes, and SMS logs will be permanently deleted.
      </Section>

      <Section title="Cookies and local storage">
        ChurchTrakr uses browser local storage (not third-party cookies) to store:
        <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, color: '#4a4a4a', fontSize: 14, marginTop: 8 }}>
          <li>Your notification preferences</li>
          <li>The date of the last attendance session you recorded</li>
          <li>Offline attendance data queued for sync when connectivity returns</li>
          <li>Custom SMS templates you create</li>
        </ul>
        None of this data is sent to third-party tracking services. We do not use Google Analytics, Meta Pixel, or any advertising technology.
      </Section>

      <Section title="Third-party services">
        <ul style={{ paddingLeft: '1.25rem', lineHeight: 2, color: '#4a4a4a', fontSize: 14 }}>
          <li><strong>Supabase</strong> — database and authentication (EU servers)</li>
          <li><strong>Termii</strong> — SMS delivery (Nigeria)</li>
          <li><strong>Paystack</strong> — payment processing for SMS credits (Nigeria)</li>
          <li><strong>Vercel</strong> — application hosting (US/EU)</li>
        </ul>
        Each of these services has their own privacy policy and data processing agreements.
      </Section>

      <Section title="Changes to this policy">
        If we make significant changes to this policy, we will notify active church admins by email and update the "Last updated" date at the top of this page.
      </Section>

      <Section title="Contact">
        For any privacy-related questions or data requests, contact us at: <strong>{CONTACT_EMAIL}</strong>
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '1.75rem' }}>
      <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 700, color: '#1a3a2a', marginBottom: 10 }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: '#4a4a4a', lineHeight: 1.7 }}>
        {children}
      </div>
    </div>
  )
}
