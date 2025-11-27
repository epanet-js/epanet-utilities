import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_18%_-40%,rgba(147,197,253,0.3),transparent_47%),radial-gradient(circle_at_80%_-41%,rgba(216,180,254,0.35),transparent_54%)]"></div>
      <div className="text-center p-8 max-w-md">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-slate-100 mb-4">
            <span className="text-5xl font-bold text-slate-400">
              404
            </span>
          </div>
        </div>
        <h2 className="text-2xl font-semibold text-slate-800 mb-4">
          Page Not Found
        </h2>
        <p className="text-slate-600 mb-8">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 text-white hover:bg-primary/90 h-11 rounded-md px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <Home className="h-4 w-4 mr-2" />
          Return Home
        </Link>
      </div>
    </main>
  );
}
