import { Metadata } from "next";
import { ContactPage } from "@/components/ContactPage";

export const metadata: Metadata = {
    title: "Contact us",
    description: "Get in touch with VirtualAddressHub support.",
};

export default function Contact() {
    return <ContactPage />;
}
