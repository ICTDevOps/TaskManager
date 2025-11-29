const bcrypt = require('bcrypt');
const { z } = require('zod');
const prisma = require('../config/database');
const { generateToken } = require('../utils/jwt');

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  username: z.string().min(3, 'Username minimum 3 caractères').max(50),
  password: z.string().min(6, 'Mot de passe minimum 6 caractères'),
  firstName: z.string().optional(),
  lastName: z.string().optional()
});

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email ou nom d\'utilisateur requis'),
  password: z.string().min(1, 'Mot de passe requis')
});

const register = async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.email },
          { username: data.username }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        error: existingUser.email === data.email
          ? 'Cet email est déjà utilisé.'
          : 'Ce nom d\'utilisateur est déjà pris.'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash,
        firstName: data.firstName || null,
        lastName: data.lastName || null
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        themePreference: true,
        createdAt: true
      }
    });

    const token = generateToken(user.id);

    res.status(201).json({ user, token });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: data.identifier },
          { username: data.identifier }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(data.password, user.passwordHash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Compte désactivé.' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    const token = generateToken(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        themePreference: user.themePreference,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        defaultContext: user.defaultContext
      },
      token
    });
  } catch (error) {
    next(error);
  }
};

const me = async (req, res) => {
  res.json({ user: req.user });
};

const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, themePreference } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
        ...(themePreference && { themePreference })
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        themePreference: true
      }
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// Schémas de validation pour les nouvelles fonctions
const updateEmailSchema = z.object({
  newEmail: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis pour confirmer')
});

const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(6, 'Nouveau mot de passe minimum 6 caractères')
});

const updateEmail = async (req, res, next) => {
  try {
    const data = updateEmailSchema.parse(req.body);

    // Vérifier le mot de passe actuel
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const validPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Mot de passe incorrect.' });
    }

    // Vérifier que le nouvel email n'est pas déjà utilisé
    const existingUser = await prisma.user.findUnique({
      where: { email: data.newEmail }
    });

    if (existingUser && existingUser.id !== req.user.id) {
      return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
    }

    // Mettre à jour l'email
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { email: data.newEmail },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        themePreference: true
      }
    });

    res.json({ user: updatedUser, message: 'Email mis à jour avec succès.' });
  } catch (error) {
    next(error);
  }
};

const updatePassword = async (req, res, next) => {
  try {
    const data = updatePasswordSchema.parse(req.body);

    // Vérifier le mot de passe actuel
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    const validPassword = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!validPassword) {
      return res.status(400).json({ error: 'Mot de passe actuel incorrect.' });
    }

    // Hasher et mettre à jour le nouveau mot de passe
    const passwordHash = await bcrypt.hash(data.newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        passwordHash,
        mustChangePassword: false
      }
    });

    res.json({ message: 'Mot de passe mis à jour avec succès.', mustChangePassword: false });
  } catch (error) {
    next(error);
  }
};

const updateDefaultContext = async (req, res, next) => {
  try {
    const { defaultContext } = req.body;
    const userId = req.user.id;

    // Valider que le contexte est soit "self", soit un UUID d'un owner délégué valide
    if (defaultContext !== 'self') {
      // Vérifier que l'utilisateur a une délégation acceptée pour ce owner
      const delegation = await prisma.taskDelegation.findFirst({
        where: {
          ownerId: defaultContext,
          delegateId: userId,
          status: 'accepted'
        }
      });

      if (!delegation) {
        return res.status(400).json({ error: 'Contexte invalide ou délégation non acceptée.' });
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { defaultContext },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        themePreference: true,
        defaultContext: true
      }
    });

    res.json({ user, message: 'Contexte par défaut mis à jour.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, me, updateProfile, updateEmail, updatePassword, updateDefaultContext };
