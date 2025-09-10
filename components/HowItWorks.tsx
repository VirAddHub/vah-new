import { Card } from '@/components/ui/card';

export function HowItWorks() {
  const steps = [
    {
      number: "01",
      title: "Get Your Address",
      description: "Sign up and receive your professional UK address instantly. Perfect for individuals and businesses.",
      icon: "🏠"
    },
    {
      number: "02", 
      title: "Mail Arrives",
      description: "We receive your mail at our secure facility and scan it within 24 hours of arrival.",
      icon: "📬"
    },
    {
      number: "03",
      title: "Digital Access",
      description: "View, download, or forward your mail digitally. Get instant notifications when new mail arrives.",
      icon: "📱"
    },
    {
      number: "04",
      title: "Manage & Archive",
      description: "Organize your documents, set up forwarding rules, and maintain digital records for compliance.",
      icon: "📁"
    }
  ];

  return (
    <section className="py-20 bg-white/5">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Simple, secure, and efficient. Get your digital mailroom up and running in minutes.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <Card key={index} className="p-6 text-center bg-white/5 border-white/10">
              <div className="text-4xl mb-4">{step.icon}</div>
              <div className="text-green-400 text-sm font-mono mb-2">{step.number}</div>
              <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
              <p className="text-gray-400 text-sm">{step.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
