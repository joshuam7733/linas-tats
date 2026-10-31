/**
 * Studio details shown on the site. Values come from the studio's public Instagram profile
 * (@linustats_tattoo_studio), confirmed by the owner. Anything left empty is hidden on the live page.
 * The NEXT_PUBLIC_* variables in `.env.local` (see `.env.example`) override these defaults.
 */
export interface Phone {
  display: string;
  /** International format for tel: links. */
  tel: string;
}

export interface SiteConfig {
  name: string;
  /** Shown under the wordmark and in the footer. */
  fullName: string;
  tagline: string;
  location: string;
  intro: string;
  contact: {
    phones: Phone[];
    /** Number that receives "Book an appointment" requests on WhatsApp. */
    whatsapp?: Phone;
    instagram?: string; // handle without the @
    address?: string;
    email?: string;
    hours?: string;
  };
  /** External booking page. Leave empty to keep booking on phone and Instagram. */
  bookingUrl?: string;
  classes: {
    levels: string[];
    phone?: Phone;
  };
}

const clean = (value: string | undefined) => (value && value.trim() ? value.trim() : undefined);

const ugPhone = (display: string): Phone => ({ display, tel: `+256${display.replace(/\D/g, '').replace(/^0/, '')}` });

const envPhones = clean(process.env.NEXT_PUBLIC_CONTACT_PHONES)
  ?.split(',')
  .map((p) => ugPhone(p.trim()))
  .filter((p) => p.display);

export const site: SiteConfig = {
  name: 'Linus Tats',
  fullName: 'LinusTats Tattoo Studio',
  tagline: 'Your story. Before the ink.',
  location: 'Bukoto, Kampala',
  intro:
    'LinusTats is a tattoo studio on Bukoto Street for bold blackwork, clean fine lines and black-and-grey realism. Bring the idea, the memory or the feeling, and see it on the body before it becomes ink.',
  contact: {
    phones: envPhones ?? [ugPhone('0755 817178'), ugPhone('0777 017284')],
    whatsapp: ugPhone(clean(process.env.NEXT_PUBLIC_WHATSAPP) ?? '0755 817178'),
    instagram: clean(process.env.NEXT_PUBLIC_INSTAGRAM)?.replace(/^@/, '') ?? 'linustats_tattoo_studio',
    address: clean(process.env.NEXT_PUBLIC_STUDIO_ADDRESS) ?? 'Acacia Plot 1, Bukoto Street, Kampala',
    email: clean(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
    hours: clean(process.env.NEXT_PUBLIC_STUDIO_HOURS),
  },
  bookingUrl: clean(process.env.NEXT_PUBLIC_BOOKING_URL),
  classes: {
    levels: ['Beginner', 'Intermediate', 'Pro'],
    phone: ugPhone('0777 017284'),
  },
};

export const instagramUrl = site.contact.instagram ? `https://www.instagram.com/${site.contact.instagram}` : undefined;

/** A wa.me link that opens WhatsApp with `text` already typed to the studio. */
export const whatsappUrl = (text: string) =>
  site.contact.whatsapp ? `https://wa.me/${site.contact.whatsapp.tel.replace(/\D/g, '')}?text=${encodeURIComponent(text)}` : undefined;

export const mapsUrl = site.contact.address
  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.contact.address}, Uganda`)}`
  : undefined;
