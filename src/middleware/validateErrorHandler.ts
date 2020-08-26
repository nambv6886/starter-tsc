import { Response, NextFunction, Request } from "express";
import { validationResult } from "express-validator";

export const validateErrorHandler = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {

        const response = {
            success: false,
            status: 422,
            message: "Failed Validation",
            errors: errors.mapped(),
        };

        return res.status(response.status).json(response);
    }
    next();
}