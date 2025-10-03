import dynamic from "next/dynamic";

export default dynamic(() => import("./DashboardClient"), { ssr: false });
