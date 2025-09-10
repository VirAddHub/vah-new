import { Card } from '@/components/ui/card';

export default function AboutPage() {
  return (
    <div className="py-20">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-6">About Virtual Address Hub</h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            We're revolutionizing how people and businesses handle their mail in the digital age.
          </p>
        </div>

        <div className="prose prose-invert max-w-none">
          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-gray-300 text-lg leading-relaxed mb-4">
                We believe that physical mail shouldn't limit your digital lifestyle. Our mission is to provide 
                secure, efficient, and accessible mail management solutions that work seamlessly with modern 
                business and personal needs.
              </p>
              <p className="text-gray-300 text-lg leading-relaxed">
                Whether you're a digital nomad, a growing business, or someone who values convenience and security, 
                Virtual Address Hub is designed to make your life easier.
              </p>
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-6">Why We Started</h2>
              <p className="text-gray-300 text-lg leading-relaxed mb-4">
                Founded in 2024, Virtual Address Hub was born from the frustration of missing important mail 
                while traveling or working remotely. We saw the need for a reliable, secure way to manage 
                physical mail in our increasingly digital world.
              </p>
              <p className="text-gray-300 text-lg leading-relaxed">
                Our team combines expertise in security, logistics, and technology to deliver a service 
                that's both powerful and easy to use.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="p-6 bg-white/5 border-white/10 text-center">
              <div className="text-green-400 text-4xl mb-4">🔒</div>
              <h3 className="text-xl font-semibold mb-3">Security First</h3>
              <p className="text-gray-400">
                Bank-level encryption and secure facilities ensure your mail and data are always protected.
              </p>
            </Card>

            <Card className="p-6 bg-white/5 border-white/10 text-center">
              <div className="text-green-400 text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-3">Fast & Reliable</h3>
              <p className="text-gray-400">
                Quick scanning and processing means you get your mail faster than traditional postal services.
              </p>
            </Card>

            <Card className="p-6 bg-white/5 border-white/10 text-center">
              <div className="text-green-400 text-4xl mb-4">🌍</div>
              <h3 className="text-xl font-semibold mb-3">Global Access</h3>
              <p className="text-gray-400">
                Access your mail from anywhere in the world with our secure web platform and mobile apps.
              </p>
            </Card>
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-xl text-gray-300 mb-8">
              Join thousands of satisfied customers who trust Virtual Address Hub with their mail.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/(auth)/signup" 
                className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
              >
                Start Your Free Trial
              </a>
              <a 
                href="/support" 
                className="px-8 py-3 border border-white/20 hover:bg-white/10 text-white rounded-lg font-semibold transition-colors"
              >
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
