import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface PricingCardProps {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular?: boolean;
  cta: string;
  href: string;
}

export function PricingCard({ 
  name, 
  price, 
  period, 
  description, 
  features, 
  popular = false, 
  cta, 
  href 
}: PricingCardProps) {
  return (
    <Card className={`p-8 relative ${popular ? 'border-green-400 bg-green-400/5' : 'bg-white/5 border-white/10'}`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-green-400 text-black px-4 py-1 rounded-full text-sm font-semibold">
            Most Popular
          </span>
        </div>
      )}
      
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2">{name}</h3>
        <p className="text-gray-400 mb-4">{description}</p>
        <div className="mb-4">
          <span className="text-4xl font-bold">{price}</span>
          <span className="text-gray-400 ml-2">/{period}</span>
        </div>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center text-sm">
            <span className="text-green-400 mr-3">✓</span>
            <span className="text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>

      <Button 
        asChild 
        className={`w-full ${popular ? 'bg-green-600 hover:bg-green-700' : ''}`}
        variant={popular ? 'default' : 'outline'}
      >
        <Link href={href}>{cta}</Link>
      </Button>
    </Card>
  );
}
