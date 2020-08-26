module.exports = {
    "mysql": {
        "host": "localhost",
        "user": "root",
        "password": "123456",
        "database": "testdb",
        "connectionLimit": 10,
        "timezone": "+00:00"
    },
    "email": {
        "service": 'gmail',
        "user":'nodemailer.example2020@gmail.com',
        "password":'nodemailer@123456',
        "smtp_host":'smtp.gmail.com',
        "smtp_port": 587
    },
    "tfa": {
        "secret_key_length": 20
    },
    "jwt": {
        "secret":'super-secret-key88888',
        "expire_time":'1h',
        "email_expire_time":'1d'
    },
    "basic_info": {
        "url_base":'http://localhost:3000',
        "project_name":'Sample-Project',
        "ws_port":8080
    },
    "forgot_password_wait_time_in_seconds": 180
}