import Image from "next/image"
import type { PublicSitePartner } from "@/lib/db/schema"

type PartnerShowcaseProps = {
  visible: boolean
  marquee: boolean
  partners: readonly PublicSitePartner[]
}

export function PartnerShowcase({ visible, marquee, partners }: PartnerShowcaseProps) {
  if (!visible || partners.length === 0) return null

  return (
    <section
      aria-labelledby="partner-showcase-heading"
      className="border-y bg-secondary/40 px-6 py-10 sm:py-12"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <h2
          id="partner-showcase-heading"
          className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
        >
          Our partners
        </h2>

        {marquee ? (
          <div className="partner-marquee overflow-hidden" role="region" aria-label="Partner organizations">
            <div className="partner-marquee-track">
              <ul className="partner-marquee-group" aria-label="Partners">
                {partners.map((partner) => (
                  <PartnerItem key={partner.id} partner={partner} />
                ))}
              </ul>
              <ul className="partner-marquee-group" aria-hidden="true">
                {partners.map((partner) => (
                  <PartnerItem key={`${partner.id}-duplicate`} partner={partner} decorative />
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <ul className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
            {partners.map((partner) => (
              <PartnerItem key={partner.id} partner={partner} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function PartnerItem({ partner, decorative = false }: { partner: PublicSitePartner; decorative?: boolean }) {
  const content = (
    <span className="flex min-h-14 items-center justify-center gap-3 px-3 py-2">
      {partner.logoUrl ? (
        <Image
          src={partner.logoUrl}
          alt=""
          width={180}
          height={64}
          unoptimized
          className="h-10 w-auto max-w-40 object-contain"
        />
      ) : null}
      <span className="text-base font-semibold tracking-tight text-foreground">{partner.name}</span>
    </span>
  )

  return (
    <li className="shrink-0" aria-hidden={decorative || undefined}>
      {!decorative && partner.linkActive && partner.destinationUrl ? (
        <a
          href={partner.destinationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-md transition-opacity hover:opacity-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {content}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <span>{content}</span>
      )}
    </li>
  )
}

export type { PartnerShowcaseProps }
