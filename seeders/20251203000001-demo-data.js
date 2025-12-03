'use strict';

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, _Sequelize) {
    // Generate UUIDs for referential integrity
    const userId = uuidv4();
    const profileFreelanceId = uuidv4();
    const profileCreatorId = uuidv4();
    const projectEdukaiId = uuidv4();
    const projectTrilogieId = uuidv4();
    const platformLinkedInId = uuidv4();
    const platformTwitterId = uuidv4();
    const platformTikTokId = uuidv4();

    // =====================================
    // 1. Create demo User
    // =====================================
    await queryInterface.bulkInsert('users', [
      {
        id: userId,
        email: 'tristan@brandium.local',
        passwordHash: await bcrypt.hash('password123', 10),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // =====================================
    // 2. Create Profiles
    // =====================================
    await queryInterface.bulkInsert('profiles', [
      {
        id: profileFreelanceId,
        userId: userId,
        name: 'Tristan - Freelance Front-End',
        bio: 'Développeur web passionné par React et Next.js. Je partage mes découvertes et retours d\'expérience sur le développement moderne.',
        toneTags: JSON.stringify(['professionnel', 'accessible', 'expert', 'passionné']),
        doRules: JSON.stringify([
          'Utiliser des émojis avec parcimonie',
          'Rester concis et clair',
          'Partager des retours d\'expérience concrets',
          'Inclure des exemples de code quand pertinent',
        ]),
        dontRules: JSON.stringify([
          'Éviter le jargon technique trop complexe',
          'Pas de majuscules excessives',
          'Ne pas être condescendant',
        ]),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: profileCreatorId,
        userId: userId,
        name: 'Tristan - Content Creator',
        bio: 'Créateur de contenu tech et entrepreneuriat. Je vulgarise les concepts complexes pour les rendre accessibles à tous.',
        toneTags: JSON.stringify(['décontracté', 'inspirant', 'éducatif', 'authentique']),
        doRules: JSON.stringify([
          'Utiliser un ton conversationnel',
          'Poser des questions pour engager',
          'Partager des anecdotes personnelles',
          'Terminer par un call-to-action',
        ]),
        dontRules: JSON.stringify([
          'Éviter le ton trop corporate',
          'Ne pas être trop promotionnel',
          'Pas de clickbait',
        ]),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // =====================================
    // 3. Create Projects
    // =====================================
    await queryInterface.bulkInsert('projects', [
      {
        id: projectEdukaiId,
        userId: userId,
        name: 'Edukai - Plateforme éducative',
        description: 'Plateforme SaaS pour l\'apprentissage adaptatif utilisant l\'IA. Edukai personnalise les parcours pédagogiques en fonction du niveau et des objectifs de chaque apprenant.',
        audience: 'Éducateurs, formateurs, responsables pédagogiques, apprenants adultes en reconversion',
        keyMessages: JSON.stringify([
          'Innovation pédagogique grâce à l\'IA',
          'Personnalisation des parcours d\'apprentissage',
          'Accessibilité pour tous',
          'Résultats mesurables',
        ]),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: projectTrilogieId,
        userId: userId,
        name: 'Trilogie Studio',
        description: 'Studio de développement web spécialisé dans les applications React/Next.js performantes et accessibles.',
        audience: 'Startups, PME tech, entrepreneurs, CTOs',
        keyMessages: JSON.stringify([
          'Expertise React et Next.js',
          'Performance et accessibilité',
          'Accompagnement de A à Z',
          'Code maintenable et scalable',
        ]),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // =====================================
    // 4. Create Platforms
    // =====================================
    await queryInterface.bulkInsert('platforms', [
      {
        id: platformLinkedInId,
        userId: userId,
        name: 'LinkedIn',
        styleGuidelines: 'Ton professionnel mais accessible. Valoriser l\'expertise technique. Utiliser des listes à puces pour la lisibilité. Inclure des hashtags pertinents (3-5 max). Commencer par un hook accrocheur.',
        maxLength: 3000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: platformTwitterId,
        userId: userId,
        name: 'X (Twitter)',
        styleGuidelines: 'Format court et percutant. Une idée par tweet. Utiliser des threads pour les sujets complexes. Hashtags limités (1-2). Ton direct et engageant.',
        maxLength: 280,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: platformTikTokId,
        userId: userId,
        name: 'TikTok',
        styleGuidelines: 'Script pour vidéo courte. Hook dans les 3 premières secondes. Ton dynamique et accessible. Vulgarisation maximale. Call-to-action à la fin.',
        maxLength: 2200,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    // =====================================
    // 5. Create sample Posts
    // =====================================
    await queryInterface.bulkInsert('posts', [
      {
        id: uuidv4(),
        userId: userId,
        profileId: profileFreelanceId,
        projectId: projectEdukaiId,
        platformId: platformLinkedInId,
        goal: 'Annoncer le lancement de la feature quiz adaptatifs',
        rawIdea: 'On vient de lancer les quiz adaptatifs sur Edukai. L\'IA ajuste la difficulté en temps réel.',
        generatedText: '🎯 Grande nouvelle pour Edukai !\n\nNous venons de lancer notre fonctionnalité de quiz adaptatifs.\n\nLe principe ? L\'IA analyse vos réponses en temps réel et ajuste automatiquement la difficulté des questions suivantes.\n\nRésultat :\n• Apprentissage optimisé pour chaque apprenant\n• Moins de frustration\n• Progression mesurable\n\nC\'est le fruit de 3 mois de R&D et de nombreux tests avec nos utilisateurs beta.\n\nCurieux d\'en savoir plus ? Le lien est en commentaire 👇\n\n#EdTech #IA #Apprentissage #Innovation',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  },

  async down(queryInterface, _Sequelize) {
    // Delete in reverse order due to foreign key constraints
    await queryInterface.bulkDelete('posts', null, {});
    await queryInterface.bulkDelete('platforms', null, {});
    await queryInterface.bulkDelete('projects', null, {});
    await queryInterface.bulkDelete('profiles', null, {});
    await queryInterface.bulkDelete('users', null, {});
  },
};
