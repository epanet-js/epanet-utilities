"use client";
import { LogoIconAndWordmarkIcon } from "@/components/app-header";
import { useState } from "react";

export function Footer() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const apiKey = "ziRMXOpWNfww8zDIv0IYmA";
    const formId = "7704375";

    const data = {
      api_key: apiKey,
      email: email,
    };

    try {
      const response = await fetch(
        `https://api.convertkit.com/v3/forms/${formId}/subscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        },
      );

      if (response.ok) {
        setMessage({
          text: "Success! Please check your email to confirm your subscription.",
          type: "success",
        });
        setEmail(""); // Clear the form
      } else {
        const errorData = await response.json();
        setMessage({
          text: `An error occurred: ${
            errorData.message || "Please try again later."
          }`,
          type: "error",
        });
      }
    } catch (error) {
      setMessage({
        text: "An error occurred. Please try again later.",
        type: "error",
      });
      console.error("Error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
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
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-10 rounded-md border px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm w-full bg-gray-800 border-gray-700 text-white placeholder:text-gray-400 focus:border-blue-500"
                  required
                  disabled={isSubmitting}
                />
                <button
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Subscribing..." : "Subscribe"}
                </button>
              </form>

              {/* Success/Error Message */}
              {message && (
                <div
                  className={`text-sm p-3 rounded-md ${
                    message.type === "success"
                      ? "bg-green-900/20 border border-green-500/30 text-green-300"
                      : "bg-red-900/20 border border-red-500/30 text-red-300"
                  }`}
                >
                  {message.text}
                </div>
              )}
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
