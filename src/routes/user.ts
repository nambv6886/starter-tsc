import * as express from "express";
import { UserController } from "../controller/user.controller";
import { body, check, query } from "express-validator";
import { validateErrorHandler } from "../middleware/validateErrorhandler";
import { checkAuth } from "../middleware/checkAuth";
import { serverError } from "../middleware/error_handlers";

const Router = express.Router();

Router.get("/", checkAuth, UserController.getAll);

Router.post(
    "/register",
    [
        body("email").isEmail(),
        body("email").notEmpty(),
        body("password").isString(),
        body("password").isLength({ min: 6, max: 50 }),
    ],
    validateErrorHandler,
    (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        try {
            UserController.create(req, res, next);
        } catch (error) {
            serverError(error, res, next);
        }
    }
);

Router.post(
    "/login",
    [
        body("email").notEmpty(),
        body("email").isString(),
        body("password").notEmpty(),
        body("password").isString(),
    ],
    validateErrorHandler,
    (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        try {
            UserController.login;
        } catch (error) {
            serverError(error, res, next);
        }
    }
);

Router.get(
    "/register/activeEmail",
    query("token").isString(),
    validateErrorHandler,
    checkAuth,
    UserController.verifyEmail
);

Router.post(
    "/forgotPassword",
    body("email").isEmail(),
    body("email").notEmpty(),
    validateErrorHandler,
    checkAuth,
    (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        try {
            UserController.forgotPassword;
        } catch (error) {
            serverError(error, res, next);
        }
    }
);

Router.post(
    "/resetPassword",
    query("token").isString(),
    query("token").notEmpty(),
    body("password").isString(),
    body("password").notEmpty(),
    body("confirmPassword").notEmpty(),
    validateErrorHandler,
    checkAuth,
    (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        try {
            UserController.resetPassword;
        } catch (error) {
            serverError(error, res, next);
        }
    }
);

Router.get(
    "/statistic/newUser30days",
    validateErrorHandler,
    checkAuth,
    (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        try {
            UserController.statisticNewUser30days;
        } catch (error) {
            serverError(error, res, next);
        }
    }
);
Router.get(
    "/statistic/newUser12months",
    validateErrorHandler,
    checkAuth,
    (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        try {
            UserController.statisticNewUser12Months;
        } catch (error) {
            serverError(error, res, next);
        }
    }
);

Router.post(
    "/setupTFA",
    body("password").isString(),
    body("password").notEmpty(),
    validateErrorHandler,
    checkAuth,
    (
        req: express.Request,
        res: express.Response,
        next: express.NextFunction
    ) => {
        try {
            UserController.setupTFA;
        } catch (error) {
            serverError(error, res, next);
        }
    }
);

module.exports = Router;
