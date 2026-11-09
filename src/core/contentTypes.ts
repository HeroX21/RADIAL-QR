/**
 * Content Type Formatter & Parser for Universal and Radial QR.
 * Handles URL, Text, Wi-Fi, vCard Contact, Email, Phone, SMS, and UPI.
 */

import { PayloadType } from './rqrProtocol';

export type ContentKind = 'url' | 'text' | 'wifi' | 'contact' | 'email' | 'phone' | 'sms' | 'upi';

export interface WifiData {
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

export interface ContactData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  organization: string;
  title: string;
  url: string;
}

export interface EmailData {
  email: string;
  subject: string;
  body: string;
}

export interface PhoneData {
  phone: string;
}

export interface SmsData {
  phone: string;
  message: string;
}

export interface UpiData {
  payeeAddress: string; // VPA, e.g. name@okhdfcbank
  payeeName: string;
  amount?: string;
  currency?: string;
  transactionNote?: string;
}

export interface ContentPayload {
  kind: ContentKind;
  rawText: string;
  wifi?: WifiData;
  contact?: ContactData;
  email?: EmailData;
  phone?: PhoneData;
  sms?: SmsData;
  upi?: UpiData;
}

export const CONTENT_TYPE_MAP: Record<ContentKind, PayloadType> = {
  url: PayloadType.URL,
  text: PayloadType.TEXT,
  wifi: PayloadType.WIFI,
  contact: PayloadType.CONTACT,
  email: PayloadType.EMAIL,
  phone: PayloadType.PHONE,
  sms: PayloadType.SMS,
  upi: PayloadType.UPI,
};

export function formatContentPayload(content: ContentPayload): string {
  switch (content.kind) {
    case 'url': {
      let url = content.rawText.trim();
      if (!/^https?:\/\//i.test(url) && url.length > 0) {
        url = `https://${url}`;
      }
      return url || 'https://radialqr.art';
    }

    case 'text':
      return content.rawText || 'RADIAL QR: Decode Beyond the Square';

    case 'wifi': {
      const wifi = content.wifi || { ssid: 'Guest_WiFi', password: '', encryption: 'WPA', hidden: false };
      const enc = wifi.encryption === 'nopass' ? 'nopass' : wifi.encryption;
      return `WIFI:S:${wifi.ssid};T:${enc};P:${wifi.password};H:${wifi.hidden ? 'true' : 'false'};;`;
    }

    case 'contact': {
      const c = content.contact || {
        firstName: 'Elena',
        lastName: 'Rostova',
        phone: '+1 555-0199',
        email: 'elena@radialqr.art',
        organization: 'Radial Labs',
        title: 'Creative Technologist',
        url: 'https://radialqr.art',
      };
      return [
        'BEGIN:VCARD',
        'VERSION:3.0',
        `N:${c.lastName};${c.firstName};;;`,
        `FN:${c.firstName} ${c.lastName}`.trim(),
        c.organization ? `ORG:${c.organization}` : '',
        c.title ? `TITLE:${c.title}` : '',
        c.phone ? `TEL;TYPE=CELL:${c.phone}` : '',
        c.email ? `EMAIL:${c.email}` : '',
        c.url ? `URL:${c.url}` : '',
        'END:VCARD',
      ]
        .filter(Boolean)
        .join('\n');
    }

    case 'email': {
      const em = content.email || { email: 'contact@radialqr.art', subject: 'Inquiry', body: 'Hello' };
      const q = new URLSearchParams();
      if (em.subject) q.set('subject', em.subject);
      if (em.body) q.set('body', em.body);
      const query = q.toString() ? `?${q.toString()}` : '';
      return `mailto:${em.email}${query}`;
    }

    case 'phone': {
      const ph = content.phone?.phone || '+1 555-0199';
      return `tel:${ph.replace(/\s+/g, '')}`;
    }

    case 'sms': {
      const sms = content.sms || { phone: '+1 555-0199', message: 'Hello from Radial QR' };
      return `smsto:${sms.phone.replace(/\s+/g, '')}:${sms.message}`;
    }

    case 'upi': {
      const upi = content.upi || {
        payeeAddress: 'radial@upi',
        payeeName: 'Radial Studios',
        amount: '100.00',
        currency: 'INR',
        transactionNote: 'Artistic QR License',
      };
      const params = new URLSearchParams({
        pa: upi.payeeAddress,
        pn: upi.payeeName,
        cu: upi.currency || 'INR',
      });
      if (upi.amount) params.set('am', upi.amount);
      if (upi.transactionNote) params.set('tn', upi.transactionNote);
      return `upi://pay?${params.toString()}`;
    }

    default:
      return content.rawText || '';
  }
}

/**
 * Detect the content type of a scanned string
 */
export function detectScannedContentType(text: string): {
  kind: ContentKind;
  summary: string;
  actionLabel: string;
  actionUrl?: string;
} {
  const trimmed = text.trim();

  if (/^https?:\/\//i.test(trimmed)) {
    return {
      kind: 'url',
      summary: trimmed,
      actionLabel: 'Open URL',
      actionUrl: trimmed,
    };
  }

  if (/^WIFI:/i.test(trimmed)) {
    const ssidMatch = trimmed.match(/S:([^;]+)/i);
    const ssid = ssidMatch ? ssidMatch[1] : 'Unknown Network';
    return {
      kind: 'wifi',
      summary: `Wi-Fi Network: ${ssid}`,
      actionLabel: 'Copy Wi-Fi Details',
    };
  }

  if (/^BEGIN:VCARD/i.test(trimmed)) {
    const fnMatch = trimmed.match(/FN:([^\r\n]+)/i);
    const name = fnMatch ? fnMatch[1] : 'Contact Card';
    return {
      kind: 'contact',
      summary: `vCard: ${name}`,
      actionLabel: 'Copy Contact Card',
    };
  }

  if (/^mailto:/i.test(trimmed)) {
    const mail = trimmed.replace(/^mailto:/i, '').split('?')[0];
    return {
      kind: 'email',
      summary: `Email to: ${mail}`,
      actionLabel: 'Send Email',
      actionUrl: trimmed,
    };
  }

  if (/^tel:/i.test(trimmed)) {
    const num = trimmed.replace(/^tel:/i, '');
    return {
      kind: 'phone',
      summary: `Phone: ${num}`,
      actionLabel: 'Dial Number',
      actionUrl: trimmed,
    };
  }

  if (/^smsto:/i.test(trimmed)) {
    const parts = trimmed.replace(/^smsto:/i, '').split(':');
    return {
      kind: 'sms',
      summary: `SMS to: ${parts[0]}`,
      actionLabel: 'Send SMS',
      actionUrl: `sms:${parts[0]}`,
    };
  }

  if (/^upi:\/\/pay/i.test(trimmed)) {
    return {
      kind: 'upi',
      summary: 'UPI Payment Link',
      actionLabel: 'Copy UPI URI',
    };
  }

  return {
    kind: 'text',
    summary: trimmed.length > 80 ? `${trimmed.slice(0, 80)}...` : trimmed,
    actionLabel: 'Copy Text',
  };
}
