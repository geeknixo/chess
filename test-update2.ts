import axios from 'axios';
import jwt from 'jsonwebtoken';

async function test() {
  try {
    const token = jwt.sign({ sub: 'd4520999-52e8-4668-b778-903ed782eeb3', email: 'coach@kingdomofchess.com', role: 'COACH' }, 'secretKey');
    const res = await axios.patch('http://localhost:3001/v1/tournaments', { status: 'COMPLETED' }, {
      headers: {
        Cookie: `Authentication=${token}`
      }
    });
    console.log(res.data);
  } catch (err: any) {
    console.error('ERROR:', err.response?.data || err.message);
  }
}
test();
