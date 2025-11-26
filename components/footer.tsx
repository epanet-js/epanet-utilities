import { LogoIconAndWordmarkIcon } from "@/components/app-header";

export function Footer() {
  return (
    <footer className="w-full bg-gray-950 text-primary-foreground">
      <div className="container max-w-5xl px-4 md:px-6">
        <div className="py-12 sm:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4 space-y-6 lg:pr-12">
            <a href="/" className="block">
              <LogoIconAndWordmarkIcon negative={true} size={140} />
            </a>
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tighter text-white">
                  Stay in the loop
                </h3>
                <p className="text-sm text-gray-300">
                  Subscribe to our newsletter to receive updates, tips, and news
                  about epanet-js and water network modeling.
                </p>
              </div>
              <form className="flex flex-col gap-3">
                <input
                  className="flex h-10 rounded-md border px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm w-full bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 focus:border-blue-500"
                  placeholder="Enter your email"
                  type="email"
                />
                <button
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                >
                  Subscribe
                </button>
              </form>
              <p className="text-xs text-gray-400">
                We respect your privacy. Unsubscribe at any time.
              </p>
            </div>
          </div>
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-8 lg:pl-12">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Product</h3>
              <nav className="flex flex-col space-y-3">
                <a
                  href="#features"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Features
                </a>
                <a
                  href="#pricing"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Pricing
                </a>
                <a
                  href="#faq"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  FAQ
                </a>
              </nav>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Community</h3>
              <nav className="flex flex-col space-y-3">
                <a
                  href="https://help.epanetjs.com"
                  target="_blank"
                  rel="noopener"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Help Center
                </a>
                <a
                  href="https://roadmap.epanetjs.com"
                  target="_blank"
                  rel="noopener"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Roadmap
                </a>
                <a
                  href="https://github.com/epanet-js/epanet-js"
                  rel="noopener"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  GitHub
                </a>
                <a
                  href="https://epanetjs.com/blog/"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Blog
                </a>
              </nav>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Company</h3>
              <nav className="flex flex-col space-y-3">
                <a
                  href="#why-we-built-epanet-js"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  About
                </a>
                <a
                  href="mailto:support@epanetjs.com"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Contact Us
                </a>
                <a
                  href="https://epanetjs.com/terms-conditions/"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Terms &amp; Conditions
                </a>
                <a
                  href="https://epanetjs.com/privacy-policy/"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Privacy Policy
                </a>
                <a
                  href="https://epanetjs.com/cookies-policy/"
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  Cookies Policy
                </a>
              </nav>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-700 py-6">
          <p className="text-sm text-gray-400 text-right">
            © 2025 Iterating Inc. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
