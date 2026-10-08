/**
 * GymGO's terms of service, privacy policy, refund policy and community
 * guidelines, written once for the app and the server's public pages
 * (/terms, /privacy, /refunds, /community), which Stripe and the app stores
 * ask for.
 *
 * Who runs GymGO, how to reach them and whose laws apply are the owner's to
 * set on the server (README, "Legal basics"); until then the documents name
 * "the GymGO team" and point to Report a bug. Every statement about data
 * here has to stay true of the code: change one, change the other.
 *
 * Text may link to another document as [its title](privacy), or out as
 * [text](https://…). `legalLinks` splits a paragraph into text and links for
 * the app and the HTML pages to draw.
 */

/** Bumped whenever the terms or privacy policy change in a way people should see. */
export const LEGAL_VERSION = '2026-10-06';
/** The same date, as the documents show it. */
export const LEGAL_UPDATED = '6 October 2026';

export type LegalDocId = 'terms' | 'privacy' | 'refunds' | 'community';
export const LEGAL_DOC_IDS: readonly LegalDocId[] = ['terms', 'privacy', 'refunds', 'community'];

/** Who runs GymGO, as the owner sets it on the server. */
export interface LegalOperator {
  /** The person or business that runs GymGO. */
  name: string;
  /** For legal and privacy questions; without one, people are pointed to Report a bug. */
  email: string | null;
  /** A postal address, if the owner gives one. */
  address: string | null;
  /** Whose laws the terms are under: "Victoria, Australia". */
  governingLaw: string;
  /** Where the server and its backups are, if the owner says. */
  hostedIn: string | null;
}

export const DEFAULT_OPERATOR: LegalOperator = {
  name: 'the GymGO team',
  email: null,
  address: null,
  governingLaw: 'Australia',
  hostedIn: null,
};

/** A paragraph, or a list of points. */
export type LegalBlock = string | { list: string[] };

export interface LegalSection {
  heading: string;
  blocks: LegalBlock[];
}

export interface LegalDoc {
  id: LegalDocId;
  title: string;
  /** One line on what it covers, for lists of the documents. */
  summary: string;
  sections: LegalSection[];
}

export const LEGAL_TITLES: Record<LegalDocId, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  refunds: 'Refunds and Cancelling',
  community: 'Community Guidelines',
};

const SUMMARIES: Record<LegalDocId, string> = {
  terms: 'The agreement for using GymGO and GymGO Pro',
  privacy: 'What GymGO keeps about you, why, and your choices',
  refunds: 'Cancelling Pro, and when you get your money back',
  community: 'The rules for reviews, photos and reports',
};

/** How to reach whoever runs GymGO, as a phrase that ends a sentence. */
function reach(operator: LegalOperator): string {
  const by = operator.email ? `email ${operator.email}` : 'use Report a bug in the app (Profile → Report a bug)';
  return operator.address ? `${by}, or write to ${operator.address}` : by;
}

function terms(op: LegalOperator): LegalSection[] {
  return [
    {
      heading: 'About these terms',
      blocks: [
        `GymGO is run by ${op.name} (“we”, “us”). These terms are the agreement between you and us for using GymGO: the app, its website and its server. By using GymGO or making an account you agree to them, and to the [Community Guidelines](community) when you post. Our [Privacy Policy](privacy) explains what we do with your information.`,
        'If you don’t agree, please don’t use GymGO. The GymGO app needs a free account; GymGO’s website can be used to find gyms without one. You can read these terms, the Privacy Policy and the Community Guidelines before you make an account.',
      ],
    },
    {
      heading: 'Who can use GymGO',
      blocks: [
        'The GymGO app needs an account (GymGO’s website doesn’t), and accounts are for people 13 and over: making one asks the month and year you were born. If you’re under 18, check with a parent or guardian first; to buy GymGO Pro you need to be 18 or have their permission.',
      ],
    },
    {
      heading: 'Your account',
      blocks: [
        {
          list: [
            'Give an email address you can use, and keep your password to yourself. One account is for one person.',
            'You’re responsible for what happens on your account. If you think someone else has used it, change your password (this signs out every other device) and tell us.',
            'You can delete your account at any time in Profile → Account → Delete account. That deletes what it holds, as the [Privacy Policy](privacy) explains.',
          ],
        },
      ],
    },
    {
      heading: 'Gym information',
      blocks: [
        'GymGO shows what it can find about gyms: opening hours, prices, entry rules and equipment from gyms’ own websites, OpenStreetMap and members, each with its source and when it was checked. Gyms change things without telling anyone, so information can be out of date or wrong, and GymGO says “unknown” rather than guess.',
        'Always check with the gym before you rely on something that matters to you, such as being let in or what a visit costs. Gyms make their own decisions about who they let in and what they charge, and GymGO isn’t part of any gym unless it says so.',
        'Someone who runs a gym can claim it. Only claim a gym you own or are allowed to speak for, and give honest details: we check before approving, and remove an owner who misleads anyone. What a verified owner sends (visitor hours, a casual price) is checked by a moderator and shown as from the gym; it doesn’t make GymGO part of that gym.',
      ],
    },
    {
      heading: 'Training and your health',
      blocks: [
        'GymGO’s training tools (the workout builder, plate calculator, rest and interval timers, 1-rep max estimates, next-session targets and progress charts) are general information and estimates, not medical, health or coaching advice. They don’t know your health, injuries or experience.',
        'Talk to a doctor before you start or change an exercise programme, especially if you have a health condition, are pregnant or haven’t trained for a while. Lift within your ability, use a spotter or safety equipment for heavy lifts, and stop if something hurts. You train at your own risk.',
      ],
    },
    {
      heading: 'What you post',
      blocks: [
        'Reviews, photos and your reports of prices, visits, machines, closures and how busy a gym is stay yours. By posting one you give us a worldwide, non-exclusive, royalty-free licence to keep it, show it in GymGO, and change its form to do that (for example making photos smaller and removing their location data), for as long as it’s in GymGO. Reports of prices are shown without your name; reviews show your display name.',
        'When you post, you confirm it’s first-hand and honest, that you took the photo or wrote the review, that anyone recognisable in a photo agreed to be in it, and that it follows the [Community Guidelines](community). Reviews and photos wait for a moderator, and we may decline or remove anything that breaks these terms or the law.',
      ],
    },
    {
      heading: 'Using GymGO fairly',
      blocks: [
        'Please don’t:',
        {
          list: [
            'break the law with GymGO, or use it to harass, deceive or harm anyone;',
            'try to get into accounts, data or parts of the server that aren’t yours, test its security without our written permission, or interfere with how it runs;',
            'copy GymGO’s data in bulk, run automated requests or accounts, or get round the limits on how much can be done at once;',
            'post fake reviews or reports, or pretend to be someone else;',
            'copy, resell or rebrand GymGO itself.',
          ],
        },
        'If you find a security problem, please tell us privately first (see Contact, below) and give us time to fix it before telling anyone else.',
      ],
    },
    {
      heading: 'GymGO Pro',
      blocks: [
        {
          list: [
            'Pro is a subscription, paid monthly or yearly through Stripe. The price, tax included, is shown before you pay, and paying means you agree to it.',
            'It renews automatically at the end of each month or year, at the same price, until you cancel. You can cancel at any time in Profile → Manage subscription; you keep Pro until the end of the time you’ve paid for, and aren’t charged again.',
            'A new account can try monthly Pro free for 3 days, once, in the first 30 days after it’s made. Stripe takes your card when the trial starts. When the trial ends, the monthly price is charged to that card and Pro renews every month until you cancel. Cancel before the trial ends (Profile → Manage subscription) and you aren’t charged anything; Pro stays on until the trial’s end.',
            'If we change the price, we’ll tell you at least 30 days before your next renewal, and you can cancel before it applies.',
            'When Pro ends, nothing you saved is deleted; you just can’t add more than the free plan allows.',
            'Refunds work as [Refunds and Cancelling](refunds) explains.',
          ],
        },
        'Pro Duo is the same subscription for two: you, and one more person you add by their friend code. Only Pro is shared, nothing else; they keep Pro while your Duo lasts, and either of you can end it.',
        'A gift of Pro is paid once and gives a code for a year of Pro, starting when it’s redeemed. It doesn’t renew. Keep the code safe: whoever enters it first gets the year.',
      ],
    },
    {
      heading: 'Day passes',
      blocks: [
        'Where GymGO has an agreement with a gym, you may be able to buy a day pass through GymGO. The pass price and GymGO’s booking fee are shown apart, tax included, before you pay. The gym provides the visit and its own rules apply, as if you’d paid at reception (an induction, ID, its hours); GymGO takes the booking and the payment.',
      ],
    },
    {
      heading: 'Other services',
      blocks: [
        'GymGO uses other companies’ services, whose own terms also apply when you use them through GymGO: Stripe for payments, Apple and Google if you sign in with them, Google’s map, Street View and photos when you choose to show them, and OpenStreetMap, OpenFreeMap and Apple Maps for maps and place data. We aren’t responsible for those services or for websites GymGO links to, such as gyms’ own.',
      ],
    },
    {
      heading: 'GymGO’s own work',
      blocks: [
        'The GymGO app, its name, logo and design are ours, and these terms don’t give you any right to them beyond using GymGO. Map data is © OpenStreetMap contributors, available under the Open Database Licence, and other open-source software and data in GymGO are under their own licences.',
        'If something on GymGO is yours and was posted without your permission, Profile → Copyright and takedowns explains how to send a notice.',
      ],
    },
    {
      heading: 'Closing accounts',
      blocks: [
        'We may suspend or close an account that breaks these terms, the [Community Guidelines](community) or the law, or that puts other people or GymGO at risk, and remove what it posted. Where it’s fair and safe to, we’ll tell you why. If we close an account with a Pro subscription for a reason other than you breaking these terms, we’ll refund the unused part of what you paid.',
        'We may also change or stop parts of GymGO. If we stop GymGO altogether, we’ll give you notice, time to download your data, and a refund of any Pro time you’ve paid for and can’t use.',
      ],
    },
    {
      heading: 'Our responsibility to you',
      blocks: [
        'Nothing in these terms takes away rights you have that the law doesn’t allow to be taken away, including the consumer guarantees under the Australian Consumer Law and your rights as a consumer where you live. Where those rights apply, we give you everything they require.',
        'Apart from that, and as far as the law allows: GymGO is provided as it is; we don’t promise it will always be available, free of errors, or that gym information is accurate or complete; we aren’t responsible for losses you couldn’t reasonably have expected, or for what gyms do; and our total responsibility to you for anything to do with GymGO is limited to what you paid us in the 12 months before the claim (if you paid nothing, A$50). Where the Australian Consumer Law lets us limit our responsibility for a service to supplying it again or paying for that, we do.',
      ],
    },
    {
      heading: 'Changes to these terms',
      blocks: [
        'We may update these terms as GymGO changes or the law does. The date at the top says when they last changed. If a change matters to you, we’ll tell you in the app before it applies, and the next time you use your account you’ll be asked to agree to the new terms; if you don’t, you can delete your account.',
      ],
    },
    {
      heading: 'Law and disagreements',
      blocks: [
        `These terms are governed by the laws of ${op.governingLaw}. If you have a problem with GymGO, please tell us first and we’ll try to sort it out. If we can’t, the courts of ${op.governingLaw} can decide it, although if you’re a consumer you can also use the courts and the consumer rights of the place where you live.`,
      ],
    },
    {
      heading: 'Contact',
      blocks: [`For anything about these terms, ${reach(op)}.`],
    },
  ];
}

function privacy(op: LegalOperator): LegalSection[] {
  return [
    {
      heading: 'In short',
      blocks: [
        {
          list: [
            'GymGO has no ads, no analytics and no session recording, and we never sell or rent your information.',
            'Your precise location stays on your device.',
            'The GymGO app needs a free account; GymGO’s website can be used without one. GymGO keeps what you add to your account, and you can download or delete all of it in Profile.',
            'Payments go through Stripe: GymGO never sees your card.',
          ],
        },
      ],
    },
    {
      heading: 'Who we are',
      blocks: [
        `GymGO is run by ${op.name}, who is responsible for your information under this policy (the “controller”, in data-protection law). For anything about your privacy, ${reach(op)}.`,
      ],
    },
    {
      heading: 'On your device, and what the server sees',
      blocks: [
        {
          list: [
            'Settings you make on a device (your country, appearance and trips, for example) are kept on that device. What your account keeps is listed under “With an account” below.',
            'Using GymGO’s website without an account, what you set up there (saved gyms, workouts, your training log and settings) is kept in that browser only, and GymGO keeps nothing about you.',
            'If you let GymGO use your location, it’s used on your device to find gyms near you and measure how far they are. It is never sent to GymGO or anyone else. Outside the cities GymGO carries, the app asks the server for the gyms in the map squares around you (about 30 km across, the same for everyone in them), never your position.',
            'When you search an area or type a town, the server looks it up on OpenStreetMap’s services (Overpass and Photon). It sends them the area or the name, not anything about you.',
            'Like any website, the server sees your device’s IP address with each request. It uses it to send the answer back and, for about an hour at most, to slow down anyone sending too many requests. It isn’t written to the database or any log.',
          ],
        },
      ],
    },
    {
      heading: 'With an account',
      blocks: [
        'GymGO keeps:',
        {
          list: [
            'your email address and display name, and your profile picture if you add one (its metadata removed);',
            'your password, only as a scrypt hash, which can’t be turned back into the password;',
            'when you made the account and when your age was checked (not the month and year you gave, which are checked and not kept), and which version of the terms you agreed to;',
            'if you sign in with Apple or Google, which account of theirs is yours and the email address they share;',
            'sign-ins, as tokens kept only as hashes, which expire after 30 days;',
            'what you add: saved gyms, your collection, workouts, your training log, reviews, photos (with their location data removed), and your reports of prices, visits, machines, closures and how busy a gym is;',
            'how busy you said a gym was, kept for a day; and if you claim a gym, your role there, the contact you gave and how to check it, which only GymGO’s admins see, and anything you send as its owner;',
            'gift codes you buy and whether they’ve been used, a gifted year you redeem, who’s on your Duo (or whose you’re on), and day passes you book (the gym, the day and what you paid);',
            'your friend code, who you’re friends with or have asked, the invites to train you send and receive (the gym, the time and any note), and whether you’ve joined the public leaderboard. Trips stay on your device;',
            'bug reports and copyright notices you send, with the details the form lists, and a reply address if you give one.',
          ],
        },
        'We use this to run your account and sync it between your devices, to show what you post, to keep GymGO safe (moderation, and stopping abuse and break-ins), and to answer you.',
      ],
    },
    {
      heading: 'GymGO Pro',
      blocks: [
        'Stripe takes your payment on its own page. GymGO keeps your Stripe customer number, your plan, its status and renewal date, and never sees your card. Stripe receives your name, email and payment details to charge you and send receipts, under [Stripe’s privacy policy](https://stripe.com/privacy), and keeps payment records for as long as tax and financial laws require.',
      ],
    },
    {
      heading: 'Emails',
      blocks: [
        'GymGO sends no marketing email. If you ask to reset your password, we email a link to your account’s address; if you ask for a reply to a bug report, we reply. These go through our email provider.',
      ],
    },
    {
      heading: 'Who else sees it',
      blocks: [
        {
          list: [
            'Other people see what you post: reviews with your display name, and photos. Price reports are shown without your name.',
            'Friends you accept see your display name, profile picture, the cards in your collection with their visit counts, and your totals, never the days you went; and the invites between you. If you join the public leaderboard, people signed in to GymGO see your display name, profile picture and how many gyms and visits you have, until you leave it.',
            'Companies that work for us, only as needed to provide GymGO: the provider that hosts our server and its backups, our email provider, and Stripe for payments. They may not use your information for anything else.',
            'Apple or Google, if you sign in with them, and Google itself if you choose to show its map, Street View or photos on a gym’s page; nothing loads from Google until you do.',
            'Map providers (OpenFreeMap, or Apple Maps on iPhone) see your device’s IP address and the part of the map you’re looking at, as any map does.',
            'Anyone the law requires us to tell, or when it’s needed to protect someone’s safety or GymGO from fraud or attack.',
          ],
        },
        'We never sell or rent your information, or share it for advertising.',
      ],
    },
    {
      heading: 'Why we’re allowed to',
      blocks: [
        'Where data-protection law such as the GDPR applies, we rely on: providing the service you asked for (your account and Pro); our legitimate interests in keeping GymGO safe, honest and working (moderation, rate limits, security, bug reports); your consent (your location, and showing Google content), which you can withdraw in your device’s settings or in Profile; and legal obligations (such as payment records).',
      ],
    },
    {
      heading: 'Where it’s kept',
      blocks: [
        op.hostedIn
          ? `GymGO’s server and its backups are in ${op.hostedIn}. Stripe, Apple and Google may handle information in other countries, including the United States, under their own safeguards.`
          : 'GymGO’s server and its backups are with our hosting provider. Stripe, Apple and Google may handle information in other countries, including the United States, under their own safeguards.',
      ],
    },
    {
      heading: 'How long it’s kept',
      blocks: [
        {
          list: [
            'Your account and everything in it: until you delete it. Deleting your account removes it from GymGO straight away, and from our backups within 14 days, as they’re replaced.',
            'Things you delete yourself (a photo, a saved gym, your collection) go the same way.',
            'Bug reports sent while signed in are deleted with your account; ones sent signed out aren’t linked to anyone, and we’ll delete one if you ask.',
            'Payment records: as long as the law requires, by Stripe.',
          ],
        },
      ],
    },
    {
      heading: 'Your choices and rights',
      blocks: [
        {
          list: [
            'See and take your data: Profile → Download my data gives you everything GymGO keeps about you, as one file.',
            'Correct it: change your name, picture and password in Profile; for anything else, ask us.',
            'Delete it: Profile → Account → Delete account removes your account and what it holds (and cancels Pro first).',
            'Your location: turn it off in your device’s settings at any time; GymGO still works with a town or area you choose.',
          ],
        },
        'Depending on where you live (for example under Australia’s Privacy Act, the GDPR in the EU and UK, or California’s privacy laws), you may also have the right to object to or restrict how we use your information, and to complain to your privacy regulator, such as the Office of the Australian Information Commissioner. We don’t sell or share personal information as California’s law defines it. We’ll answer any request within 30 days, and won’t treat you differently for making one.',
      ],
    },
    {
      heading: 'Children',
      blocks: [
        'Accounts are for people 13 and over, and the GymGO app can’t be used without one; GymGO’s website can, and keeps nothing about anyone using it without an account. Making an account asks the month and year you were born; the answer is checked, not kept. If we learn that an account belongs to someone under 13, we delete it.',
      ],
    },
    {
      heading: 'Keeping it safe',
      blocks: [
        'The app and server talk only over encrypted connections when GymGO is hosted. Passwords and sign-in tokens are kept only as hashes, photos lose their location data, and the server limits how fast anyone can try passwords or send requests. Only the people who run GymGO can reach its server. No system is perfectly secure, so if something ever goes wrong that puts your information at risk, we’ll tell you and the regulator as the law requires.',
      ],
    },
    {
      heading: 'Cookies and tracking',
      blocks: [
        'GymGO uses no cookies for tracking and no analytics, advertising or tracking code. The website version keeps your settings and sign-in in your browser’s own storage, as the app does on your phone.',
      ],
    },
    {
      heading: 'Changes to this policy',
      blocks: [
        'If we change how we use your information, we’ll update this policy and its date, and tell you in the app before a change that matters to you applies.',
      ],
    },
  ];
}

function refunds(op: LegalOperator): LegalSection[] {
  return [
    {
      heading: 'Cancelling',
      blocks: [
        'You can cancel GymGO Pro at any time in Profile → Manage subscription, which opens Stripe’s page for your subscription. You keep Pro until the end of the month or year you’ve paid for, and you aren’t charged again. Nothing you saved is deleted when Pro ends.',
        'In a free trial, cancel before it ends and you’re never charged. Once it ends, the first monthly payment is taken and the usual refund rules below apply to it.',
      ],
    },
    {
      heading: 'Getting your money back',
      blocks: [
        {
          list: [
            'Changed your mind? Ask within 14 days of your first payment for Pro, or of a yearly renewal, and we’ll refund that payment in full.',
            'Monthly renewals aren’t refunded once they’re charged, but you can cancel at any time so the next one isn’t.',
            'If GymGO Pro doesn’t work as it should and we can’t fix it, or we charged you by mistake, we’ll refund you whenever it happened.',
            'If we close your account for a reason other than you breaking the [Terms of Service](terms), or stop GymGO, we’ll refund the time you’ve paid for and can’t use.',
            'A gift of Pro: we’ll refund it in full if you ask within 14 days of buying it and nobody has used the code. Once it’s been redeemed, the year belongs to whoever redeemed it.',
            'A day pass: cancel up to the day before for a full refund, booking fee included. On the day, or if you didn’t go, it isn’t refunded, unless the gym couldn’t let you in, in which case it all is.',
          ],
        },
        'None of this limits your rights under the Australian Consumer Law or the consumer law where you live, which give you a remedy when a service has a major problem.',
      ],
    },
    {
      heading: 'How to ask',
      blocks: [
        `${reach(op).replace(/^./, (first) => first.toUpperCase())}, with the email address of your GymGO account. Refunds go back to the card or account you paid with, through Stripe, and usually arrive within 5 to 10 business days. When a refund is for a whole payment, that payment’s Pro time ends.`,
      ],
    },
    {
      heading: 'Payments that don’t go through',
      blocks: [
        'If a renewal fails, Stripe tries again over the following days and emails you. If it still can’t be paid, the subscription ends and your account goes back to the free plan.',
      ],
    },
    {
      heading: 'Price changes',
      blocks: [
        'Prices include tax. If we change Pro’s price, we’ll tell you at least 30 days before your next renewal; the new price applies only from then, and you can cancel before it does.',
      ],
    },
  ];
}

function community(op: LegalOperator): LegalSection[] {
  return [
    {
      heading: 'Why these rules',
      blocks: [
        'GymGO is only useful if what’s on it is true. Members’ reviews, photos and reports help everyone know what a gym is really like before they go, so they have to be honest, first-hand and safe to share. These rules are part of the [Terms of Service](terms).',
      ],
    },
    {
      heading: 'Reviews',
      blocks: [
        {
          list: [
            'Review gyms you’ve actually been to, about your own experience. Good and bad reviews are both welcome, and GymGO publishes both.',
            'No fake reviews: don’t review a gym you own, work for or are paid by, or its competitors, and don’t offer or accept anything for a review.',
            'Keep it about the gym: no personal attacks on staff or members by name, no hate, threats or harassment, and no one’s personal details.',
            'No advertising, spam or links.',
          ],
        },
      ],
    },
    {
      heading: 'Photos',
      blocks: [
        {
          list: [
            'Post only photos you took yourself, of the gym: its floor, equipment, entrance and facilities.',
            'Never take or post photos in changing rooms, toilets or showers.',
            'Don’t post anyone recognisable without their permission, and never children.',
            'Follow the gym’s own rules about photography.',
          ],
        },
      ],
    },
    {
      heading: 'Prices, visits, machines, closures and how busy it is',
      blocks: [
        'Report what you actually paid, saw or were told, recently. If you’re not sure, leave it out: “unknown” is more useful than a guess. Say how busy a gym is only while you’re there.',
      ],
    },
    {
      heading: 'Moderation',
      blocks: [
        'Reviews and photos wait for a moderator before anyone else sees them, and a moderator may decline or remove anything that breaks these rules or the law. Members who keep breaking them, or who post other people’s work, lose their account.',
        `To report something on GymGO, ${reach(op)}, saying which gym and what’s wrong. For something that’s yours and was posted without permission, use Profile → Copyright and takedowns.`,
      ],
    },
  ];
}

/** One of GymGO's legal documents, naming whoever runs it. */
export function legalDoc(id: LegalDocId, operator: LegalOperator = DEFAULT_OPERATOR): LegalDoc {
  const sections = id === 'terms' ? terms(operator) : id === 'privacy' ? privacy(operator) : id === 'refunds' ? refunds(operator) : community(operator);
  return { id, title: LEGAL_TITLES[id], summary: SUMMARIES[id], sections };
}

export function isLegalDocId(value: unknown): value is LegalDocId {
  return typeof value === 'string' && (LEGAL_DOC_IDS as readonly string[]).includes(value);
}

export type LegalPiece = { text: string } | { text: string; doc: LegalDocId } | { text: string; url: string };

/** A paragraph split into plain text and its links, in order. */
export function legalLinks(paragraph: string): LegalPiece[] {
  const pieces: LegalPiece[] = [];
  const link = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let at = 0;
  for (let match = link.exec(paragraph); match; match = link.exec(paragraph)) {
    if (match.index > at) pieces.push({ text: paragraph.slice(at, match.index) });
    const [, text, target] = match as unknown as [string, string, string];
    if (isLegalDocId(target)) pieces.push({ text, doc: target });
    else if (/^https:\/\//.test(target)) pieces.push({ text, url: target });
    else pieces.push({ text });
    at = match.index + match[0].length;
  }
  if (at < paragraph.length) pieces.push({ text: paragraph.slice(at) });
  return pieces;
}
