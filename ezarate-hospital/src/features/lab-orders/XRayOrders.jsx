// "X-Ray Orders" tab — scoped to X-Ray + Ultrasound & Imaging tests only
// (X-ray Tech's specialty). Mirrors LabOrders.jsx exactly, just with a
// different `formTypes` scope — see OrdersListView.jsx for the shared
// implementation both pages are built on.
import { Activity } from "lucide-react";
import OrdersListView from "./OrdersListView";

export default function XRayOrders() {
  return (
    <OrdersListView
      formTypes={["X-Ray", "Ultrasound & Imaging"]}
      title="X-Ray Orders"
      subtitle="Manage your X-Ray and imaging orders and results"
      emptyMessage="X-Ray orders you create will show up here."
      csvFilename="xray-orders.csv"
      icon={Activity}
    />
  );
}
