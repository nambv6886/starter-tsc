import { connection, doQuery } from './mysql';
import { startTimer } from 'winston';
import logger from '../utils/logger';
import { RowDataPacket } from 'mysql2';

export const getAll = async(data: any) => {
    let query = `select * from users`;
    let countQuery = `select count(*) as total from users`;
    let options: string[] = [];
    ['email', 'lastname', 'firstname'].forEach(item => {
        if(data.searchString){
            options.push(`${item} like '%${data.searchString}%'`);
        }
    });

    if(options.length) {
        query += ' where ' + options.join(' or ');
        countQuery += ' where ' + options.join(' or ');
    }

    const [count_result, ignore] = await connection.query(countQuery);
    const result = await doQuery.getList(query, data);

    return {
        ...count_result[0],
        data: result
    }
}


export const getByEmail = async (email: string) => {
    const query = `select * from users where email = '${email.toLocaleLowerCase()}'`;
    const [result, ignore] = await connection.query(query);
    return result ? result[0] : null;
}

export const create = async(data: any) => {
    const query = `insert into users set ?`;
    const [result, ignore] = await connection.query(query, [data]);
    return result ? result[0].insertId : null;
}

export const findById = async(id: number) => {
    const query = `select * from users where id = '${id}'`;
    // const result = await knexConnection.table('users').select().where({ id });
    // console.log('query:', query);
    const [result, ignore] = await connection.query(query);
    return result ? result[0] : null;
    // return query;
}

// export const update = async(id: number, data: any) => {
//     const row: any = {
//         email: data.email,
//         password: data.password,
//         salt: data.salt,
//         role: data.role,
//         is_email_confirm: data.is_email_confirm,
//         active_code: data.active_code,
//         tfa_secret: data.tfa_secret,
//         tfa_enable: data.tfa_enable ? 1 : 0
//     }



//     return result;
// }

export const updateEmailConfirm = (id: number, confirm: number) => {
    const row = {
        is_email_confirm: confirm ? confirm : 1
    }
    return doQuery.updateRow('users', row, id);
}

export const updatePassword = (id: number, salt: string, password: string) => {
    const row = {
        salt,
        password
    };
    return doQuery.updateRow('users', row, id);
}

export const updateTfa = (id: number, status: number, secret: string) => {
    const row = {
        tfa_enable: 1,
        tfa_secret: secret
    }

    return doQuery.updateRow('users', row, id);
}

export const statisticNewUser30days = async(start: number) => {
    const query = `select date, sum(if(role = 1, total,0)) as normal_user,
                    sum(if(role=2, total, 0)) as admin_user, sum(total) as total
                    from (select date(create_time) as date, count(*) as total, role from users 
                    where unix_timestamp(create_time) >= ${start} group by date, role) as statistic group by date`;
    logger.info(`[UserRepo][statisticNewUser30days]query: ${query}`);
    const [result, ignore] = await connection.query(query);
    return result as RowDataPacket[];
}

export const statisticNewUser12Months = async (lastYear: number) => {
    const query = `select y as year, m as month, sum(if(role=1, total, 0)) as normal_user, sum(if(role=2, total, 0)) as admin,
                    sum(total) as total
                    from (SELECT y, m, Count(users.create_time) as total, role
                    FROM (
                    SELECT y, m
                    FROM
                        (SELECT year(DATE_ADD("1970-01-01", interval ${lastYear} second)) y UNION ALL SELECT Year(DATE_ADD("1970-01-01", interval ${lastYear} second))+1) years,
                        (SELECT 1 m UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                        UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8
                        UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12) months) ym
                    LEFT JOIN users
                    ON ym.y = YEAR(users.create_time)
                        AND ym.m = MONTH(users.create_time)
                    WHERE   (y=YEAR(DATE_ADD("1970-01-01", interval ${lastYear} second)) AND m>MONTH(DATE_ADD("1970-01-01", interval ${lastYear} second)))
                    OR
                    (y>YEAR(DATE_ADD("1970-01-01", interval ${lastYear} second)) AND m<=MONTH(DATE_ADD("1970-01-01", interval ${lastYear} second)))
                    GROUP BY y, m, role ) as statistic group by m, y;`;

    logger.info(`[UserRepo][statisticNewUser12Months]query: ${query}`);

    const [result, ignore] = await connection.query(query);
    return result;
}