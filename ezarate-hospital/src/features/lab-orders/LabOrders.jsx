// "Lab Orders" tab — scoped to Laboratory-department tests only (Med
// Tech's specialty). See OrdersListView.jsx for the shared implementation;
// X-Ray Orders (features/lab-orders/XRayOrders.jsx) is the same view
// scoped to X-Ray/Ultrasound & Imaging tests instead.
import { FlaskConical } from "lucide-react";
import OrdersListView from "./OrdersListView";

export default function LabOrders() {
  return (
    <OrdersListView
      formTypes={["Laboratory"]}
      title="Lab Orders"
      subtitle="Manage your lab orders and results"
      emptyMessage="Lab orders you create will show up here."
      csvFilename="lab-orders.csv"
      icon={FlaskConical}
    />
  );
}
