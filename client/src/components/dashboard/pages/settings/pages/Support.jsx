import React, { useState } from 'react'
import { HelpCircleIcon, FileText, Play, Code, Download, ChevronRight } from 'lucide-react'
import { Separator } from '@/components/ui/shadcn/separator'
import { SettingsPageWrapper } from '../components'
import {
  Card,
  CardHeader,
  CardBody,
  FieldLabel,
  OutlineButton,
  StatusBadge,
  SelectDropdown,
  PrimaryButton,
  TextArea,
  TextInput,
} from '@/components/ui/global/subcomponents'

/* ── Local helpers ───────────────────────────────────────────── */

function GreenBadge({ children }) {
  return (
    <span
      className="rounded-lg px-2 py-0.5 text-xs font-medium leading-[1.33] flex-shrink-0"
      style={{ background: '#0d542b', color: '#7bf1a8', border: '1px solid transparent' }}
    >
      {children}
    </span>
  )
}

function AmberBadge({ children }) {
  return (
    <span
      className="rounded-lg px-2 py-0.5 text-xs font-medium leading-[1.33] flex-shrink-0"
      style={{ background: '#733e0a', color: '#ffdf20', border: '1px solid transparent' }}
    >
      {children}
    </span>
  )
}

/* ── Section 1: Help Center & Documentation ─────────────────── */

function DocLinkButton({ icon: Icon, title, subtitle }) {
  return (
    <button
      type="button"
      className="flex items-center justify-between rounded-lg px-3 py-4 text-left w-full"
      style={{ background: 'rgba(38,38,38,0.3)', border: '1px solid #262626' }}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-[#fafafa] flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-[#fafafa] leading-[1.43]">{title}</p>
          <p className="text-xs font-medium text-[#a1a1a1] leading-[1.33]">{subtitle}</p>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-[#fafafa] flex-shrink-0" />
    </button>
  )
}

function FaqItem({ question, description }) {
  return (
    <button
      type="button"
      className="w-full rounded-lg px-3 py-3 text-left"
      style={{ border: '1px solid transparent' }}
    >
      <p className="text-sm font-medium text-[#fafafa] leading-[1.43]">{question}</p>
      <p className="text-sm font-medium text-[#a1a1a1] leading-[1.43] mt-0.5">{description}</p>
    </button>
  )
}

function HelpCenter() {
  const docLinks = [
    { icon: FileText, title: 'Getting Started Guide', subtitle: 'Learn the basics' },
    { icon: Play,     title: 'Video Tutorials',       subtitle: 'Step-by-step guides' },
    { icon: Code,     title: 'API Documentation',     subtitle: 'Developer resources' },
    { icon: Download, title: 'User Manual',           subtitle: 'Complete PDF guide' },
  ]

  const faqs = [
    { question: 'How do I export my data?',       description: 'Learn about data export options and formats' },
    { question: 'How to set up alerts?',          description: 'Configure notifications and threshold alerts' },
    { question: 'Troubleshooting login issues',   description: 'Common solutions for access problems' },
  ]

  return (
    <Card>
      <CardHeader
        title="Help Center & Documentation"
        description="Access guides, tutorials, and documentation"
      />
      <CardBody>
        <div className="grid grid-cols-2 gap-3">
          {docLinks.map(link => (
            <DocLinkButton key={link.title} {...link} />
          ))}
        </div>

        <Separator className="bg-[#262626]" />

        <div>
          <FieldLabel>Frequently Asked Questions</FieldLabel>
          <div className="space-y-2">
            {faqs.map(faq => (
              <FaqItem key={faq.question} {...faq} />
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

/* ── Section 2: Contact Support ─────────────────────────────── */

function ContactButton({ title, subtitle, primary }) {
  return (
    <button
      type="button"
      className="flex-1 flex items-center justify-center gap-2 rounded-lg py-4 px-4"
      style={
        primary
          ? { background: '#fafafa' }
          : { background: 'rgba(38,38,38,0.3)', border: '1px solid #262626' }
      }
    >
      <div className="text-left">
        <p className={`text-sm font-medium leading-[1.43] ${primary ? 'text-[#171717]' : 'text-[#fafafa]'}`}>
          {title}
        </p>
        <p className={`text-xs font-medium leading-[1.33] ${primary ? 'text-[#171717] opacity-80' : 'text-[#a1a1a1]'}`}>
          {subtitle}
        </p>
      </div>
    </button>
  )
}

function ContactSupport() {
  const hours = [
    { day: 'Monday – Friday', time: '9:00 AM – 6:00 PM EST' },
    { day: 'Saturday',        time: '10:00 AM – 2:00 PM EST' },
    { day: 'Sunday',          time: 'Closed' },
  ]

  return (
    <Card>
      <CardHeader
        title="Contact Support"
        description="Get help from our support team via live chat or email"
      />
      <CardBody>
        <div className="flex gap-3">
          <ContactButton title="Start Live Chat"  subtitle="Average response: 2 minutes" primary />
          <ContactButton title="Email Support"    subtitle="Response within 24 hours" />
        </div>

        <Separator className="bg-[#262626]" />

        <div>
          <FieldLabel>Support Hours</FieldLabel>
          <div className="space-y-1">
            {hours.map(({ day, time }) => (
              <div key={day} className="flex items-center justify-between">
                <span className="text-sm text-[#fafafa]">{day}</span>
                <span className="text-sm text-[#fafafa]">{time}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="flex items-center gap-2 rounded-[10px] px-3 py-3"
          style={{ background: 'rgba(3,46,21,0.2)', border: '1px solid #016630' }}
        >
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#00c950' }} />
          <p className="text-sm text-[#fafafa]">Support team is currently online</p>
        </div>
      </CardBody>
    </Card>
  )
}

/* ── Section 3: Feedback & Feature Requests ─────────────────── */

function FeedbackRow({ title, submitted, status }) {
  const badge = status === 'Resolved'
    ? <GreenBadge>Resolved</GreenBadge>
    : <StatusBadge>In Review</StatusBadge>

  return (
    <div
      className="flex items-center justify-between rounded-[10px] px-3 py-3"
      style={{ border: '1px solid #262626' }}
    >
      <div className="min-w-0 pr-3">
        <p className="text-base font-medium text-[#fafafa] leading-[1.5]">{title}</p>
        <p className="text-sm text-[#a1a1a1]">{submitted}</p>
      </div>
      {badge}
    </div>
  )
}

function FeedbackRequests() {
  const [subject, setSubject] = useState('')
  const [details, setDetails] = useState('')

  const recentFeedback = [
    { title: 'Dashboard loading improvement', submitted: 'Submitted 2 days ago',  status: 'In Review' },
    { title: 'Export functionality bug',       submitted: 'Submitted 1 week ago',  status: 'Resolved' },
  ]

  return (
    <Card>
      <CardHeader
        title="Feedback & Feature Requests"
        description="Help us improve by sharing your feedback and suggestions"
      />
      <CardBody>
        <SelectDropdown label="Feedback Type" value="Select feedback type" />

        <div>
          <FieldLabel>Subject</FieldLabel>
          <TextInput
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Brief description of your feedback"
          />
        </div>

        <div>
          <FieldLabel>Details</FieldLabel>
          <TextArea
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="Please provide detailed feedback. For bug reports, include steps to reproduce the issue."
            rows={4}
          />
        </div>

        <SelectDropdown label="Priority" value="Medium" />

        <PrimaryButton>Submit Feedback</PrimaryButton>

        <Separator className="bg-[#262626]" />

        <div>
          <FieldLabel>Recent Feedback</FieldLabel>
          <div className="space-y-2">
            {recentFeedback.map(item => (
              <FeedbackRow key={item.title} {...item} />
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

/* ── Section 4: System Status ────────────────────────────────── */

function StatusRow({ name, detail, dotColor, badge }) {
  return (
    <div
      className="flex items-center justify-between rounded-[10px] px-3 py-3"
      style={{ border: '1px solid #262626' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: dotColor }} />
        <div>
          <p className="text-base font-medium text-[#fafafa] leading-[1.5]">{name}</p>
          <p className="text-sm text-[#a1a1a1]">{detail}</p>
        </div>
      </div>
      {badge}
    </div>
  )
}

function SystemStatus() {
  const services = [
    { name: 'Dashboard Services', detail: 'All systems operational',   dotColor: '#00c950', badge: <GreenBadge>Operational</GreenBadge> },
    { name: 'Data Processing',    detail: 'Processing data normally',   dotColor: '#00c950', badge: <GreenBadge>Operational</GreenBadge> },
    { name: 'API Services',       detail: 'Experiencing minor delays',  dotColor: '#f0b100', badge: <AmberBadge>Degraded</AmberBadge> },
    { name: 'Notifications',      detail: 'All notifications working',  dotColor: '#00c950', badge: <GreenBadge>Operational</GreenBadge> },
  ]

  return (
    <Card>
      <CardHeader
        title="System Status"
        description="Check the current status of our services"
      />
      <CardBody>
        <div className="space-y-3">
          {services.map(service => (
            <StatusRow key={service.name} {...service} />
          ))}
        </div>

        <OutlineButton className="w-full">View Status Page</OutlineButton>

        <p className="text-sm text-[#a1a1a1] text-center">Last updated: 5 minutes ago</p>
      </CardBody>
    </Card>
  )
}

/* ── Root export ─────────────────────────────────────────────── */

export function Support() {
  return (
    <SettingsPageWrapper icon={HelpCircleIcon} title="Support &amp; Help">
      <HelpCenter />
      <ContactSupport />
      <FeedbackRequests />
      <SystemStatus />
    </SettingsPageWrapper>
  )
}
