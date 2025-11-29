const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/database');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token d\'authentification requis.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        themePreference: true,
        role: true,
        mustChangePassword: true,
        isActive: true,
        canCreateApiTokens: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur non trouvé.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Compte désactivé.' });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authMiddleware;
