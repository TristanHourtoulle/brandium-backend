#!/bin/bash

# =====================================
# Brandium Backend - Database Setup Script
# =====================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values (can be overridden by .env)
DB_USER="${DB_USER:-brandium_user}"
DB_PASSWORD="${DB_PASSWORD:-brandium_pass}"
DB_NAME="${DB_NAME:-brandium_dev}"
DB_TEST_NAME="${DB_TEST_NAME:-brandium_test}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Brandium Backend - Database Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: PostgreSQL is not installed.${NC}"
    echo -e "${YELLOW}Please install it with: brew install postgresql@16${NC}"
    exit 1
fi

echo -e "${GREEN}✓ PostgreSQL found: $(psql --version)${NC}"

# Check if PostgreSQL service is running
if ! pg_isready &> /dev/null; then
    echo -e "${YELLOW}PostgreSQL is not running. Starting it...${NC}"
    brew services start postgresql@14 2>/dev/null || brew services start postgresql@16 2>/dev/null || brew services start postgresql 2>/dev/null
    sleep 2
fi

echo -e "${GREEN}✓ PostgreSQL is running${NC}"

# Create user if not exists
echo -e "${BLUE}Creating user '${DB_USER}'...${NC}"
psql postgres -tc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'" | grep -q 1 || \
    psql postgres -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}' CREATEDB;"
echo -e "${GREEN}✓ User '${DB_USER}' ready${NC}"

# Create development database if not exists
echo -e "${BLUE}Creating database '${DB_NAME}'...${NC}"
psql postgres -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
    psql postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"
echo -e "${GREEN}✓ Database '${DB_NAME}' ready${NC}"

# Create test database if not exists
echo -e "${BLUE}Creating database '${DB_TEST_NAME}'...${NC}"
psql postgres -tc "SELECT 1 FROM pg_database WHERE datname='${DB_TEST_NAME}'" | grep -q 1 || \
    psql postgres -c "CREATE DATABASE ${DB_TEST_NAME} OWNER ${DB_USER};"
echo -e "${GREEN}✓ Database '${DB_TEST_NAME}' ready${NC}"

# Grant privileges
echo -e "${BLUE}Granting privileges...${NC}"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null || true
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_TEST_NAME} TO ${DB_USER};" 2>/dev/null || true
echo -e "${GREEN}✓ Privileges granted${NC}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Database setup completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Connection details:"
echo -e "  Host:     ${BLUE}localhost${NC}"
echo -e "  Port:     ${BLUE}5432${NC}"
echo -e "  User:     ${BLUE}${DB_USER}${NC}"
echo -e "  Password: ${BLUE}${DB_PASSWORD}${NC}"
echo -e "  Database: ${BLUE}${DB_NAME}${NC}"
echo -e "  Test DB:  ${BLUE}${DB_TEST_NAME}${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Run migrations: ${BLUE}npm run db:migrate${NC}"
echo -e "  2. Seed data:      ${BLUE}npm run db:seed${NC}"
echo -e "  3. Start server:   ${BLUE}npm run dev${NC}"
