import { Request, Response, request, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import * as config from 'config';

import * as User from "../repository/user";
import { Utils } from "../utils/utils";
import redisClient from "../utils/redisClient";
import { validateErrorHandler } from "../middleware/validateErrorhandler";
import { EmailService } from "../services/email.service";
import { json } from "body-parser";
import { Decipher } from "crypto";
import logger from "../utils/logger";
import { socket } from '../services/socket.service';
import { TfaService } from "../services/TfaService.service";
import { RowDataPacket } from "mysql2";

const jwtConfig = config.get('jwt');
const basicConfig = config.get('basic_info');
const forgot_password_wait_time_in_seconds = config.get('forgot_password_wait_time_in_seconds')

export const Constants = {
    RedisContants: {
        ForgotPassword: 'ForgotPassword'
    }
}

export class UserController {
  public static async getAll(req: Request, res: Response) {
    const { limit, offset, orderBy, reverse, searchString } = req.query;
    const data = {
      limit,
      offset,
      orderBy,
      reverse,
      searchString,
    };

    // const dataOnRedis = await redisClient.get('getAll');
    // if(dataOnRedis) {
    //     return res.json({
    //         dataOnRedis
    //     })
    // }

    const result = await User.getAll(data);
    // redisClient.set('getAll', JSON.stringify(result));

    return res.json({
      result,
    });
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password, firstname, lastname } = req.body;
      const data = {
        email,
        password,
        lastname,
        firstname,
      };
      const userFound = await User.getByEmail(data.email);
      if (userFound) {
        return res.json({
          message: "email already exist",
        });
      }

      const salt = await Utils.genSalt();
      const passwordHash = await Utils.getHash(data.password, salt);

      const active_code = Utils.genRandomString(30);

      // role 1 = normal user
      // role 2 = admin
      // is_email_confirm: 1 not confirm
      const newUser = {
        email: data.email,
        password: passwordHash,
        salt,
        role: 1,
        firstname: data.firstname,
        lastname: data.lastname,
        is_email_confirm: 1,
        active_code,
      };

      const idCreated = await User.create(newUser);
      if (!idCreated) {
        return res.json({
          message: "common error",
        });
      }

      // send email
      const activetionPayload = {
        userId: idCreated,
        email: email,
        activeCode: active_code,
        created: Date.now(),
      };

      const token = await jwt.sign(activetionPayload, jwtConfig.secret, {
        expiresIn: jwtConfig.email_expire_time,
      });
      const verifyLink =
      basicConfig.url_base + "/register/active_email?token=" + token;
      const mailSubject = basicConfig.project_name + " - Confirm Email";
      const content = await EmailService.getMailContent(
        "../templates/verification.email.html",
        verifyLink
      );
      await EmailService.sendMail(email, mailSubject, content);

      return res.json({
        idCreated,
        verifyEmailtoken: token,
      });
    } catch (e) {
      logger.error("[UserController][Create]: ", JSON.stringify(e));
      return res.json({
        message: "common error",
      });
    }
  }

  public static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const userFound = await User.getByEmail(email);
      if (!userFound) {
        return res.json({
          message: "email not exist",
        });
      }

      const passwordHash = await Utils.getHash(password, userFound.salt);
      if (passwordHash !== userFound.password) {
        return res.json({
          message: "password is not correct",
        });
      }

      if(userFound.tfa_enable) {
        const { token } = req.body;
        if(Utils.IsNullorUndefined(token)) {
          return res.json({
            message: 'token is require'
          })
        }
        const isValidate = TfaService.isValidOTP(userFound.tfa_secret, token);
        if(!isValidate) {
          logger.info(`[UserLogin][TOTP]: ${email} topt is invalid`)
          return res.json({
            message: 'TOTP is invalid'
          })
        }
      }

      const jwtPayload = {
        userId: userFound.id,
        email: userFound.email,
      };

      const token = await jwt.sign(jwtPayload, jwtConfig.secret, {
        expiresIn: jwtConfig.expire_time,
      });

      const data = {
        user: userFound,
        type: 'login'
      }

      socket.send(JSON.stringify(data));

      return res.json({
        token,
        expiresAt: Date.now() + 60 * 60 * 1000,
      });
    } catch (error) {
      logger.error(`[UserController][Login]: ${JSON.stringify(error)}`);
      return res.json({
        message: "Common error",
      });
    }
  }

  public static async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.query;
      if (Utils.IsNullorUndefined(token)) {
        return res.json({
          message: "Token is invalid",
        });
      }
      const decoded: any = jwt.verify(<string>token, jwtConfig.secret);
      const userFound: any = await User.findById(decoded.userId);
      if (!userFound) {
        return res.json({
          message: "Token is invalid",
        });
      }
      if (decoded.activeCode !== userFound.active_code) {
        return res.json({
          message: "Token is invalid",
        });
      }
      const confirm = 2;
      const update = await User.updateEmailConfirm(userFound.id, confirm);
      res.json({
        message: "confirm success",
      });
    } catch (error) {
      logger.error("[UserController][verifyEmail]: ", JSON.stringify(error));
      return res.json({
        message: "Common error",
      });
    }
  }

  public static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const userFound = await User.getByEmail(email);

      if (!userFound) {
        return res.json({
          message: "email not found",
        });
      }

      if (userFound.is_email_confirm == 1) {
        return res.json({
          message: "email is not confirm",
        });
      }

      const keyCache = email;
      const result = await redisClient.hgetAsync(
        Constants.RedisContants.ForgotPassword,
        keyCache
      );
      let isWaiting = false;
      let diffTime = 0;

      if (result) {
        diffTime = Date.now() - parseInt(result, 10);
        isWaiting = !!(
          diffTime / 1000 < forgot_password_wait_time_in_seconds
        );
      }

      if (isWaiting) {
        return res.json({
          message: "Account forgot password need to wait",
          data: diffTime,
        });
      }

      await redisClient.hsetAsync(
        Constants.RedisContants.ForgotPassword,
        keyCache,
        Date.now().toString()
      );

      const payload = {
        userId: userFound.id,
        email: userFound.email,
      };
      const token = jwt.sign(payload, jwtConfig.secret, {
        expiresIn: jwtConfig.expire_time,
      });
      const verifyLink = basicConfig.url_base + "/resetPassword?token=" + token;
      const mailSubject = basicConfig.project_name + " - Reset Password";
      const content = await EmailService.getMailContent(
        "../templates/resetpassword.html",
        verifyLink
      );
      await EmailService.sendMail(email, mailSubject, content);

      return res.json({
        message: "success",
        token,
      });
    } catch (error) {
      logger.error("[UserController][ForgotPassword]: ", JSON.stringify(error));
      return res.json({
        message: "common error",
      });
    }
  }

  public static async resetPassword(req: Request, res: Response) {
    try {
      const { token } = req.query;
      const { password, confirmPassword } = req.body;

      if (password !== confirmPassword) {
        return res.json({
          message: "confirm password not match",
        });
      }

      const decoded: any = await jwt.verify(
        token.toString(),
        jwtConfig.secret
      );
      if (!decoded) {
        return res.json({
          message: "Token invalid",
        });
      }

      const userFound = await User.getByEmail(decoded.email);
      if (!userFound) {
        return res.json({
          message: "token invalid, email not found",
        });
      }

      const salt = await Utils.genSalt();
      const passwordHashed = await Utils.getHash(password, salt);
      const update = await User.updatePassword(userFound.id, salt, passwordHashed);
      return res.json({
        message: "success",
      });
    } catch (error) {
      logger.error("[UserController][ResetPassword]: ", JSON.stringify(error));
      return res.json({
        message: "Common error",
      });
    }
  }

  public static async statisticNewUser30days(req: Request, res: Response) {
    const today = UserController.getTodayUTC();
    // time at 30 days before
    const aMonthAgo = today - 30*24*60*60*1000;

    const start = new Date(aMonthAgo);
    const end = new Date(today);
    // get array date 30 days
    const arrayDate = Utils.getArrayDate(start, end);
    const resultInDb = await User.statisticNewUser30days(aMonthAgo/1000);
    let data = [];

    // fill data
    arrayDate.forEach(date => {
      let result = {
        date,
        normal_user: 0,
        admin_user: 0,
        total: 0
      };
      for (let index = 0; index < resultInDb.length; index++) {
        const element = resultInDb[index];
        
        if(date.getDate() == element.date.getDate() && date.getMonth() == element.date.getMonth()) {
          result.normal_user = element.normal_user;
          result.admin_user = element.admin_user;
          result.total = element.total;
          break;
        }
      }
      data.push(result);
    });

    return res.json({
      data
    })

  }

  public static async statisticNewUser12Months(req: Request, res: Response) {
    const todayInUtc = UserController.getTodayUTC();
    const today = new Date(todayInUtc);

    const lastYearUtc = Date.UTC(today.getFullYear() - 1, today.getMonth(), today.getMonth(), today.getUTCDate()) / 1000;
    const data = await User.statisticNewUser12Months(lastYearUtc);
    return res.json({
      data
    })
  }

  private static getTodayUTC() {
    let today = Date.now();
    // get time at stating day
    today = today - today%(24*60*60*1000);
    return today;
  }

  public static async setupTFA(req: Request, res: Response) {
    try {
      const { currentUser } = req;
      const { password } = req.body;
      const userFound = await User.getByEmail(currentUser.email);
      if(!userFound) {
        return res.json({
          message: 'token is invalid'
        });
      }
  
      const passwordHash = await Utils.getHash(password, userFound.salt);
      if (passwordHash !== userFound.password) {
        return res.json({
          message: "password is not correct",
        });
      }

      const secretKey = TfaService.generateSecretKey();
      const tfa_enable = 1;
      const tfa_secret = secretKey.base32;
      await User.updateTfa(userFound.id, tfa_enable, tfa_secret);
  
      const dataUrl = await TfaService.generateDataUrl(secretKey.otpauth_url);
      return res.json({
        message: 'Tfa setup success',
        manualEntryKey: secretKey.base32,
        barcode: dataUrl
      })
    } catch (error) {
      logger.error("[UserController][SetupTFA]: ", JSON.stringify(error));
      return res.json({
        message: "Common error",
      });
    }
  }

}
