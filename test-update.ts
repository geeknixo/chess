import { api } from './apps/web/src/lib/api.js';
import axios from 'axios';

async function test() {
  try {
    const res = await axios.patch('http://localhost:3001/v1/tournaments/00000000-0000-0000-0000-000000000000', { status: 'COMPLETED' });
    console.log(res.data);
  } catch (err: any) {
    console.error(err.response?.data || err.message);
  }
}
test();
