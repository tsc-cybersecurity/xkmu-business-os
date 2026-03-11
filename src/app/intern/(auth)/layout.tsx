export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="dark relative flex min-h-screen bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden bg-[--brand-600,oklch(0.55_0.20_260)]">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-[--brand-700,oklch(0.49_0.19_260)] via-[--brand-600,oklch(0.55_0.20_260)] to-[--brand-gradient-to,oklch(0.55_0.20_293)] opacity-90" />
        <div className="relative z-10 px-12 text-white max-w-lg">
          <h1 className="text-4xl font-bold tracking-tight">
            xKMU Business OS
          </h1>
          <p className="mt-4 text-lg text-white/80 leading-relaxed">
            Ihr professionelles Business Operating System — CRM, Marketing, Finanzen und KI-Automatisierung in einer Plattform.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-6 text-sm text-white/70">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-xs">1</div>
              <span>CRM & Kontaktmanagement</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-xs">2</div>
              <span>Rechnungen & Angebote</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-xs">3</div>
              <span>KI-gestützte Recherche</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-0.5 h-5 w-5 rounded-full bg-white/20 flex items-center justify-center text-xs">4</div>
              <span>Marketing-Automation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden text-center">
            <h2 className="text-2xl font-bold text-primary">xKMU Business OS</h2>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
