export function AccessDeniedPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ee] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md bg-white border border-red-200 shadow-sm rounded-2xl p-6 text-center">
        <h1 className="text-2xl font-bold text-red-700">Access Denied</h1>
        <p className="text-slate-700 mt-2">You do not have permission to access this page.</p>
      </div>
    </main>
  );
}
