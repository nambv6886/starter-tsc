import { Response, NextFunction } from "express";
import logger from "../utils/logger";
import { errorType } from "../utils";

export const serverError = (err: Error, res: Response, next: NextFunction) => {
    logger.error(err);
    res.status(500).send({
        result: 'common error',
        error_code: err.stack,
        message: errorType[Number(err.stack)]
    });
}
