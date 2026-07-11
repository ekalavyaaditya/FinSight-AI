import request from 'supertest';
import app from '../server';

describe('FinSight AI Platform API Testing Suite', () => {
  it('should verify the system health check status', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body.status).toEqual('healthy');
  });

  it('should return 401 unauthorized when fetching transactions without a token', async () => {
    const res = await request(app).get('/api/transactions');
    expect(res.statusCode).toEqual(401);
  });

  it('should return 400 when attempting registration with invalid details', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'invalid-email-format',
      password: 'short',
      fullName: '',
    });
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('errors');
  });
});
