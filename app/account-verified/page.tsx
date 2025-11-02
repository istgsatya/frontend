export default function AccountVerified() {
  return (
    <div className="container py-10 max-w-lg">
      <div className="rounded border p-6 text-center">
        <h1 className="text-2xl font-semibold mb-2">Account Verified!</h1>
        <p className="text-gray-600 mb-6">You can now log in to Transparent Cents.</p>
        <a href="/login" className="inline-block px-4 py-2 rounded bg-brand-600 text-white hover:bg-brand-700">Proceed to Login</a>
      </div>
    </div>
  )
}
