import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1',
  withCredentials: true, // Crucial for sending the httpOnly JWT cookie
});
