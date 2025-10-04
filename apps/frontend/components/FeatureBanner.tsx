import { Alert, AlertDescription } from "./ui/alert";
import { FEATURES } from "../lib/config";

interface FeatureBannerProps {
  feature: 'gocardless' | 'sumsub';
  children: React.ReactNode;
}

export function FeatureBanner({ feature, children }: FeatureBannerProps) {
  if (FEATURES[feature]) {
    return <>{children}</>;
  }

  const messages = {
    gocardless: "Payments are being set up. You can still view invoices and change plans; card setup will be available shortly.",
    sumsub: "Identity verification will be enabled after our KYC provider is connected."
  };

  return (
    <Alert className="mb-4">
      <AlertDescription>
        {messages[feature]}
      </AlertDescription>
    </Alert>
  );
}
