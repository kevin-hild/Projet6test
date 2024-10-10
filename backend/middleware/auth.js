const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        
        // Using secret keys from environment variables
        const secret = process.env.JWT_SECRET || 'defaultSecretKey';
        const decodedToken = jwt.verify(token, secret);
        
        const userId = decodedToken.userId;
        
        // Add the userId to the request to use it in the following routes
        req.auth = { userId };
        
        next();
    } catch (error) {
        res.status(401).json({ message: 'Requête non authentifiée', error });
    }
};
