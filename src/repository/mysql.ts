// const mysql = require('mysql2/promise');
import * as config from "config";
import * as mysql from "mysql2";
import logger from "../utils/logger";

logger.info("sql pool init");

const sqlConfig = config.get('mysql');

const pool = mysql.createPool({
  host: sqlConfig.host,
  user: sqlConfig.user,
  password: sqlConfig.password,
  database: sqlConfig.database,
  timezone: sqlConfig.timezone,
  connectionLimit: sqlConfig.connectionLimit
});

export const connection = pool.promise();

export const doQuery = {
  getList: async (query: string, options: any) => {
    try {
      const limit = options.limit ? options.limit : 20;
      const offset = options.offset ? options.offset : 0;
      const orderBy: string =
        (options.orderBy
          ? options.orderBy + (options.reverse == "true" ? " desc, " : ", ")
          : "") + "id";

      query += ` order by ${orderBy} limit ${offset}, ${limit}`;
      logger.info("query:", query);

      const [result, ignore] = await connection.query(query);

      return result;
    } catch (error) {
      logger.error(`SQL error ${JSON.stringify(error)}`);
    }
  },
    insertRow: async function (tableName: string, row: any, conn:any = null) {
      if(!conn)
          conn = connection;
      for (let i = 0; i < Object.keys(row).length; i++) {
          if (Array.isArray(Object.values(row)[i])) {
              // @ts-ignore
              row[Object.keys(row)[i]] = Object.values(row)[i].join(',');
          }
      }
      let query = 'INSERT INTO ' + tableName + '(' + Object.keys(row).join(',') + ') VALUES (' + ''.padStart((Object.values(row).length * 2) - 1, '?,') + ')';
      let [result, ignored] = await conn.query(query, Object.values(row));
      return result.insertId;
  },
  updateRow: async function (tableName: string, row: any, id: number, conn:any = null) {
    try {
        if(!conn)
            conn = connection;
        for (let i = 0; i < Object.keys(row).length; i++) {
            if (Array.isArray(Object.values(row)[i])) {
                // @ts-ignore
                row[Object.keys(row)[i]] = Object.values(row)[i].join(',');
            }
        }
        if (tableName === 'operator')
            row['status'] = 'updated';
        let query = 'UPDATE ' + tableName + ' SET ' + Object.entries(row).map(x => x[0] + ' = ?').join(', ') + " WHERE id = " + id;
        let [result, ignored] = await conn.query(query, Object.values(row));

        // @ts-ignore
        return result.affectedRows === 1;
    } catch (error) {
        logger.error(`[Mysql][doQuery]: error ${JSON.stringify(error)}`)
    }
  },
};
