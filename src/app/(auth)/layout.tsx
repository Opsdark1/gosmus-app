export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6 bg-gradient-to-br from-background via-accent to-muted">
      {children}
    </div>
  );
}
