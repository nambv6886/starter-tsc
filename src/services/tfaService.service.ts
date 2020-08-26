import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import * as config from 'config';

const tfa = config.get('tfa');

import { Utils } from '../utils/utils';

export class TfaService {
    public static generateSecretKey() {
        return speakeasy.generateSecret({
            length: tfa.secret_key_length,
        })
    }

    public static isValidOTP(secretKey: string, token: string): boolean {
        if(Utils.IsNullorUndefined(secretKey) || Utils.IsNullorUndefined(token)) {
            return false;
        }
        
        const isVerify = speakeasy.totp.verify({
            secret: secretKey,
            encoding: 'base32',
            token
        });

        return isVerify;
    }

    public static async generateDataUrl(url: string): Promise<any> {
        return await new Promise((resolve, reject) => {
            qrcode.toDataURL(url, (err, dataUrl) => {
                if(err) {
                    reject(err);
                }
                resolve(dataUrl);
            })
        })
    }
}