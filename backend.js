const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes, where } = require('sequelize');
const crypto = require('crypto');
require('dotenv').config()

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
app.get('/api/getUser', getUser);
app.post('/api/becomeVIP', becomeVIP);
app.post('/api/changeUser', changeUser);
app.post('/api/changePasswd', changePasswd);
app.post('/api/submitOrder', submitOrder);
app.get('/api/getOrders', getOrders);
app.get('/api/menu', getMenu);
app.post('/api/confirm', confirmOrder);
app.post('/queryDB', handleQuery);

// 自动连接数据库
let sequelize;
const dbAutoConnection = async () => {
  sequelize = new Sequelize('orders', "root", process.env.passwd, {
    dialect: 'mysql',
    host: "49.233.41.142",
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
  },
  isVIP: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  isAdmin: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'customer',
  timestamps: false
});
let Admin;
const Menu = sequelize.define('menu', {
  dishes: {
    type: Sequelize.STRING(255),
    allowNull: false,
    primaryKey: true,
    comment: 'Primary Key'
  },
  price: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  VIPprice: {
    type: Sequelize.INTEGER,
    allowNull: true
  },
  onSale: {
    type: Sequelize.BOOLEAN,
    allowNull: false
  }
}, {
  tableName: 'menu',
  timestamps: false,
  charset: 'latin1',
  collate: 'latin1_general_ci'
});

const Orders = sequelize.define('Orders', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  create_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  customerId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  米饭: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  馒头: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  烧茄子: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  土豆丝: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  麻婆豆腐: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  sumPrice: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'orders',
  timestamps: false // 如果不需要自动生成时间戳字段，可以设置为 false
});

const Rider = sequelize.define('Rider', {
  id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    collate: 'utf8mb4_unicode_ci'
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  delivered: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  }
}, {
  tableName: 'rider',
  timestamps: false
});
// 定义外键
Customer.hasMany(Orders);
Orders.belongsTo(Customer, { foreignKey: 'customerId'});
Orders.hasOne(Rider);
Rider.belongsTo(Orders, {foreignKey: 'orderId'});
Customer.findAll({include: Orders})
// console.log(Orders.findAll({include: Rider}));

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
    res.send('error');
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

// 获取用户数据
async function getUser(req, res) {
  console.log(req.query);
  try {
    let user = await Customer.findAll({
      where: {
        id: req.query['id']
      }
  });
  res.send({message: "success", userInfo: user});
  }
  catch (e) {
    console.log(e);
    res.send({message: "error"});
  }
}

// 开通会员
async function becomeVIP(req, res) {
  console.log(req.body);
  try {
    await Customer.update({
      isVIP: 1,
    },{
        where: {
          id: req.body['userId']
        }
    });
    res.send("success");
  }
  catch (e) {
    console.log(e);
    res.send('error');
  }
}

// 更改用户数据
async function changeUser(req, res) {
  let postChangeData = req.body;
  console.log(postChangeData);
  try {
    let updateData = await Customer.update({ 
      phone_number: postChangeData['phoneNumber'],
      nickname: postChangeData['nickname'],
      address: postChangeData['address']
    }, // 需要修改的字段
      { where: { id: Number.parseInt(postChangeData['id']) } } // 查找条件
    );
    console.log('Sql data:', updateData);
    let user = await Customer.findAll({
      where: {
        id: postChangeData['id']
        }
    });
    res.send({message: 'success', user: user});
  }
  catch (e) {
    console.log(e);
    res.send({message: "failed"});
  }
}

// 修改密码
async function changePasswd(req, res) {
  let postChangeData = req.body;
  console.log(postChangeData);
  let olduser = await Customer.findAll({
    where: {
      id: Number.parseInt(postChangeData['id'])
      }
  })
  console.log("old user:", olduser[0]['passwd']);
  if (olduser[0]['passwd'].toString('hex') != crypto.createHash('md5').update(postChangeData['oldpasswd']).digest('hex')) {
    res.send({
      message: "error",
      data: "原密码输入错误！"
    })
  }
  else {
    try {
      let changePasswdData = await Customer.update({
        passwd: postChangeData['passwd']
      },
      {
        where: {
          id: Number.parseInt(postChangeData['id'])
        }
      });
      console.log(changePasswdData);
      res.send({message: "success"});
    }
    catch (e) {
      console.log(e);
      res.send({message: "error", data: "修改失败！"});
    }
  }
  // res.send({message: "success"});
}

// 获取订单
async function getOrders(req, res) {
  console.log(req.query);
  // 全部订单
  let allOrders = await Orders.findAll({
  attributes: ['id', '米饭', '馒头', '烧茄子', '土豆丝', '麻婆豆腐', 'create_time', 'endTime'],
  include: [
    {
      model: Rider,
      attributes: ['delivered'],
      require: true
    },
    {
      model: Customer,
      attributes: ['address', 'phone_number'],
      where: {
        id: req.query['id']
      }
    }
  ],
  where: {
    customerId: req.query['id']
  }
});
// // 未完成订单
// let unfilledOrders = await Orders.findAll({
//   attributes: ['id', '米饭', '馒头', '烧茄子', '土豆丝', '麻婆豆腐', 'create_time', 'endTime'],
//   include: [
//     {
//       model: Rider,
//       attributes: ['delivered'],
//       require: true,
//       where: {
//         delivered: false
//       }
//     },
//     {
//       model: Customer,
//       attributes: ['address', 'phone_number'],
//       where: {
//         id: req.query['id']
//       }
//     }
//   ],
//   where: {
//     customerId: req.query['id']
//   }
// });
// // 已完成订单
// let filledOrders = await Orders.findAll({
//   attributes: ['id', '米饭', '馒头', '烧茄子', '土豆丝', '麻婆豆腐', 'create_time', 'endTime'],
//   include: [
//     {
//       model: Rider,
//       attributes: ['delivered'],
//       require: true,
//       where: {
//         delivered: true
//       }
//     },
//     {
//       model: Customer,
//       attributes: ['address', 'phone_number'],
//       where: {
//         id: req.query['id']
//       }
//     }
//   ],
//   where: {
//     customerId: req.query['id']
//   }
// });
  res.send({
    orders: allOrders});
}

// 获取菜单
async function getMenu(req, res) {
  console.log(req.body);
  let _menu = await Menu.findAll({});
  res.send(_menu);
}

// 提交订单
async function submitOrder(req, res) {
  subData = req.body;
  console.log(subData);
  try {
    let addOrder = await Orders.create({
      customerId: subData['userId'],
      create_time: subData['dataTime'],
      sumPrice: subData['sum'],
      烧茄子: subData['detail']['烧茄子'] ? subData['detail']['烧茄子'] : 0,
      米饭: subData['detail']['米饭'] ? subData['detail']['米饭'] : 0,
      馒头: subData['detail']['馒头'] ? subData['detail']['馒头'] : 0,
      麻婆豆腐: subData['detail']['麻婆豆腐'] ? subData['detail']['麻婆豆腐'] : 0,
      土豆丝: subData['detail']['土豆丝'] ? subData['detail']['土豆丝'] : 0
    })
    res.send({message: "success"});
  }
  catch (e) {
    console.log(e);
    res.send({
      message: "error",
      data: e
    })
  }
}

// 确认订单
async function confirmOrder(req, res) {
  console.log(req.body);
  try {
    await Rider.update({
      delivered: true,
    },{
      where: {
        orderId: req.body['orderId']
      }
    });
    await Orders.update({
      endTime: req.body['dataTime'],
    },{
      where: {
        id: req.body['orderId']
      }
    });
  res.send({message: 'success'});
  }
  catch (e) {
    console.log(e);
    res.send({message: 'error'});
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