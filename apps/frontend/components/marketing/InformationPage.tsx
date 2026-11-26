import Link from 'next/link';
import s from './Marketing.module.css';
export function InformationPage({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <div className={s.site}>
      <section className={s.hero}>
        <div className={`${s.wrap} ${s.guide}`}>
          <p className={s.kicker}>{kicker}</p>
          <h1>{title}</h1>
        </div>
      </section>
      <section className={s.section}>
        <div className={`${s.wrap} ${s.guide}`}>
          {children}
          <div className={s.actions}>
            <Link href="/pricing" className={s.button}>
              Explore plans →
            </Link>
            <Link href="/contact" className={s.textlink}>
              Ask our team
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
