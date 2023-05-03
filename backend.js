const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

app.post('/api/connectDB', handleConnect);
app.post('/api/signup', signup);
app.post('/api/login', login);
app.post('/queryDB', handleQuery);

// 自动连接数据库
let sequelize;
const dbAutoConnection = async () => {
  sequelize = new Sequelize('orders', "root", "20281128", {
    dialect: 'mysql',
    host: "172.24.65.85",
    port: 3306,
    logging: false,
  });
  
  try {
    await sequelize.authenticate();
    console.log('mysql Connection successful !!! ');
    return Promise.resolve('connected');
    } catch (error) {
    console.error('Unable to connect to the database:', error);
    return Promise.resolve(error);
  }
}
dbAutoConnection();

// 定义表们
const Customer = sequelize.define('Customer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  nickname: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone_number: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  passwd: {
    type: DataTypes.BLOB,
    allowNull: false,
    set: function (value) {
      // 使用 MD5 对密码进行加密，并将加密结果存储在 passwd 字段中
      let hash = crypto.createHash('md5').update(value).digest('hex');
      this.setDataValue('passwd', Buffer.from(hash, 'hex'));
    }
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'customer',
  timestamps: false
});
let Admin;
let Menu;
let Orders;
let Rider;

// 连接数据库
async function handleConnect(req, res) {
  // 处理接口 1 的请求
  let postConnectData = req.body;
  // console.log(req.body);
  let returnValue = await dbConnection(
    postConnectData['url'], 
    postConnectData['port'], 
    postConnectData['userName'], 
    postConnectData['passwd']
  );
  res.send(returnValue);
}

// 注册新用户
async function signup(req, res) {
  let postConnectData = req.body;
  console.log(postConnectData);
  try {
    const addUser = await Customer.create({
      nickname: `User${Math.floor(Math.random() * (10000000)) + 1}`,
      phone_number: Number.parseInt(postConnectData['phoneNumber']),
      passwd: postConnectData['passwd']
    });
    console.log("Add user id", addUser.id);
    res.send('success');
  }
  catch (e) {
    console.log(e);
    res.send(e);
  }
}

// 登录
async function login(req, res) {
  let postConnectData = req.body;
  let user = await Customer.findAll({
    where: {
      phone_number: postConnectData['phoneNumber']
      }
  });
  console.log(user)
  if (JSON.stringify(user) == '[]') {
    res.send({errorMsg: '用户未注册！'});
  }
  else {
    let userPasswd = crypto.createHash('md5').update(postConnectData['passwd']).digest('hex');
    let dbPasswd = user[0]['dataValues']['passwd'].toString('hex');
    if (userPasswd == dbPasswd) {
      res.send({
        errorMsg: 'success',
        user: user
      });
    }
    else {
      res.send({errorMsg: '密码错误！'});
    }
  }
}

// 使用MySQL语言请求数据
async function handleQuery(req, res) {
  // 处理接口 2 的请求
  let postConnectData = req.body;
  console.log(postConnectData);
  try {
    const [results, metadata] = await sequelize.query(postConnectData['queryData']);
    console.log('Result:', results, typeof(results));
    if (typeof(results) == 'number') {  // result of `INSERT` is a number
      res.send(String(results))
    }
    else if (typeof(results) == 'object') {
      res.send(results);
    }
  }
  catch (e) {
    console.log('Error:', e);
    res.send(e);
  }
}

app.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
});

const dbConnection = async (host, port, user, passwd) => {
  sequelize = new Sequelize('orders', user, passwd, {
    dialect: 'mysql',
    host: host,
    port: port,
    logging: false,
  });
  
  try {
    await sequelize.authenticate();
    console.log('mysql Connection successful !!! ');
    return Promise.resolve('connected');
    } catch (error) {
    console.error('Unable to connect to the database:', error);
    return Promise.resolve(error);
  }
}