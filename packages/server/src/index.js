import Fastify from 'fastify'
import fastifyWebsocket from '@fastify/websocket'

const fastify = Fastify({ logger: true })

await fastify.register(fastifyWebsocket)

fastify.get('/stream', { websocket: true }, (socket) => {
  let tick = 0

  const interval = setInterval(() => {
    if (socket.readyState !== socket.OPEN) {
      clearInterval(interval)
      return
    }
    socket.send(JSON.stringify({ tick, timestamp: Date.now() }))
    tick++
  }, 1000)

  socket.on('close', () => clearInterval(interval))
})

await fastify.listen({ port: 3000, host: '0.0.0.0' })
