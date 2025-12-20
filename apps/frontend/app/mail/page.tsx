import dynamic from "next/dynamic";

// Mail page - shows mail management view
// Uses the same dashboard client but could be customized for mail-only view
export default dynamic(() => import("../dashboard/DashboardClient"), { ssr: false });

