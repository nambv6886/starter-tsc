import * as bcrypt from 'bcryptjs';
import * as  bluebird from 'bluebird';
import * as fs from 'fs';
import * as crypto from 'crypto';

const readAsync = bluebird.promisify(fs.readFile);

export class Utils {
    public static async genSalt(round = 10) {
        return await bcrypt.genSalt(round);
    }

    public static async getHash(rawString, salt) {
        return await bcrypt.hash(rawString, salt);
    }

    public static IsNullorUndefined(value: any) {
        return typeof value == null || value == 'undefined' || value == ''; 
    }

    public static async readFileAsync(filePath): Promise<string> {
        const result = await readAsync(filePath);
        return result.toString('utf-8');
    }

    public static genRandomString(length: number): string {
        return crypto.randomBytes(length).toString('hex');
    }

    public static getArrayDate(start: Date, end: Date): Date[] {
        let arr = [];
        // to avoid modifying the original date
        let date = start;
        while(date < end) {
            arr.push(new Date(date));
            date.setDate(date.getDate() + 1)
        }

        return arr;
    }

    public static normalizeNumber(num:number) {
        return Number(num.toFixed(8));
    };

    public static sha256(str: string) {
        return crypto.createHash('sha256').update(str).digest('hex');
    }

}