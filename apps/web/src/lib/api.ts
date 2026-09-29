import axios from 'axios';

const baseURL = typeof window === 'undefined'
  ? (process.env.API_URL ? `${process.env.API_URL}/v1` : 'http://localhost:3001/v1')
  : '/v1';

export const api = axios.create({
  baseURL,
  withCredentials: true, // Crucial for sending the httpOnly JWT cookie
});
