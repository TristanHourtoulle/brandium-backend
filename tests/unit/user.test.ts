import { sequelize, User } from '../../src/models';
import bcrypt from 'bcrypt';

describe('User Model Unit Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    await User.destroy({ where: {}, truncate: true, cascade: true });
  });

  // =====================================
  // Password Hashing Tests
  // =====================================
  describe('Password Hashing', () => {
    it('should hash password on user creation (beforeCreate hook)', async () => {
      const plainPassword = 'TestPassword123';
      const user = await User.create({
        email: 'hash-test@example.com',
        passwordHash: plainPassword,
      });

      // Password should be hashed, not plain text
      expect(user.passwordHash).not.toBe(plainPassword);
      // Should be a bcrypt hash (starts with $2b$)
      expect(user.passwordHash).toMatch(/^\$2[aby]\$/);

      // Verify the hash is valid
      const isValid = await bcrypt.compare(plainPassword, user.passwordHash);
      expect(isValid).toBe(true);
    });

    it('should hash password on password update (beforeUpdate hook)', async () => {
      const originalPassword = 'OriginalPassword123';
      const newPassword = 'NewPassword456';

      // Create user
      const user = await User.create({
        email: 'update-test@example.com',
        passwordHash: originalPassword,
      });

      const originalHash = user.passwordHash;

      // Update password
      user.passwordHash = newPassword;
      await user.save();

      // Reload to get fresh data
      await user.reload();

      // New password should be hashed differently
      expect(user.passwordHash).not.toBe(originalHash);
      expect(user.passwordHash).not.toBe(newPassword);

      // Should be a valid bcrypt hash
      expect(user.passwordHash).toMatch(/^\$2[aby]\$/);

      // Verify new password works
      const isNewValid = await bcrypt.compare(newPassword, user.passwordHash);
      expect(isNewValid).toBe(true);

      // Old password should no longer work
      const isOldValid = await bcrypt.compare(originalPassword, user.passwordHash);
      expect(isOldValid).toBe(false);
    });

    it('should not rehash password when updating other fields', async () => {
      const password = 'MyPassword123';

      // Create user
      const user = await User.create({
        email: 'no-rehash@example.com',
        passwordHash: password,
      });

      const originalHash = user.passwordHash;

      // Update email only (not password)
      user.email = 'updated-email@example.com';
      await user.save();

      await user.reload();

      // Password hash should remain the same
      expect(user.passwordHash).toBe(originalHash);

      // Original password should still work
      const isValid = await bcrypt.compare(password, user.passwordHash);
      expect(isValid).toBe(true);
    });
  });

  // =====================================
  // comparePassword Method Tests
  // =====================================
  describe('comparePassword Method', () => {
    it('should return true for correct password', async () => {
      const password = 'CorrectPassword123';
      const user = await User.create({
        email: 'compare-test@example.com',
        passwordHash: password,
      });

      const result = await user.comparePassword(password);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const user = await User.create({
        email: 'compare-wrong@example.com',
        passwordHash: 'CorrectPassword123',
      });

      const result = await user.comparePassword('WrongPassword456');
      expect(result).toBe(false);
    });

    it('should return false for empty password', async () => {
      const user = await User.create({
        email: 'compare-empty@example.com',
        passwordHash: 'SomePassword123',
      });

      const result = await user.comparePassword('');
      expect(result).toBe(false);
    });
  });

  // =====================================
  // toJSON Method Tests
  // =====================================
  describe('toJSON Method', () => {
    it('should exclude passwordHash from JSON serialization', async () => {
      const user = await User.create({
        email: 'json-test@example.com',
        passwordHash: 'SecretPassword123',
      });

      const json = user.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('email', 'json-test@example.com');
      expect(json).toHaveProperty('createdAt');
      expect(json).toHaveProperty('updatedAt');
      expect(json).not.toHaveProperty('passwordHash');
    });

    it('should preserve all other properties in JSON', async () => {
      const user = await User.create({
        email: 'json-full@example.com',
        passwordHash: 'Password123',
      });

      const json = user.toJSON();

      // Check UUID format
      expect(json.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(json.email).toBe('json-full@example.com');
      expect(json.createdAt).toBeInstanceOf(Date);
      expect(json.updatedAt).toBeInstanceOf(Date);
    });
  });

  // =====================================
  // Model Validation Tests
  // =====================================
  describe('Model Validation', () => {
    it('should require email field', async () => {
      await expect(
        User.create({
          email: '',
          passwordHash: 'Password123',
        }),
      ).rejects.toThrow();
    });

    it('should validate email format', async () => {
      await expect(
        User.create({
          email: 'invalid-email',
          passwordHash: 'Password123',
        }),
      ).rejects.toThrow('Must be a valid email address');
    });

    it('should enforce unique email constraint', async () => {
      await User.create({
        email: 'unique@example.com',
        passwordHash: 'Password123',
      });

      await expect(
        User.create({
          email: 'unique@example.com',
          passwordHash: 'Password456',
        }),
      ).rejects.toThrow();
    });

    it('should generate UUID for id automatically', async () => {
      const user = await User.create({
        email: 'uuid-test@example.com',
        passwordHash: 'Password123',
      });

      expect(user.id).toBeDefined();
      expect(user.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it('should set timestamps automatically', async () => {
      const beforeCreate = new Date();
      const user = await User.create({
        email: 'timestamp@example.com',
        passwordHash: 'Password123',
      });
      const afterCreate = new Date();

      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
      expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(user.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });
});
