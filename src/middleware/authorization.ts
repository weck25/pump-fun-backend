import { NextFunction, Request, Response } from "express"
import jwt, { JwtPayload } from 'jsonwebtoken'

export const auth = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.header('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;
    if (!token) {
        res.status(400).json({ message: 'Token is required' });
        return;
    }
    try {
        jwt.verify(token, 'secret', (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Failed to authenticate token' });
            }

            req.user = decoded;
            next();
        });

    } catch (error) {
        res.status(401).json({ msg: "Token is not valid" });
    }

}

export const adminAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.header('Authorization');
    const token = authHeader ? authHeader.replace('Bearer ', '') : null;
    if (!token) {
        res.status(400).json({ message: 'Token is required' });
        return;
    }
    try {
        jwt.verify(token, 'secret', (err, decoded) => {
            if (err || !decoded) {
                return res.status(401).json({ message: 'Invalid token' });
            }
        
            const payload = decoded as CustomJwtPayload;
        
            if (!payload.isAdmin) {
                return res.status(401).json({ message: 'You don\'t have the permission' });
            }
        

            req.user = decoded;
            console.log(decoded)
            next();
        });

    } catch (error) {
        res.status(401).json({ msg: "Token is not valid" });
    }

}

export interface AuthRequest extends Request {
    user?: any;
}

interface CustomJwtPayload extends JwtPayload {
    isAdmin: boolean;
}
