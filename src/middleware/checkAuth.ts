import { Response, NextFunction, Request } from "express";
import * as jwt from 'jsonwebtoken';
import * as config from 'config';

const jwtConfig = config.get('jwt')

export const checkAuth = (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken: any = jwt.verify(token, jwtConfig.secret);
        req.currentUser = {
            email: decodedToken.email,
            userId: decodedToken.userId
        };
        next();
    } catch (error) {
        res.status(401).json({
            message: 'UnAuthorization'
        })
    }
}