import { Clock } from "lucide-react";
import { StatusPill } from "@/components/ui/StatusPill";
import { getSlaLabel } from "@/lib/sla";

type Props = { className?: string; hint?: boolean };

export function SupportSla({ className = "", hint = true }: Props) {
    return (
        <div className={`flex flex-col items-start gap-2 ${className}`}>
            <StatusPill icon={<Clock className="h-3.5 w-3.5" />}>
                {getSlaLabel()}
            </StatusPill>
            {hint && (
                <p className="text-xs text-black/60">
                    Need help sooner? Visit the Help Centre articles below or email{" "}
                    <a className="underline hover:opacity-80" href="mailto:support@virtualaddresshub.co.uk">
                        support@virtualaddresshub.co.uk
                    </a>.
                </p>
            )}
        </div>
    );
}
