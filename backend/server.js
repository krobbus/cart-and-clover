import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './config/db.js';
import errorHandler from './middleware/errorMiddleware.js';

import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import userRoutes from './routes/userRoutes.js';

connectDB();

const app = express();
const allowedOrigins = [
    process.env.LOCAL_URL,
    process.env.FRONTEND_URL,
    process.env.BACKEND_URL
].filter(Boolean);
app.use(cors({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
    credentials: true
}));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);

app.use(errorHandler);

const PORT = process.env.NODE_ENV === "development" ?
    process.env.LOCAL_SERVER_PORT : process.env.RENDER_SERVER_PORT || process.env.LOCAL_SERVER_PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));