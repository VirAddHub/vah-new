import { Hero } from '@/components/Hero';
import { HowItWorks } from '@/components/HowItWorks';
import { PricingCard } from '@/components/PricingCard';
import { Footer } from '@/components/Footer';

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      
      {/* Pricing Section */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Choose the plan that fits your needs. No hidden fees, no surprises.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Starter"
              price="£9.99"
              period="month"
              description="Perfect for individuals"
              features={[
                "1 UK address",
                "Up to 10 mail items/month",
                "Digital scanning",
                "Email notifications",
                "Basic support"
              ]}
              cta="Start Free Trial"
              href="/(auth)/signup"
            />
            
            <PricingCard
              name="Professional"
              price="£19.99"
              period="month"
              description="Most popular for businesses"
              features={[
                "1 UK address",
                "Up to 50 mail items/month",
                "Priority scanning",
                "Advanced forwarding rules",
                "Priority support",
                "API access"
              ]}
              popular={true}
              cta="Start Free Trial"
              href="/(auth)/signup"
            />
            
            <PricingCard
              name="Enterprise"
              price="£49.99"
              period="month"
              description="For high-volume users"
              features={[
                "Multiple addresses",
                "Unlimited mail items",
                "Instant scanning",
                "Custom forwarding rules",
                "Dedicated support",
                "Full API access",
                "Compliance reporting"
              ]}
              cta="Contact Sales"
              href="/support"
            />
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
