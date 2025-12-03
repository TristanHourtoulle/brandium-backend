require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER || 'brandium_user',
    password: process.env.DB_PASSWORD || 'brandium_pass',
    database: process.env.DB_NAME || 'brandium_dev',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log,
    define: {
      timestamps: true,
      underscored: false,
    },
  },
  test: {
    username: process.env.DB_USER || 'brandium_user',
    password: process.env.DB_PASSWORD || 'brandium_pass',
    database: 'brandium_test',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    define: {
      timestamps: true,
      underscored: false,
    },
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    define: {
      timestamps: true,
      underscored: false,
    },
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
