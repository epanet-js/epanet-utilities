let userConfig = undefined;
try {
  userConfig = await import("./v0-user-next.config");
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  trailingSlash: false,
  rewrites: async () => {
    return [
      {
        source: "/model-builder",
        destination: "https://model-build-web-app.vercel.app/model-builder",
      },
      {
        source: "/model-builder/:path*",
        destination:
          "https://model-build-web-app.vercel.app/model-builder/:path*",
      },
      {
        source: "/fire-flow",
        destination: "https://spike-fireflow-poc.vercel.app/",
      },
      {
        source: "/fire-flow/:path*",
        destination: "https://spike-fireflow-poc.vercel.app/fire-flow/:path*",
      },
    ];
  },
  redirects: [
    {
      source: "/model-builder/",
      destination: "/model-builder",
      permanent: false,
    },
    {
      source: "/fire-flow/",
      destination: "/fire-flow",
      permanent: false,
    },
  ],
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
};

mergeConfig(nextConfig, userConfig);

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return;
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === "object" &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      };
    } else {
      nextConfig[key] = userConfig[key];
    }
  }
}

export default nextConfig;
