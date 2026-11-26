import Link from 'next/link';
import styles from './LondonShowcase.module.css';

/** Original, deliberately non-geographic London illustration. No service-location data. */
function LondonPanorama() {
  return (
    <svg viewBox="0 0 660 420" className={styles.panorama} aria-hidden="true" focusable="false">
      <circle cx="490" cy="100" r="67" fill="#d9b76f" />
      <path d="M20 310C120 275 200 340 320 308S510 282 640 315V420H20Z" fill="#c2d3bc" />
      <g stroke="#315b47" strokeWidth="2" strokeLinejoin="round" fill="#eaf0df">
        <path d="M55 294V215h56v79M67 215v-18h32v18M77 197v-22h12v22" />
        <path d="M120 298V245h58v53M133 245v-25h31v25" />
        <path d="M194 300V155h42v145M201 155v-33h28v33M207 122v-25h16v25M215 97V69" />
        <circle cx="215" cy="175" r="14" fill="#f8f5ed" />
        <path d="M215 165v10l8 4M204 203h22M204 220h22M204 237h22" fill="none" />
        <path d="M252 300v-70h98v70M265 230c0-52 72-52 72 0M284 191v-13h34v13M301 178v-20" />
        <path d="M374 300V154L407 87l22 213Z" fill="#a9c5ad" />
        <path d="m407 87-8 213M381 170l32-13M378 210l39-12M375 250l46-12" fill="none" />
        <path d="M450 300v-60h52v60M462 240v-13h29v13" />
        <circle cx="558" cy="222" r="57" fill="none" />
        <circle cx="558" cy="222" r="5" fill="#315b47" />
        {[0, 45, 90, 135].map((a) => (
          <path key={a} d="M558 165v114" transform={`rotate(${a} 558 222)`} fill="none" />
        ))}
        <path d="m558 222-26 83m26-83 26 83M35 310h590" fill="none" />
      </g>
      <path
        d="M22 338c130-20 235 22 361-2s180-10 248-2M65 358c180-12 250 15 375-1"
        fill="none"
        stroke="#73947b"
        strokeWidth="2"
      />
      <path
        d="M89 90q12-12 24 0 12-12 24 0M303 62q9-9 18 0 9-9 18 0"
        stroke="#315b47"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}

export function LondonShowcase({ standalone = false }: { standalone?: boolean }) {
  const Heading = standalone ? 'h1' : 'h2';
  return (
    <section
      className={styles.showcase}
      aria-labelledby={standalone ? 'london-page-title' : 'london-showcase-title'}
    >
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>A London presence. A world of possibility.</p>
          <Heading
            id={standalone ? 'london-page-title' : 'london-showcase-title'}
            className={styles.heading}
          >
            Give your business a home <em>in the heart of London.</em>
          </Heading>
          <p className={styles.lead}>
            A professional Central London business address, without the expense of renting an
            office. Keep business correspondence separate from home and manage your post online,
            wherever business takes you.
          </p>
          <div className={styles.benefits}>
            <p>
              <span>01</span>Registered office for eligible companies
            </p>
            <p>
              <span>02</span>Director’s service & business correspondence address
            </p>
            <p>
              <span>03</span>Digital mail management. One subscription.
            </p>
          </div>
          <div className={styles.actions}>
            <Link href="/signup" className={styles.cta}>
              Get your London address <span aria-hidden="true">↗</span>
            </Link>
            <Link href={standalone ? '/pricing' : '/london-address'} className={styles.secondary}>
              {standalone ? 'Explore plans' : 'Explore our London service'} →
            </Link>
          </div>
          <p className={styles.disclosure}>
            Your complete address is provided after successful payment, required verification and
            account approval.
          </p>
        </div>
        <figure className={styles.art}>
          <div className={styles.artLabel}>
            <span>VIRTUALADDRESSHUB</span>
            <span>LONDON / UK</span>
          </div>
          <LondonPanorama />
          <div className={styles.envelope} aria-hidden="true">
            <div className={styles.flap} />
          </div>
          <div className={styles.addressCard}>
            <div className={styles.cardTop}>
              <span>YOUR NEXT CHAPTER</span>
              <span className={styles.stamp} aria-hidden="true">
                LONDON
                <br />
                POST
              </span>
            </div>
            <p className={styles.company}>Your Company Ltd</p>
            <p className={styles.address}>
              Central London
              <br />
              United Kingdom
            </p>
            <div className={styles.cardBottom}>
              A professional address. A more flexible way to work.
            </div>
          </div>
          <figcaption className={styles.caption}>
            An illustration of London. An example of your business presence.
          </figcaption>
        </figure>
      </div>
      <div className={styles.footer}>
        <span>CENTRAL LONDON VIRTUAL OFFICE</span>
        <span>Work from anywhere. Correspond from London.</span>
      </div>
    </section>
  );
}
