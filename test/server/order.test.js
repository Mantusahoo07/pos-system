import request from 'supertest';
import { expect } from 'chai';
import app from '../../server/index.js';

describe('Order API', () => {
  let authToken;
  let createdOrderId;

  before(async () => {
    // Login to get token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    authToken = res.body.token;
  });

  describe('POST /api/orders', () => {
    it('should create a new order', async () => {
      const orderData = {
        items: [
          { id: '1', name: 'Pizza', quantity: 2, price: 12.99 }
        ],
        total: 25.98,
        orderType: 'dine-in'
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData);

      expect(res.status).to.equal(201);
      expect(res.body).to.have.property('orderNumber');
      createdOrderId = res.body._id;
    });

    it('should reject order without items', async () => {
      const orderData = {
        items: [],
        total: 0
      };

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData);

      expect(res.status).to.equal(500);
    });
  });

  describe('GET /api/orders', () => {
    it('should get all orders', async () => {
      const res = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).to.equal(200);
      expect(res.body).to.be.an('array');
    });

    it('should get order by id', async () => {
      const res = await request(app)
        .get(`/api/orders/${createdOrderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).to.equal(200);
      expect(res.body._id).to.equal(createdOrderId);
    });
  });
});