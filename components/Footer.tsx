import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-12">
      <div className="container">
        <div className="glass rounded-2xl p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <div className="font-semibold text-slate-900 mb-2">Transparent Cents</div>
              <p className="text-sm subtle">Transparency-first giving, powered by blockchain.</p>
            </div>
            <div>
              <div className="font-medium text-slate-900 mb-2">Company</div>
              <ul className="space-y-1 text-sm">
                <li><Link className="hover:text-brand-700" href="/about">About</Link></li>
                <li><Link className="hover:text-brand-700" href="/contact">Contact</Link></li>
              </ul>
            </div>
            <div>
              <div className="font-medium text-slate-900 mb-2">Legal</div>
              <ul className="space-y-1 text-sm">
                <li><Link className="hover:text-brand-700" href="/privacy">Privacy Policy</Link></li>
                <li><a className="hover:text-brand-700" href="#">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-6 border-t border-white/30 pt-4 flex items-center justify-between text-xs subtle">
            <span>© {new Date().getFullYear()} Transparent Cents</span>
            <span>Built for transparency</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
