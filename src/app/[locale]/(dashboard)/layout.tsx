export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* TODO: Add sidebar and header components */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
