import Link from 'next/link';
import e from './ResourceEditorial.module.css';
import m from './Marketing.module.css';
import s from './PurchaseJourney.module.css';
export function HowItWorks() {
  return (
    <div className={`${m.site} ${s.page}`}>
      <section className={m.hero}>
        <div className={`${m.wrap} ${m.split}`}>
          <div>
            <p className={m.kicker}>HOW IT WORKS</p>
            <h1>
              Your London business address.
              <br />
              Simpler than you think.
            </h1>
            <p className={m.lead}>
              Set up your business presence. Keep your home address private. Take care of your
              correspondence online.
            </p>
            <div className={m.actions}>
              <Link href="/pricing" className={m.button}>
                Explore subscriptions <span aria-hidden>↗</span>
              </Link>
            </div>
            <p className={m.note}>Four stages, from choosing your plan to reading your post.</p>
          </div>
          <div className={e.journey}>
            <p>YOUR BUSINESS ADDRESS / THE JOURNEY</p>
            <ol>
              <li>
                <span>01</span>
                <div>
                  <strong>Choose your subscription</strong>
                  <small>Monthly or annual billing</small>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Complete setup</strong>
                  <small>Payment, required checks and approval</small>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Receive your address</strong>
                  <small>Full details in your approved account</small>
                </div>
              </li>
              <li>
                <span>04</span>
                <div>
                  <strong>Open your business post</strong>
                  <small>View and download available scans</small>
                </div>
              </li>
            </ol>
            <p className={e.journeyEnd}>From first step to first letter.</p>
          </div>
        </div>
      </section>
      <nav className={s.stageNav} aria-label="Your setup journey">
        <div className={m.wrap}>
          <a href="#choose">
            01 <span>Choose</span>
          </a>
          <a href="#setup">
            02 <span>Set up</span>
          </a>
          <a href="#address">
            03 <span>Get your address</span>
          </a>
          <a href="#post">
            04 <span>Read your post</span>
          </a>
        </div>
      </nav>
      <section id="choose" className={s.stage}>
        <div className={`${m.wrap} ${s.stageGrid}`}>
          <div>
            <p className={m.kicker}>01 / CHOOSE YOUR SUBSCRIPTION</p>
            <h2>
              Your business.
              <br />
              Your billing rhythm.
            </h2>
            <p className={m.lead}>
              One service, with monthly or annual billing. Choose the option that suits your
              business, then create your account.
            </p>
            <p>
              Your London business address and digital mail management come together. You do not
              need to purchase separate address packages.
            </p>
            <Link href="/pricing" className={m.textlink}>
              Compare current prices →
            </Link>
          </div>
          <figure className={s.billingVisual}>
            <figcaption>ONE SERVICE. TWO WAYS TO PAY.</figcaption>
            <div>
              <span>Monthly</span>
              <small>Billed each month</small>
            </div>
            <div>
              <span>Annual</span>
              <small>Billed once a year</small>
            </div>
            <p>
              Same core address services.
              <br />
              Same digital mail management.
            </p>
          </figure>
        </div>
      </section>
      <section id="setup" className={`${s.stage} ${s.sage}`}>
        <div className={`${m.wrap} ${s.stageGrid} ${s.reverse}`}>
          <div>
            <p className={m.kicker}>02 / COMPLETE YOUR SECURE SETUP</p>
            <h2>
              A few details.
              <br />A proper introduction.
            </h2>
            <p className={m.lead}>
              Complete payment and the required identity and business checks. We need to know who
              will be using the address.
            </p>
            <p>
              Follow the instructions in your account and provide the requested information. Further
              information may be needed before approval; payment alone does not activate address
              use.
            </p>
          </div>
          <figure className={s.setupVisual}>
            <figcaption>YOUR SETUP JOURNEY · ILLUSTRATION</figcaption>
            <ol>
              <li>
                <span>01</span>
                <div>
                  <strong>Complete payment</strong>
                  <small>Your chosen billing option</small>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Verify your details</strong>
                  <small>Identity & required business information</small>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Receive account approval</strong>
                  <small>Address access follows approval</small>
                </div>
              </li>
            </ol>
          </figure>
        </div>
      </section>
      <section id="address" className={s.stage}>
        <div className={`${m.wrap} ${s.stageGrid}`}>
          <div>
            <p className={m.kicker}>03 / YOUR LONDON ADDRESS IS READY</p>
            <h2>
              A new home for
              <br />
              your business correspondence.
            </h2>
            <p className={m.lead}>
              Once all requirements are complete and your account is approved, find your full
              business address in your dashboard.
            </p>
            <p>
              Use it for permitted business correspondence and eligible registered office or
              director’s service address filings. You remain responsible for making any required
              company filings.
            </p>
          </div>
          <figure className={s.addressVisual}>
            <div className={s.addressPaper}>
              <p className={m.kicker}>YOUR BUSINESS, IN LONDON</p>
              <p className={s.company}>Your Company Ltd</p>
              <p>
                Tower Bridge
                <br />
                London SE1
              </p>
              <div className={s.addressRule} />
              <small>Full address provided after account approval.</small>
            </div>
            <figcaption>Example address presentation · No restricted location details</figcaption>
          </figure>
        </div>
      </section>
      <section id="post" className={`${s.stage} ${s.postStage}`}>
        <div className={`${m.wrap} ${s.stageGrid}`}>
          <div>
            <p className={m.kicker}>04 / YOUR BUSINESS POST, ONLINE</p>
            <h2>
              London receives it.
              <br />
              You read it.
            </h2>
            <p className={m.lead}>
              Eligible correspondence arrives for your business. Open your dashboard to view and
              download available digital scans.
            </p>
            <p>
              Keep your post close, even when work takes you elsewhere. Access depends on your
              active subscription, account standing and required checks.
            </p>
            <p className={s.originals}>
              Need an original letter?{' '}
              <Link href="/services#forwarding">See forwarding conditions</Link>.
            </p>
          </div>
          <figure className={s.mailVisual}>
            <figcaption>ILLUSTRATIVE MAIL VIEW · FICTIONAL DATA</figcaption>
            <div className={s.mailHeader}>
              <strong>Your mail</strong>
              <span>Available scan</span>
            </div>
            <div className={s.mailRow}>
              <div>
                <strong>Example business letter</strong>
                <p>Your Company Ltd</p>
              </div>
              <span>PDF</span>
            </div>
            <div className={s.document}>
              <span>BUSINESS CORRESPONDENCE</span>
              <div />
              <div />
              <div />
              <div />
            </div>
            <div className={s.mailActions}>
              <span>View scan ↗</span>
              <span>Download PDF ↓</span>
            </div>
            <p className="sr-only">An example of viewing and downloading a scan. The buttons are a picture, not controls.</p>
          </figure>
        </div>
      </section>
      <section className={s.closing}>
        <div className={m.wrap}>
          <p className={m.kicker}>READY FOR YOUR NEXT CHAPTER?</p>
          <h2>
            A London presence.
            <br />
            Less post to think about.
          </h2>
          <p>Choose your billing option and start setting up your business address.</p>
          <Link href="/pricing" className={m.button}>
            Find your subscription <span aria-hidden>↗</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
