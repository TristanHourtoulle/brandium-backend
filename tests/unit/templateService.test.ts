/**
 * TemplateService Unit Tests
 *
 * Comprehensive tests for TemplateService including:
 * - Creating templates
 * - Listing templates
 * - Updating templates
 * - Deleting templates
 * - Rendering templates
 * - Duplicating templates
 * - Getting suggestions
 * - Finding similar templates
 * - Getting statistics
 */

import { TemplateService } from '../../src/services/TemplateService';
import { Template } from '../../src/models/Template';
import { User, Profile, Platform, sequelize } from '../../src/models';
import { TemplateVariable } from '../../src/types/template';

describe('TemplateService', () => {
  let service: TemplateService;
  let testUser: User;
  let testUserId: string;
  let testProfile: Profile;
  let testPlatform: Platform;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean up database in correct order (respecting foreign keys)
    await Template.destroy({ where: {}, force: true });
    await Profile.destroy({ where: {}, force: true });
    await Platform.destroy({ where: {}, force: true });
    await User.destroy({ where: {}, force: true });

    // Create a test user
    testUser = await User.create({
      email: 'test@example.com',
      passwordHash: 'hashedpassword123',
    });
    testUserId = testUser.id;

    // Create test profile
    testProfile = await Profile.create({
      name: 'Test Profile',
      bio: 'Test bio',
      toneTags: ['professional'],
      doRules: ['Be concise'],
      dontRules: ['No jargon'],
      userId: testUserId,
    });

    // Create test platform
    testPlatform = await Platform.create({
      name: 'LinkedIn',
      styleGuidelines: 'Professional tone',
      maxLength: 3000,
      userId: testUserId,
    });

    service = new TemplateService();
  });

  // =====================================
  // createTemplate Tests
  // =====================================
  describe('createTemplate', () => {
    const validVariables: TemplateVariable[] = [
      { name: 'product', description: 'Product name', required: true },
      { name: 'feature', description: 'Key feature', required: false },
    ];

    it('should create template with all fields', async () => {
      const template = await service.createTemplate({
        userId: testUserId,
        profileId: testProfile.id,
        platformId: testPlatform.id,
        name: 'Product Announcement',
        description: 'Announce new products',
        category: 'announcement',
        content: 'Excited to announce {{product}}! Key feature: {{feature}}',
        variables: validVariables,
        exampleVariables: { product: 'MyApp', feature: 'AI-powered' },
        tags: ['product', 'marketing'],
        isPublic: true,
      });

      expect(template.name).toBe('Product Announcement');
      expect(template.category).toBe('announcement');
      expect(template.content).toContain('{{product}}');
      expect(template.variables).toHaveLength(2);
      expect(template.isPublic).toBe(true);
      expect(template.isSystem).toBe(false);
      expect(template.usageCount).toBe(0);
    });

    it('should create template with minimal fields', async () => {
      const template = await service.createTemplate({
        userId: testUserId,
        name: 'Simple Template',
        category: 'tip',
        content: 'Quick tip: {{tip}}',
        variables: [{ name: 'tip', description: 'The tip', required: true }],
      });

      expect(template.name).toBe('Simple Template');
      expect(template.profileId).toBeNull();
      expect(template.platformId).toBeNull();
      expect(template.description).toBeNull();
      expect(template.isPublic).toBe(false);
    });

    it('should validate variables match content', async () => {
      await expect(
        service.createTemplate({
          userId: testUserId,
          name: 'Invalid Template',
          category: 'announcement',
          content: 'Product: {{product}}, Feature: {{feature}}',
          variables: [{ name: 'product', description: 'Product', required: true }], // Missing 'feature'
        }),
      ).rejects.toThrow('Template validation failed');
    });

    it('should reject undefined variables in content', async () => {
      await expect(
        service.createTemplate({
          userId: testUserId,
          name: 'Invalid Template',
          category: 'announcement',
          content: 'Product: {{product}}, Mystery: {{unknown}}',
          variables: [{ name: 'product', description: 'Product', required: true }],
        }),
      ).rejects.toThrow('{{unknown}}');
    });

    it('should allow variables defined but not used in content', async () => {
      const template = await service.createTemplate({
        userId: testUserId,
        name: 'Flexible Template',
        category: 'tip',
        content: 'Using {{var1}}',
        variables: [
          { name: 'var1', description: 'Used var', required: true },
          { name: 'var2', description: 'Optional unused var', required: false },
        ],
      });

      expect(template).toBeDefined();
      expect(template.variables).toHaveLength(2);
    });
  });

  // =====================================
  // getTemplateById Tests
  // =====================================
  describe('getTemplateById', () => {
    let userTemplate: Template;
    let systemTemplate: Template;
    let publicTemplate: Template;
    let privateTemplate: Template;
    let otherUserId: string;

    beforeEach(async () => {
      // Create another user
      const otherUser = await User.create({
        email: 'other@example.com',
        passwordHash: 'hashedpassword456',
      });
      otherUserId = otherUser.id;

      // Create different types of templates
      userTemplate = await service.createTemplate({
        userId: testUserId,
        name: 'My Template',
        category: 'tip',
        content: 'My content: {{var1}}',
        variables: [{ name: 'var1', description: 'Var 1', required: true }],
      });

      systemTemplate = await Template.create({
        userId: null,
        name: 'System Template',
        category: 'announcement',
        content: 'System: {{var1}}',
        variables: [{ name: 'var1', description: 'Var 1', required: true }],
        isSystem: true,
        isPublic: false,
        usageCount: 0,
      });

      publicTemplate = await Template.create({
        userId: otherUserId,
        name: 'Public Template',
        category: 'tutorial',
        content: 'Public: {{var1}}',
        variables: [{ name: 'var1', description: 'Var 1', required: true }],
        isSystem: false,
        isPublic: true,
        usageCount: 0,
      });

      privateTemplate = await Template.create({
        userId: otherUserId,
        name: 'Private Template',
        category: 'experience',
        content: 'Private: {{var1}}',
        variables: [{ name: 'var1', description: 'Var 1', required: true }],
        isSystem: false,
        isPublic: false,
        usageCount: 0,
      });
    });

    it('should return user own template', async () => {
      const result = await service.getTemplateById(userTemplate.id, testUserId);
      expect(result).not.toBeNull();
      expect(result!.id).toBe(userTemplate.id);
    });

    it('should return system template', async () => {
      const result = await service.getTemplateById(systemTemplate.id, testUserId);
      expect(result).not.toBeNull();
      expect(result!.isSystem).toBe(true);
    });

    it('should return public template from other user', async () => {
      const result = await service.getTemplateById(publicTemplate.id, testUserId);
      expect(result).not.toBeNull();
      expect(result!.isPublic).toBe(true);
    });

    it('should NOT return private template from other user', async () => {
      const result = await service.getTemplateById(privateTemplate.id, testUserId);
      expect(result).toBeNull();
    });

    it('should return null for non-existent template', async () => {
      const result = await service.getTemplateById(
        '00000000-0000-0000-0000-000000000000',
        testUserId,
      );
      expect(result).toBeNull();
    });
  });

  // =====================================
  // listTemplates Tests
  // =====================================
  describe('listTemplates', () => {
    beforeEach(async () => {
      // Create another user
      const otherUser = await User.create({
        email: 'other@example.com',
        passwordHash: 'hashedpassword456',
      });

      // Create various templates
      await service.createTemplate({
        userId: testUserId,
        name: 'User Template 1',
        category: 'announcement',
        content: '{{var1}}',
        variables: [{ name: 'var1', description: 'Var 1', required: true }],
      });

      await service.createTemplate({
        userId: testUserId,
        name: 'User Template 2',
        category: 'tip',
        content: '{{var1}}',
        variables: [{ name: 'var1', description: 'Var 1', required: true }],
        isPublic: true,
      });

      await Template.create({
        userId: null,
        name: 'System Template',
        category: 'tutorial',
        content: '{{var1}}',
        variables: [{ name: 'var1', description: 'Var 1', required: true }],
        isSystem: true,
        isPublic: false,
        usageCount: 100,
      });

      await Template.create({
        userId: otherUser.id,
        name: 'Public Template',
        category: 'announcement',
        content: '{{var1}}',
        variables: [{ name: 'var1', description: 'Var 1', required: true }],
        isSystem: false,
        isPublic: true,
        usageCount: 50,
      });

      await Template.create({
        userId: otherUser.id,
        name: 'Private Template',
        category: 'experience',
        content: '{{var1}}',
        variables: [{ name: 'var1', description: 'Var 1', required: true }],
        isSystem: false,
        isPublic: false,
        usageCount: 0,
      });
    });

    it('should return user templates + system + public by default', async () => {
      const result = await service.listTemplates({ userId: testUserId });

      expect(result.total).toBe(4); // 2 user + 1 system + 1 public
      expect(result.templates).toHaveLength(4);
    });

    it('should filter by category', async () => {
      const result = await service.listTemplates({
        userId: testUserId,
        category: 'announcement',
      });

      expect(result.total).toBe(2); // User Template 1 + Public Template
      expect(result.templates.every((t) => t.category === 'announcement')).toBe(true);
    });

    it('should exclude system templates when includeSystem=false', async () => {
      const result = await service.listTemplates({
        userId: testUserId,
        includeSystem: false,
      });

      expect(result.templates.every((t) => !t.isSystem)).toBe(true);
    });

    it('should exclude public templates when includePublic=false', async () => {
      const result = await service.listTemplates({
        userId: testUserId,
        includePublic: false,
        includeSystem: false,
      });

      // Should only return user's own templates
      expect(result.total).toBe(2);
      expect(result.templates.every((t) => t.userId === testUserId)).toBe(true);
    });

    it('should support pagination', async () => {
      const page1 = await service.listTemplates({
        userId: testUserId,
        page: 1,
        limit: 2,
      });

      expect(page1.templates).toHaveLength(2);
      expect(page1.page).toBe(1);
      expect(page1.totalPages).toBe(2);

      const page2 = await service.listTemplates({
        userId: testUserId,
        page: 2,
        limit: 2,
      });

      expect(page2.templates).toHaveLength(2);
      expect(page2.page).toBe(2);
    });

    it('should order by system > usageCount > createdAt DESC', async () => {
      const result = await service.listTemplates({ userId: testUserId });

      // First should be system template (highest priority)
      expect(result.templates[0]!.isSystem).toBe(true);
      // Second should be public template (usageCount: 50)
      expect(result.templates[1]!.name).toBe('Public Template');
    });
  });

  // =====================================
  // updateTemplate Tests
  // =====================================
  describe('updateTemplate', () => {
    let template: Template;

    beforeEach(async () => {
      template = await service.createTemplate({
        userId: testUserId,
        name: 'Original Template',
        category: 'announcement',
        content: 'Original: {{var1}}',
        variables: [{ name: 'var1', description: 'Var 1', required: true }],
        isPublic: false,
      });
    });

    it('should update template fields', async () => {
      const updated = await service.updateTemplate(template.id, testUserId, {
        name: 'Updated Template',
        description: 'New description',
        isPublic: true,
      });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe('Updated Template');
      expect(updated!.description).toBe('New description');
      expect(updated!.isPublic).toBe(true);
      // Unchanged fields should remain
      expect(updated!.content).toBe('Original: {{var1}}');
    });

    it('should validate new content and variables', async () => {
      await expect(
        service.updateTemplate(template.id, testUserId, {
          content: 'New: {{newvar}}',
          variables: [{ name: 'var1', description: 'Old var', required: true }], // Missing 'newvar'
        }),
      ).rejects.toThrow('Template validation failed');
    });

    it('should allow updating content with matching variables', async () => {
      const updated = await service.updateTemplate(template.id, testUserId, {
        content: 'Updated: {{var1}} and {{var2}}',
        variables: [
          { name: 'var1', description: 'Var 1', required: true },
          { name: 'var2', description: 'Var 2', required: true },
        ],
      });

      expect(updated!.content).toContain('{{var2}}');
      expect(updated!.variables).toHaveLength(2);
    });

    it('should return null for template owned by different user', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        passwordHash: 'hashedpassword456',
      });

      const result = await service.updateTemplate(template.id, otherUser.id, {
        name: 'Hacked',
      });

      expect(result).toBeNull();

      // Verify original template unchanged
      await template.reload();
      expect(template.name).toBe('Original Template');
    });

    it('should return null for non-existent template', async () => {
      const result = await service.updateTemplate(
        '00000000-0000-0000-0000-000000000000',
        testUserId,
        { name: 'Updated' },
      );

      expect(result).toBeNull();
    });
  });

  // =====================================
  // deleteTemplate Tests
  // =====================================
  describe('deleteTemplate', () => {
    let template: Template;

    beforeEach(async () => {
      template = await service.createTemplate({
        userId: testUserId,
        name: 'To Delete',
        category: 'tip',
        content: '{{var1}}',
        variables: [{ name: 'var1', description: 'Var 1', required: true }],
      });
    });

    it('should delete user own template', async () => {
      const result = await service.deleteTemplate(template.id, testUserId);
      expect(result).toBe(true);

      const deleted = await Template.findByPk(template.id);
      expect(deleted).toBeNull();
    });

    it('should return false for template owned by different user', async () => {
      const otherUser = await User.create({
        email: 'other@example.com',
        passwordHash: 'hashedpassword456',
      });

      const result = await service.deleteTemplate(template.id, otherUser.id);
      expect(result).toBe(false);

      // Verify template still exists
      const stillExists = await Template.findByPk(template.id);
      expect(stillExists).not.toBeNull();
    });

    it('should return false for non-existent template', async () => {
      const result = await service.deleteTemplate(
        '00000000-0000-0000-0000-000000000000',
        testUserId,
      );
      expect(result).toBe(false);
    });
  });

  // =====================================
  // renderTemplateById Tests
  // =====================================
  describe('renderTemplateById', () => {
    let template: Template;

    beforeEach(async () => {
      template = await service.createTemplate({
        userId: testUserId,
        name: 'Render Test',
        category: 'announcement',
        content: 'Product: {{product}}, Feature: {{feature}}, CTA: {{cta}}',
        variables: [
          { name: 'product', description: 'Product name', required: true },
          { name: 'feature', description: 'Key feature', required: true },
          { name: 'cta', description: 'Call to action', required: false, defaultValue: 'Learn more!' },
        ],
      });
    });

    it('should render template with all variables provided', async () => {
      const result = await service.renderTemplateById(
        {
          templateId: template.id,
          variables: {
            product: 'MyApp',
            feature: 'AI-powered',
            cta: 'Try it now!',
          },
        },
        testUserId,
      );

      expect(result.content).toBe('Product: MyApp, Feature: AI-powered, CTA: Try it now!');
      expect(result.missingVariables).toHaveLength(0);
      expect(result.template.id).toBe(template.id);
    });

    it('should use default values for optional variables', async () => {
      const result = await service.renderTemplateById(
        {
          templateId: template.id,
          variables: {
            product: 'MyApp',
            feature: 'AI-powered',
            // 'cta' omitted, should use default
          },
        },
        testUserId,
      );

      expect(result.content).toContain('CTA: Learn more!');
      expect(result.missingVariables).toHaveLength(0);
    });

    it('should report missing required variables', async () => {
      const result = await service.renderTemplateById(
        {
          templateId: template.id,
          variables: {
            product: 'MyApp',
            // 'feature' missing
          },
        },
        testUserId,
      );

      expect(result.content).toBe('');
      expect(result.missingVariables).toContain('feature');
    });

    it('should increment usage count on successful render', async () => {
      const initialUsageCount = template.usageCount;

      await service.renderTemplateById(
        {
          templateId: template.id,
          variables: { product: 'MyApp', feature: 'Fast' },
        },
        testUserId,
      );

      await template.reload();
      expect(template.usageCount).toBe(initialUsageCount + 1);
    });

    it('should NOT increment usage count when variables missing', async () => {
      const initialUsageCount = template.usageCount;

      await service.renderTemplateById(
        {
          templateId: template.id,
          variables: { product: 'MyApp' }, // Missing 'feature'
        },
        testUserId,
      );

      await template.reload();
      expect(template.usageCount).toBe(initialUsageCount);
    });

    it('should throw error for non-existent template', async () => {
      await expect(
        service.renderTemplateById(
          {
            templateId: '00000000-0000-0000-0000-000000000000',
            variables: {},
          },
          testUserId,
        ),
      ).rejects.toThrow('Template not found or access denied');
    });
  });

  // =====================================
  // duplicateTemplate Tests
  // =====================================
  describe('duplicateTemplate', () => {
    let originalTemplate: Template;

    beforeEach(async () => {
      originalTemplate = await service.createTemplate({
        userId: testUserId,
        profileId: testProfile.id,
        platformId: testPlatform.id,
        name: 'Original Template',
        description: 'Original description',
        category: 'announcement',
        content: 'Content: {{var1}}',
        variables: [{ name: 'var1', description: 'Var 1', required: true }],
        exampleVariables: { var1: 'Example' },
        tags: ['tag1', 'tag2'],
        isPublic: true,
      });
    });

    it('should duplicate template with default name', async () => {
      const duplicate = await service.duplicateTemplate(originalTemplate.id, testUserId);

      expect(duplicate.name).toBe('Copy of Original Template');
      expect(duplicate.content).toBe(originalTemplate.content);
      expect(duplicate.category).toBe(originalTemplate.category);
      expect(duplicate.variables).toEqual(originalTemplate.variables);
      expect(duplicate.userId).toBe(testUserId);
    });

    it('should duplicate with custom name', async () => {
      const duplicate = await service.duplicateTemplate(
        originalTemplate.id,
        testUserId,
        'My Custom Copy',
      );

      expect(duplicate.name).toBe('My Custom Copy');
    });

    it('should reset system and public flags', async () => {
      const duplicate = await service.duplicateTemplate(originalTemplate.id, testUserId);

      expect(duplicate.isSystem).toBe(false);
      expect(duplicate.isPublic).toBe(false);
    });

    it('should reset usage count', async () => {
      // Increment usage count
      await originalTemplate.increment('usageCount', { by: 10 });
      await originalTemplate.reload();

      const duplicate = await service.duplicateTemplate(originalTemplate.id, testUserId);

      expect(duplicate.usageCount).toBe(0);
      expect(originalTemplate.usageCount).toBe(10);
    });

    it('should copy content but not user-specific associations', async () => {
      const duplicate = await service.duplicateTemplate(originalTemplate.id, testUserId);

      // Profile and Platform IDs should be null (they belong to original user)
      expect(duplicate.profileId).toBeNull();
      expect(duplicate.platformId).toBeNull();
      // Content should be copied
      expect(duplicate.description).toBe(originalTemplate.description);
      expect(duplicate.exampleVariables).toEqual(originalTemplate.exampleVariables);
      expect(duplicate.tags).toEqual(originalTemplate.tags);
    });

    it('should throw error for non-existent template', async () => {
      await expect(
        service.duplicateTemplate('00000000-0000-0000-0000-000000000000', testUserId),
      ).rejects.toThrow('Template not found or access denied');
    });
  });

  // =====================================
  // getSuggestions Tests
  // =====================================
  describe('getSuggestions', () => {
    beforeEach(async () => {
      // Create system templates
      await Template.create({
        userId: null,
        name: 'System Announcement',
        category: 'announcement',
        content: '{{var1}}',
        variables: [{ name: 'var1', description: 'Var 1', required: true }],
        isSystem: true,
        usageCount: 100,
      });

      await Template.create({
        userId: null,
        name: 'System Tutorial',
        category: 'tutorial',
        content: '{{var1}}',
        variables: [{ name: 'var1', description: 'Var 1', required: true }],
        isSystem: true,
        usageCount: 50,
      });

      // Create popular public template
      await Template.create({
        userId: testUserId,
        name: 'Popular Public',
        category: 'announcement',
        content: '{{var1}}',
        variables: [{ name: 'var1', description: 'Var 1', required: true }],
        isSystem: false,
        isPublic: true,
        usageCount: 10, // >= 5
      });

      // Create unpopular public template (should not appear)
      await Template.create({
        userId: testUserId,
        name: 'Unpopular Public',
        category: 'tip',
        content: '{{var1}}',
        variables: [{ name: 'var1', description: 'Var 1', required: true }],
        isSystem: false,
        isPublic: true,
        usageCount: 2, // < 5
      });
    });

    it('should return system and popular public templates', async () => {
      const suggestions = await service.getSuggestions({ userId: testUserId });

      expect(suggestions).toHaveLength(3); // 2 system + 1 popular public
      expect(suggestions.some((t) => t.name === 'Unpopular Public')).toBe(false);
    });

    it('should filter by category', async () => {
      const suggestions = await service.getSuggestions({
        userId: testUserId,
        category: 'announcement',
      });

      expect(suggestions).toHaveLength(2); // System Announcement + Popular Public
      expect(suggestions.every((t) => t.category === 'announcement')).toBe(true);
    });

    it('should order by usageCount DESC', async () => {
      const suggestions = await service.getSuggestions({ userId: testUserId });

      expect(suggestions[0]!.usageCount).toBeGreaterThan(suggestions[1]!.usageCount!);
    });

    it('should respect limit parameter', async () => {
      const suggestions = await service.getSuggestions({
        userId: testUserId,
        limit: 2,
      });

      expect(suggestions).toHaveLength(2);
    });
  });

  // =====================================
  // findSimilarTemplates Tests
  // =====================================
  describe('findSimilarTemplates', () => {
    beforeEach(async () => {
      await service.createTemplate({
        userId: testUserId,
        name: 'Product Template',
        category: 'announcement',
        content: 'Announcing {{product}} with {{feature}} and {{price}}',
        variables: [
          { name: 'product', description: 'Product name', required: true },
          { name: 'feature', description: 'Key feature', required: true },
          { name: 'price', description: 'Price', required: true },
        ],
      });

      await service.createTemplate({
        userId: testUserId,
        name: 'Event Template',
        category: 'event',
        content: 'Join us for {{event}} on {{date}}',
        variables: [
          { name: 'event', description: 'Event name', required: true },
          { name: 'date', description: 'Event date', required: true },
        ],
      });
    });

    it('should find similar templates based on variable overlap', async () => {
      const content = 'Check out our new {{product}} with amazing {{feature}}!';
      const similar = await service.findSimilarTemplates(testUserId, content, 5);

      expect(similar).toHaveLength(1);
      expect(similar[0]!.name).toBe('Product Template');
    });

    it('should return empty array for content with no variables', async () => {
      const content = 'Plain text without variables';
      const similar = await service.findSimilarTemplates(testUserId, content, 5);

      expect(similar).toHaveLength(0);
    });

    it('should score by similarity and return most similar first', async () => {
      // Create another template with partial overlap
      await service.createTemplate({
        userId: testUserId,
        name: 'Partial Match',
        category: 'tip',
        content: 'Tip about {{product}} and {{something_else}}',
        variables: [
          { name: 'product', description: 'Product', required: true },
          { name: 'something_else', description: 'Other', required: true },
        ],
      });

      const content = 'New {{product}} with {{feature}} and {{price}}';
      const similar = await service.findSimilarTemplates(testUserId, content, 5);

      // 'Product Template' should rank higher (3/3 match) than 'Partial Match' (1/4 match)
      expect(similar[0]!.name).toBe('Product Template');
    });

    it('should respect limit parameter', async () => {
      const content = 'Product {{product}} Feature {{feature}}';
      const similar = await service.findSimilarTemplates(testUserId, content, 1);

      expect(similar).toHaveLength(1);
    });

    it('should filter out low similarity templates (< 30%)', async () => {
      const content = 'Using {{completely}} and {{different}} variables';
      const similar = await service.findSimilarTemplates(testUserId, content, 5);

      // Should be empty or very few results
      expect(similar.length).toBeLessThan(2);
    });
  });

  // =====================================
  // getStatistics Tests
  // =====================================
  describe('getStatistics', () => {
    beforeEach(async () => {
      // Create templates in different categories with different usage counts
      await service.createTemplate({
        userId: testUserId,
        name: 'Announcement 1',
        category: 'announcement',
        content: '{{var1}}',
        variables: [{ name: 'var1', description: 'Var 1', required: true }],
      });

      const template2 = await service.createTemplate({
        userId: testUserId,
        name: 'Announcement 2',
        category: 'announcement',
        content: '{{var1}}',
        variables: [{ name: 'var1', description: 'Var 1', required: true }],
      });
      await template2.increment('usageCount', { by: 10 });

      const template3 = await service.createTemplate({
        userId: testUserId,
        name: 'Tutorial 1',
        category: 'tutorial',
        content: '{{var1}}',
        variables: [{ name: 'var1', description: 'Var 1', required: true }],
      });
      await template3.increment('usageCount', { by: 5 });

      await service.createTemplate({
        userId: testUserId,
        name: 'Tip 1',
        category: 'tip',
        content: '{{var1}}',
        variables: [{ name: 'var1', description: 'Var 1', required: true }],
      });
    });

    it('should return total count', async () => {
      const stats = await service.getStatistics(testUserId);
      expect(stats.total).toBe(4);
    });

    it('should return count by category', async () => {
      const stats = await service.getStatistics(testUserId);

      expect(stats.byCategory.announcement).toBe(2);
      expect(stats.byCategory.tutorial).toBe(1);
      expect(stats.byCategory.tip).toBe(1);
    });

    it('should return most used templates', async () => {
      const stats = await service.getStatistics(testUserId);

      expect(stats.mostUsed).toHaveLength(4);
      expect(stats.mostUsed[0]!.name).toBe('Announcement 2'); // usageCount: 10
      expect(stats.mostUsed[1]!.name).toBe('Tutorial 1'); // usageCount: 5
    });

    it('should return recently created templates', async () => {
      const stats = await service.getStatistics(testUserId);

      expect(stats.recentlyCreated).toHaveLength(4);
      // Should be ordered by createdAt DESC
      const names = stats.recentlyCreated.map(t => t.name);
      expect(names).toContain('Tip 1');
      expect(names).toContain('Announcement 1');
    });

    it('should limit most used and recently created to 5', async () => {
      // Create 6 more templates
      for (let i = 0; i < 6; i++) {
        await service.createTemplate({
          userId: testUserId,
          name: `Extra Template ${i}`,
          category: 'tip',
          content: '{{var1}}',
          variables: [{ name: 'var1', description: 'Var 1', required: true }],
        });
      }

      const stats = await service.getStatistics(testUserId);

      expect(stats.mostUsed).toHaveLength(5);
      expect(stats.recentlyCreated).toHaveLength(5);
    });

    it('should only return stats for user own templates', async () => {
      // Create template for another user
      const otherUser = await User.create({
        email: 'other@example.com',
        passwordHash: 'hashedpassword456',
      });

      await Template.create({
        userId: otherUser.id,
        name: 'Other User Template',
        category: 'announcement',
        content: '{{var1}}',
        variables: [{ name: 'var1', description: 'Var 1', required: true }],
        isSystem: false,
        isPublic: false,
        usageCount: 0,
      });

      const stats = await service.getStatistics(testUserId);

      expect(stats.total).toBe(4); // Should not include other user's template
    });
  });
});
