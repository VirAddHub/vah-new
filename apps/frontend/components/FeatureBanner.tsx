import { Alert, AlertDescription } from "./ui/alert";
import { FEATURES } from "../lib/config";

interface FeatureBannerProps {
  feature: 'sumsub';
  children: React.ReactNode;
}

export function FeatureBanner({ feature, children }: FeatureBannerProps) {
  if (FEATURES[feature]) {
    return <>{children}</>;
  }

  const messages = {
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
