import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/Footer";

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
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
        </div>
    );
}

