import * as nodemailer from "nodemailer";
import * as config from 'config';
import * as path from "path";
import * as fs from "fs";
import { Utils } from "../utils/utils";
import logger from "../utils/logger";

const emailConfig = config.get('email');

export class EmailService {
  private static getTransport() {
    return nodemailer.createTransport({
      host: emailConfig.smtp_host,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.password,
      }
    });
  }

  public static async getMailContent(templatePath: string, verifyUrl: string) {
    try {
      const filePath = path.join(__dirname, templatePath);
      let content = await Utils.readFileAsync(filePath);
      content = content.replace(/{verifyUrl}/g, verifyUrl);
      return content;
    } catch (error) {
        logger.log('[EmailService][GetContent]:', JSON.stringify(error));
    }
  }

  public static async sendMail(
    receiverEmail: string,
    mailSubject: string,
    content: string
  ) {
    const mailOptions = {
      from: emailConfig.user,
      to: receiverEmail,
      subject: mailSubject,
      html: content,
    };
    try {
      const result = await this.getTransport().sendMail(mailOptions);
      logger.info(`[EmailService][Sendmail]: Message send ${result.messageId}`);
    } catch (error) {
      logger.info('[EmailService][Sendmail]:',JSON.stringify(error));
    }
  }
}
