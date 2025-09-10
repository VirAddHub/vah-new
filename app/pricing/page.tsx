import { PricingCard } from '@/components/PricingCard';
import { Card } from '@/components/ui/card';

export default function PricingPage() {
  return (
    <div className="py-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">Pricing</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Simple, transparent pricing with no hidden fees. Choose the plan that works for you.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20">
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

        {/* Features Comparison */}
        <div className="mt-20">
          <h2 className="text-3xl font-bold text-center mb-12">Compare Features</h2>
          
          <Card className="p-8 bg-white/5 border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 px-4">Feature</th>
                    <th className="text-center py-4 px-4">Starter</th>
                    <th className="text-center py-4 px-4">Professional</th>
                    <th className="text-center py-4 px-4">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-b border-white/5">
                    <td className="py-4 px-4">UK Addresses</td>
                    <td className="text-center py-4 px-4">1</td>
                    <td className="text-center py-4 px-4">1</td>
                    <td className="text-center py-4 px-4">Multiple</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-4 px-4">Mail Items/Month</td>
                    <td className="text-center py-4 px-4">10</td>
                    <td className="text-center py-4 px-4">50</td>
                    <td className="text-center py-4 px-4">Unlimited</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-4 px-4">Scanning Speed</td>
                    <td className="text-center py-4 px-4">24 hours</td>
                    <td className="text-center py-4 px-4">Same day</td>
                    <td className="text-center py-4 px-4">Instant</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-4 px-4">API Access</td>
                    <td className="text-center py-4 px-4">❌</td>
                    <td className="text-center py-4 px-4">✅</td>
                    <td className="text-center py-4 px-4">✅ Full</td>
                  </tr>
                  <tr className="border-b border-white/5">
                    <td className="py-4 px-4">Support</td>
                    <td className="text-center py-4 px-4">Basic</td>
                    <td className="text-center py-4 px-4">Priority</td>
                    <td className="text-center py-4 px-4">Dedicated</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
