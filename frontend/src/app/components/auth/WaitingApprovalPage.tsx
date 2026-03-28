export function WaitingApprovalPage() {
  return (
    <main className="min-h-screen bg-[#f6f3ee] flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl bg-white border border-amber-200 shadow-sm rounded-2xl p-6">
        <h1 className="text-2xl font-bold text-slate-900">Hospital Verification Pending</h1>
        <p className="text-slate-700 mt-3">
          Your hospital account is created, but verification is pending.
        </p>
        <p className="text-slate-600 mt-2">
          Admin must update verification_status to approved in profiles table.
        </p>
      </div>
    </main>
  );
}
