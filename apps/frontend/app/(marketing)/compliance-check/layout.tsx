import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Free Business Address Compliance Check | VirtualAddressHub",
    description:
        "Take our 3-minute quiz to see if your business address meets UK Companies House and HMRC rules under the Economic Crime Act. Instant score and recommendations.",
    openGraph: {
        title: "Free Business Address Compliance Check | VirtualAddressHub",
        description:
            "Take our 3-minute quiz to see if your business address meets UK Companies House and HMRC rules under the Economic Crime Act.",
        url: "https://virtualaddresshub.com/compliance-check",
    },
};

export default function ComplianceCheckLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}

