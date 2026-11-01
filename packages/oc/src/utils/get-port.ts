import net from 'node:net';

export default function getPort(start = 2000, end = 60000): Promise<number> {
  return new Promise((resolve, reject) => {
    const tryPort = (port: number) => {
      if (port >= end) return reject(new Error('out of ports :('));
      const socket = net.connect({ port }, () => {
        socket.destroy();
        tryPort(port + 1);
      });
      socket.on('error', () => resolve(port));
    };
    tryPort(start);
  });
}
