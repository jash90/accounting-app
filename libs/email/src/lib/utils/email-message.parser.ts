import { type AddressObject, type ParsedMail } from 'mailparser';

import { type EmailAddress, type ReceivedEmail } from '../interfaces/email-message.interface';

/**
 * Convert mailparser ParsedMail to ReceivedEmail
 *
 * @param parsed - Parsed email from mailparser
 * @param seqno - Message sequence number
 * @returns ReceivedEmail object
 */
export function convertParsedMailToReceivedEmail(parsed: ParsedMail, seqno: number): ReceivedEmail {
  return {
    uid: 0, // Will be set from attributes
    seqno,
    subject: parsed.subject || '',
    from: convertAddressObject(parsed.from),
    to: convertAddressObject(parsed.to),
    cc: parsed.cc ? convertAddressObject(parsed.cc) : undefined,
    date: parsed.date || new Date(),
    flags: [],
    text: parsed.text,
    html: parsed.html ? parsed.html.toString() : undefined,
    attachments: parsed.attachments?.map(
      (att: {
        filename?: string;
        contentType: string;
        size: number;
        content: Buffer;
        contentId?: string;
      }) => ({
        filename: att.filename || 'unknown',
        contentType: att.contentType,
        size: att.size,
        content: att.content,
        contentId: att.contentId,
      })
    ),
  };
}

/**
 * Convert mailparser AddressObject to EmailAddress array
 *
 * @param addressObj - AddressObject or array of AddressObjects from mailparser
 * @returns Array of EmailAddress objects
 */
export function convertAddressObject(
  addressObj: AddressObject | AddressObject[] | undefined
): EmailAddress[] {
  if (!addressObj) {
    return [];
  }

  const addresses = Array.isArray(addressObj) ? addressObj : [addressObj];

  return addresses.flatMap((addr) =>
    addr.value.map((v: { name?: string; address?: string }) => ({
      name: v.name,
      address: v.address || '',
    }))
  );
}
