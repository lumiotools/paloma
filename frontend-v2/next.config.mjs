let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
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
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
  webpack: (config, { isServer, dev }) => {
    // Only apply in development mode
    if (dev && !isServer) {
      // Ensure HMR is enabled
      config.devServer = {
        hot: true,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        // Force WebSockets to use HTTP protocol for compatibility
        webSocketServer: {
          type: 'ws',
          options: {
            path: '/_next/webpack-hmr',
          },
        }
      }
    }
    
    // If userConfig has webpack configuration, run it after this one
    if (userConfig && userConfig.webpack) {
      config = userConfig.webpack(config, { isServer, dev })
    }
    
    return config
  }
}

mergeConfig(nextConfig, userConfig)

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      }
    } else {
      nextConfig[key] = userConfig[key]
    }
  }
}

export default nextConfig
