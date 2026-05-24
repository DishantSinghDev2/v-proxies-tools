declare module 'cloudflare:sockets' {
  export interface Socket {
    readable: ReadableStream<Uint8Array>
    writable: WritableStream<Uint8Array>
    close(): void
    closed: Promise<void>
    opened: Promise<{ remoteAddress?: string; localAddress?: string }>
  }
  export interface SocketAddress {
    hostname: string
    port: number
  }
  export interface SocketOptions {
    secureTransport?: 'off' | 'on' | 'starttls'
    allowHalfOpen?: boolean
  }
  export function connect(address: SocketAddress, options?: SocketOptions): Socket
}
