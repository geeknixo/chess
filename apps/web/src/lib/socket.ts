import { io } from 'socket.io-client';

export const getSocket = () => {
  return io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
    withCredentials: true, // Crucial for sending the HTTPOnly JWT cookie
    autoConnect: false, // We will manually connect in components
  });
};
