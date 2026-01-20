const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();
const path = require('path');
const sequelize = require('./src/config/sequelize');
const routes = require('./src/routes');

const syncJob = require('./src/jobs/sync.job');

const app = express();

// Start Cron Jobs
syncJob();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(helmet({
    crossOriginResourcePolicy: false,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api', routes);

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Porta obrigatória nos buildpacks/docker
const PORT = process.env.PORT || 3000;

const { Category, Product, ProductAttribute, ProductVariation, User, Brand } = require('./src/models');

async function seedData() {
    console.log('🌱 Seeding data...');

    // 0. Roles & Permissions
    const { Role } = require('./src/models');

    const allResources = ['dashboard', 'products', 'orders', 'customers', 'coupons', 'shipping', 'settings', 'roles'];
    const allActions = ['read', 'create', 'update', 'delete'];
    const superAdminPermissions = [];

    allResources.forEach(res => {
        allActions.forEach(act => {
            superAdminPermissions.push(`${res}:${act}`);
        });
    });

    const [superAdminRole, createdRole] = await Role.findOrCreate({
        where: { name: 'Super Admin' },
        defaults: {
            description: 'Acesso total ao sistema',
            permissions: superAdminPermissions
        }
    });

    if (createdRole) {
        console.log('🛡️ Super Admin Role created');
    } else {
        console.log('🛡️ Super Admin Role already exists');
    }

    // 0. Admin Users
    const admin1 = await User.findOne({ where: { email: 'patrick@gmail.com' } });
    if (!admin1) {
        await User.create({
            name: 'Patrick Admin',
            email: 'patrick@gmail.com',
            password: 'patrick123',
            role: 'admin',
            roleId: superAdminRole.id
        });
        console.log('👤 Admin user Patrick created');
    }

    const admin2 = await User.findOne({ where: { email: 'admin@alcateia.com' } });
    if (!admin2) {
        await User.create({
            name: 'Alcateia Admin',
            email: 'admin@alcateia.com',
            password: 'alcateiaadmin123',
            role: 'admin',
            roleId: superAdminRole.id
        });
        console.log('👤 Admin user Alcateia created');
    }

    const admin3 = await User.findOne({ where: { email: 'admin@reveste-se.com' } });
    if (!admin3) {
        await User.create({
            name: 'Reveste-se Admin',
            email: 'admin@reveste-se.com',
            password: 'admin',
            role: 'admin',
            roleId: superAdminRole.id
        });
        console.log('👤 Admin user Reveste-se created');
    }

    console.log('✅ Seeding check completed.');
}

async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // ⚠️ FORCE TRUE DESATIVADO - USANDO MIGRATIONS
        // await sequelize.sync({ force: false });
        // console.log('Models synced (Managed by Migrations).');

        // User requested force: true to reset schema
        await sequelize.sync({ force: true });
        console.log('Models synced (Force: true).');

        await seedData();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
}

startServer();
